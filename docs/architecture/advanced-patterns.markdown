---
layout: page
title: Advanced Patterns
permalink: /architecture/advanced-patterns/
---

# Advanced Patterns

## CQRS and Event Sourcing Implementation

### Command and Query Separation

```typescript
// Command Side - Write Operations
export interface CreateProjectCommand {
  readonly name: string;
  readonly description?: string;
  readonly initialRows?: CreateRowCommand[];
}

export interface UpdateProjectPositionCommand {
  readonly projectId: number;
  readonly position: Position;
  readonly timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ProjectCommandService {
  constructor(
    private eventStore: EventStore,
    private validator: CommandValidator,
    private eventBus: DomainEventBus
  ) {}

  async createProject(command: CreateProjectCommand): Promise<Result<ProjectId, ValidationError[]>> {
    // Validate command
    const validation = await this.validator.validateCreateProject(command);
    if (validation.isFailure) {
      return Result.failure(validation.errors);
    }

    // Generate unique ID
    const projectId = ProjectId.generate();
    
    // Create domain events
    const events = [
      new ProjectCreatedEvent(projectId, command.name, command.description),
      ...command.initialRows?.map(row => 
        new RowAddedEvent(projectId, row.id, row.steps)
      ) ?? []
    ];

    // Persist events
    await this.eventStore.saveEvents(projectId.value, events);
    
    // Publish events
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return Result.success(projectId);
  }

  async updatePosition(command: UpdateProjectPositionCommand): Promise<Result<void, DomainError>> {
    try {
      // Load aggregate from events
      const aggregate = await this.loadProjectAggregate(command.projectId);
      
      // Execute domain logic
      const result = aggregate.updatePosition(command.position);
      if (result.isFailure) {
        return result;
      }

      // Persist new events
      const newEvents = aggregate.getUncommittedEvents();
      await this.eventStore.saveEvents(command.projectId, newEvents);
      
      // Publish events
      for (const event of newEvents) {
        await this.eventBus.publish(event);
      }

      return Result.success();
    } catch (error) {
      return Result.failure(new DomainError('Failed to update position', error));
    }
  }
}

// Query Side - Read Operations
@Injectable({ providedIn: 'root' })
export class ProjectQueryService {
  constructor(
    private readModel: ProjectReadModelService,
    private cache: QueryCache
  ) {}

  getProjectById(id: number): Observable<Project | null> {
    const cacheKey = `project-${id}`;
    
    return this.cache.get(cacheKey).pipe(
      switchMap(cached => {
        if (cached) {
          return of(cached);
        }
        
        return this.readModel.selectById(id).pipe(
          tap(project => {
            if (project) {
              this.cache.set(cacheKey, project, { ttl: 300000 }); // 5 minutes
            }
          })
        );
      })
    );
  }

  getProjectsByUser(userId: string): Observable<ProjectSummary[]> {
    return this.readModel.selectByUser(userId).pipe(
      map(projects => projects.map(p => this.toSummary(p))),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getProjectStatistics(id: number): Observable<ProjectStatistics> {
    return this.readModel.selectStatistics(id);
  }
}
```

### Event Sourcing Implementation

```typescript
// Domain Events
export abstract class DomainEvent {
  abstract readonly type: string;
  readonly timestamp = new Date();
  readonly version = 1;
}

export class ProjectCreatedEvent extends DomainEvent {
  readonly type = 'PROJECT_CREATED';
  
  constructor(
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly description?: string
  ) {
    super();
  }
}

export class StepAdvancedEvent extends DomainEvent {
  readonly type = 'STEP_ADVANCED';
  
  constructor(
    public readonly projectId: ProjectId,
    public readonly fromPosition: Position,
    public readonly toPosition: Position,
    public readonly advancedBy: string // user ID
  ) {
    super();
  }
}

// Event Store
@Injectable({ providedIn: 'root' })
export class EventStore {
  constructor(
    private db: ProjectDbService,
    private serializer: EventSerializer
  ) {}

  async saveEvents(aggregateId: string, events: DomainEvent[]): Promise<void> {
    const eventData = events.map(event => ({
      aggregateId,
      eventType: event.type,
      eventData: this.serializer.serialize(event),
      timestamp: event.timestamp,
      version: event.version
    }));

    await this.db.saveEvents(eventData);
  }

  async getEvents(aggregateId: string, fromVersion = 0): Promise<DomainEvent[]> {
    const eventData = await this.db.getEvents(aggregateId, fromVersion);
    
    return eventData.map(data => 
      this.serializer.deserialize(data.eventType, data.eventData)
    );
  }
}

// Project Aggregate
export class ProjectAggregate {
  private uncommittedEvents: DomainEvent[] = [];
  
  constructor(
    public readonly id: ProjectId,
    private state: ProjectState = new ProjectState()
  ) {}

  static fromEvents(id: ProjectId, events: DomainEvent[]): ProjectAggregate {
    const aggregate = new ProjectAggregate(id);
    
    for (const event of events) {
      aggregate.apply(event);
    }
    
    return aggregate;
  }

  updatePosition(newPosition: Position): Result<void, DomainError> {
    // Domain validation
    if (!this.state.isValidPosition(newPosition)) {
      return Result.failure(new DomainError('Invalid position'));
    }

    // Create and apply event
    const event = new StepAdvancedEvent(
      this.id,
      this.state.currentPosition,
      newPosition,
      'current-user' // TODO: Get from context
    );

    this.applyAndRecord(event);
    return Result.success();
  }

  private apply(event: DomainEvent): void {
    switch (event.type) {
      case 'PROJECT_CREATED':
        this.state = new ProjectState((event as ProjectCreatedEvent).name);
        break;
      case 'STEP_ADVANCED':
        const advanceEvent = event as StepAdvancedEvent;
        this.state = this.state.withPosition(advanceEvent.toPosition);
        break;
    }
  }

  private applyAndRecord(event: DomainEvent): void {
    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }
}
```

## Advanced State Management with RxJS

### Reactive State Store

```typescript
// State Interfaces
export interface AppState {
  readonly projects: ProjectsState;
  readonly ui: UIState;
  readonly settings: SettingsState;
  readonly navigation: NavigationState;
}

export interface ProjectsState {
  readonly entities: { [id: number]: Project };
  readonly currentProjectId: number | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly lastUpdated: Date | null;
}

// State Store Implementation
@Injectable({ providedIn: 'root' })
export class ReactiveStateStore {
  private readonly _state$ = new BehaviorSubject<AppState>(this.getInitialState());
  private readonly _actions$ = new Subject<Action>();

  readonly state$ = this._state$.asObservable();

  constructor(
    private reducer: RootReducer,
    private effects: EffectsService,
    private persistence: StatePersistenceService
  ) {
    this.setupReducers();
    this.setupEffects();
    this.setupPersistence();
  }

  // Selectors
  select<T>(selector: (state: AppState) => T): Observable<T> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  selectSlice<T extends keyof AppState>(slice: T): Observable<AppState[T]> {
    return this.select(state => state[slice]);
  }

  // Actions
  dispatch(action: Action): void {
    this._actions$.next(action);
  }

  // Advanced selectors with memoization
  selectProjectWithStatistics = createSelector(
    (state: AppState) => state.projects.entities,
    (state: AppState) => state.projects.currentProjectId,
    (entities, currentId) => {
      if (!currentId || !entities[currentId]) {
        return null;
      }

      const project = entities[currentId];
      return {
        ...project,
        statistics: this.calculateProjectStatistics(project)
      };
    }
  );

  private setupReducers(): void {
    this._actions$.pipe(
      withLatestFrom(this._state$),
      map(([action, currentState]) => {
        const newState = this.reducer.reduce(currentState, action);
        
        // State validation
        if (!this.isValidState(newState)) {
          console.error('Invalid state produced by reducer', { action, newState });
          return currentState;
        }
        
        return newState;
      }),
      tap(newState => this._state$.next(newState)),
      // Log state changes in development
      tap(newState => {
        if (!environment.production) {
          console.log('State updated:', newState);
        }
      })
    ).subscribe();
  }

  private setupEffects(): void {
    this.effects.init(this._actions$, this.state$);
  }
}

// Selector Factory with Memoization
export function createSelector<State, Result>(
  ...args: any[]
): (state$: Observable<State>) => Observable<Result> {
  const selectors = args.slice(0, -1);
  const projector = args[args.length - 1];
  const memoizedProjector = memoizeOne(projector);

  return (state$: Observable<State>) => {
    return state$.pipe(
      map(state => {
        const values = selectors.map(selector => selector(state));
        return memoizedProjector(...values);
      }),
      distinctUntilChanged()
    );
  };
}
```

### Advanced Effects System

```typescript
@Injectable({ providedIn: 'root' })
export class ProjectEffects {
  constructor(
    private projectService: ProjectService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  // Load project with error handling and retry
  loadProject$ = createEffect((actions$, state$) =>
    actions$.pipe(
      ofType(ProjectActions.loadProject),
      debounceTime(300), // Debounce rapid requests
      switchMap(action =>
        this.projectService.loadProject(action.id).pipe(
          map(project => ProjectActions.loadProjectSuccess({ project })),
          catchError(error => {
            this.notificationService.showError('Failed to load project');
            return of(ProjectActions.loadProjectFailure({ error: error.message }));
          }),
          retry({
            count: 3,
            delay: (error, retryIndex) => timer(Math.pow(2, retryIndex) * 1000) // Exponential backoff
          })
        )
      )
    )
  );

  // Save project with optimistic updates
  saveProject$ = createEffect((actions$, state$) =>
    actions$.pipe(
      ofType(ProjectActions.saveProject),
      concatMap(action =>
        this.projectService.saveProject(action.project).pipe(
          map(savedProject => ProjectActions.saveProjectSuccess({ project: savedProject })),
          catchError(error => {
            // Revert optimistic update
            return of(
              ProjectActions.revertOptimisticUpdate(),
              ProjectActions.saveProjectFailure({ error: error.message })
            );
          })
        )
      )
    )
  );

  // Auto-save functionality
  autoSave$ = createEffect((actions$, state$) =>
    state$.pipe(
      select(selectCurrentProject),
      filter(project => !!project),
      debounceTime(30000), // Auto-save after 30 seconds of inactivity
      map(project => ProjectActions.autoSaveProject({ project }))
    )
  );

  // Navigation after successful save
  navigateAfterSave$ = createEffect((actions$) =>
    actions$.pipe(
      ofType(ProjectActions.saveProjectSuccess),
      tap(action => {
        this.router.navigate(['/projects', action.project.id]);
      })
    ),
    { dispatch: false }
  );
}
```

## Performance Optimization Patterns

### Memoization and Caching

```typescript
// Advanced Memoization Decorator
export interface MemoizeOptions {
  keyGenerator?: (...args: any[]) => string;
  ttl?: number;
  maxSize?: number;
  resolver?: (...args: any[]) => any;
}

export function Memoize(options: MemoizeOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = new LRUCache<string, any>(options.maxSize || 100);

    descriptor.value = function (...args: any[]) {
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(...args)
        : JSON.stringify(args);

      // Check cache
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (!options.ttl || Date.now() - cached.timestamp < options.ttl) {
          return cached.value;
        }
      }

      // Calculate result
      const result = originalMethod.apply(this, args);
      
      // Cache result
      cache.set(cacheKey, {
        value: result,
        timestamp: Date.now()
      });

      return result;
    };

    return descriptor;
  };
}

// Usage Example
@Injectable({ providedIn: 'root' })
export class ProjectCalculationService {
  @Memoize({ 
    ttl: 60000, // 1 minute
    keyGenerator: (project) => `stats-${project.id}-${project.lastModified}` 
  })
  calculateProjectStatistics(project: Project): ProjectStatistics {
    console.log('Calculating statistics for project:', project.id);
    
    const totalSteps = SafeAccess.getProjectRows(project)
      .reduce((sum, row) => sum + row.steps.length, 0);
    
    const completedSteps = this.calculateCompletedSteps(project);
    const estimatedTime = this.estimateCompletionTime(project);
    
    return {
      totalSteps,
      completedSteps,
      completionPercentage: (completedSteps / totalSteps) * 100,
      estimatedTime
    };
  }

  @Memoize({ maxSize: 50 })
  calculateRowComplexity(row: Row): number {
    return row.steps.reduce((complexity, step) => {
      return complexity + this.getStepComplexity(step);
    }, 0);
  }
}
```

### Virtual Scrolling and Performance

```typescript
// Enhanced Virtual Scrolling Component
@Component({
  selector: 'app-optimized-project',
  template: `
    <div class="project-container" 
         [class.performance-mode]="performanceMode">
      
      <!-- Performance indicator -->
      <div class="performance-indicator" *ngIf="showPerformanceMetrics">
        <span>Render time: {{ lastRenderTime }}ms</span>
        <span>Memory: {{ memoryUsage }}MB</span>
        <span>FPS: {{ currentFPS }}</span>
      </div>

      <!-- Virtual scrolling viewport -->
      <cdk-virtual-scroll-viewport
        #viewport
        [itemSize]="dynamicItemSize"
        [maxBufferPx]="maxBufferSize"
        [minBufferPx]="minBufferSize"
        class="project-viewport"
        (renderedRangeChange)="onRangeChange($event)"
        *ngIf="optimizedRows$ | async as rows; else loadingTemplate">
        
        <app-row
          *cdkVirtualFor="let row of rows; 
                          trackBy: trackByRowId; 
                          templateCacheSize: templateCacheSize"
          [row]="row"
          [index]="getRowIndex(row)"
          [currentPosition]="currentPosition$ | async"
          [markMode]="markMode$ | async"
          [viewportSize]="viewportSize"
          [isVisible]="isRowVisible(row)"
          (positionChange)="onPositionChange($event)"
          (stepClick)="onStepClick($event)"
          (intersectionChange)="onRowIntersection($event)">
        </app-row>
      </cdk-virtual-scroll-viewport>

      <ng-template #loadingTemplate>
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Optimizing project display...</p>
        </div>
      </ng-template>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedProjectComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('viewport') viewport!: CdkVirtualScrollViewport;

  // Performance configuration
  performanceMode = false;
  showPerformanceMetrics = !environment.production;
  dynamicItemSize = 60;
  maxBufferSize = 2000;
  minBufferSize = 800;
  templateCacheSize = 20;

  // Performance metrics
  lastRenderTime = 0;
  memoryUsage = 0;
  currentFPS = 0;
  viewportSize = { width: 0, height: 0 };

  // Optimized observables
  optimizedRows$ = this.store.select(selectOptimizedRows).pipe(
    distinctUntilChanged((a, b) => this.compareRowArrays(a, b)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  currentPosition$ = this.store.select(selectCurrentPosition);
  markMode$ = this.store.select(selectMarkMode);

  private destroy$ = new Subject<void>();
  private performanceObserver!: PerformanceObserver;
  private intersectionObserver!: IntersectionObserver;
  private visibleRows = new Set<number>();

  constructor(
    private store: ReactiveStateStore,
    private performanceService: PerformanceMonitorService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.setupPerformanceMonitoring();
    this.optimizeForLargeDatasets();
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
    this.measureViewportSize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupObservers();
  }

  // Performance optimizations
  trackByRowId = (index: number, row: Row): number => row.id;

  onRangeChange(range: ListRange): void {
    // Adjust item size based on content
    this.adjustDynamicItemSize(range);
    
    // Update performance metrics
    this.updatePerformanceMetrics();
  }

  onRowIntersection(event: { rowId: number; isVisible: boolean }): void {
    if (event.isVisible) {
      this.visibleRows.add(event.rowId);
    } else {
      this.visibleRows.delete(event.rowId);
    }
  }

  isRowVisible(row: Row): boolean {
    return this.visibleRows.has(row.id);
  }

  private setupPerformanceMonitoring(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name.includes('project-render')) {
            this.lastRenderTime = entry.duration;
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }

    // Monitor memory usage
    this.zone.runOutsideAngular(() => {
      setInterval(() => {
        if ('memory' in performance) {
          this.memoryUsage = Math.round(
            (performance as any).memory.usedJSHeapSize / 1024 / 1024
          );
        }
      }, 1000);
    });
  }

  private optimizeForLargeDatasets(): void {
    // Enable performance mode for large projects
    this.optimizedRows$.pipe(
      takeUntil(this.destroy$),
      tap(rows => {
        const isLarge = rows.length > 100;
        if (isLarge !== this.performanceMode) {
          this.performanceMode = isLarge;
          this.adjustPerformanceSettings(isLarge);
          this.cdr.markForCheck();
        }
      })
    ).subscribe();
  }

  private adjustPerformanceSettings(isLargeDataset: boolean): void {
    if (isLargeDataset) {
      this.maxBufferSize = 1000;
      this.minBufferSize = 400;
      this.templateCacheSize = 10;
    } else {
      this.maxBufferSize = 2000;
      this.minBufferSize = 800;
      this.templateCacheSize = 20;
    }
  }

  private compareRowArrays(a: Row[], b: Row[]): boolean {
    if (a.length !== b.length) return false;
    
    // Quick check for reference equality
    if (a === b) return true;
    
    // Deep comparison for first and last few items
    const checkCount = Math.min(5, a.length);
    for (let i = 0; i < checkCount; i++) {
      if (a[i].id !== b[i].id) return false;
    }
    
    return true;
  }

  private updatePerformanceMetrics(): void {
    performance.mark('project-render-start');
    
    requestAnimationFrame(() => {
      performance.mark('project-render-end');
      performance.measure(
        'project-render',
        'project-render-start',
        'project-render-end'
      );
    });
  }
}
```

## Security Implementation

### Content Security Policy and XSS Protection

```typescript
@Injectable({ providedIn: 'root' })
export class SecurityService {
  private cspViolations: CSPViolation[] = [];
  private sanitizationLog: SanitizationEvent[] = [];

  constructor(
    private encryptionService: EncryptionService,
    private auditLogger: AuditLoggerService
  ) {
    this.initializeSecurity();
  }

  private initializeSecurity(): void {
    this.setupCSP();
    this.setupXSSProtection();
    this.setupInputSanitization();
    this.setupSecurityMonitoring();
  }

  private setupCSP(): void {
    // Implement CSP reporting
    document.addEventListener('securitypolicyviolation', (event) => {
      const violation: CSPViolation = {
        directive: event.violatedDirective,
        uri: event.blockedURI,
        source: event.sourceFile,
        line: event.lineNumber,
        timestamp: new Date(),
        userAgent: navigator.userAgent
      };

      this.cspViolations.push(violation);
      this.auditLogger.logSecurityEvent('csp_violation', violation);
      
      // Alert for critical violations
      if (this.isCriticalViolation(violation)) {
        this.handleCriticalSecurityEvent(violation);
      }
    });
  }

  // Input Sanitization
  sanitizeProjectData(data: any): any {
    const sanitized = this.deepSanitize(data);
    
    this.sanitizationLog.push({
      timestamp: new Date(),
      originalSize: JSON.stringify(data).length,
      sanitizedSize: JSON.stringify(sanitized).length,
      violations: this.detectSanitizationViolations(data, sanitized)
    });

    return sanitized;
  }

  private deepSanitize(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.deepSanitize(value);
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:(?!image\/)/gi, '') // Remove non-image data URLs
      .trim();
  }

  // Encryption for sensitive data
  async encryptSensitiveData(data: string): Promise<string> {
    return await this.encryptionService.encrypt(data);
  }

  async decryptSensitiveData(encryptedData: string): Promise<string> {
    return await this.encryptionService.decrypt(encryptedData);
  }

  // Security reporting
  getSecurityReport(): SecurityReport {
    return {
      cspViolations: this.cspViolations.length,
      sanitizationEvents: this.sanitizationLog.length,
      lastSecurityScan: new Date(),
      riskLevel: this.calculateRiskLevel()
    };
  }

  private calculateRiskLevel(): 'low' | 'medium' | 'high' {
    const recentViolations = this.cspViolations.filter(
      v => Date.now() - v.timestamp.getTime() < 3600000 // Last hour
    ).length;

    if (recentViolations > 10) return 'high';
    if (recentViolations > 3) return 'medium';
    return 'low';
  }
}

// Client-side Encryption Service
@Injectable({ providedIn: 'root' })
export class ClientEncryptionService {
  private key: CryptoKey | null = null;

  constructor() {
    this.initializeKey();
  }

  private async initializeKey(): Promise<void> {
    try {
      // Generate or retrieve encryption key
      const stored = localStorage.getItem('app-key-id');
      if (stored) {
        this.key = await this.deriveKeyFromStorage(stored);
      } else {
        this.key = await this.generateNewKey();
        await this.storeKeyReference();
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
    }
  }

  async encrypt(data: string): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption key not available');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      dataBuffer
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption key not available');
    }

    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  private async generateNewKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // Not extractable
      ['encrypt', 'decrypt']
    );
  }
}

// Security interfaces
interface CSPViolation {
  directive: string;
  uri: string;
  source: string;
  line: number;
  timestamp: Date;
  userAgent: string;
}

interface SanitizationEvent {
  timestamp: Date;
  originalSize: number;
  sanitizedSize: number;
  violations: string[];
}

interface SecurityReport {
  cspViolations: number;
  sanitizationEvents: number;
  lastSecurityScan: Date;
  riskLevel: 'low' | 'medium' | 'high';
}
```

This comprehensive set of advanced patterns provides:

1. **CQRS Implementation**: Separates read and write operations for better scalability
2. **Event Sourcing**: Tracks all state changes as events for audit and replay
3. **Advanced State Management**: Reactive state store with memoization and effects
4. **Performance Optimization**: Memoization, virtual scrolling, and performance monitoring
5. **Security Hardening**: CSP, input sanitization, and client-side encryption

These patterns transform the Rowguide application into an enterprise-grade solution with advanced architectural patterns, security measures, and performance optimizations.

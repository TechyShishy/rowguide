# Core Services

This directory contains all core application services that provide foundational functionality used throughout the entire Rowguide application.

## Service Lifecycle and Dependency Injection Patterns

### Service Registration Patterns

All core services follow consistent registration patterns for optimal performance and maintainability:

```typescript
@Injectable({ providedIn: 'root' })
export class CoreService implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  constructor(
    private store: ReactiveStateStore,
    private errorHandler: ErrorHandlerService,
    private logger: NGXLogger
  ) {
    this.initializeService();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Key Patterns:**
- **Singleton Registration**: All services use `@Injectable({ providedIn: 'root' })` for singleton behavior
- **Tree Shaking**: Services are automatically tree-shaken if not used
- **Constructor Injection**: All dependencies injected through constructor
- **No ngOnInit**: Services don't implement OnInit lifecycle hook
- **OnDestroy Implementation**: Required for services with subscriptions

### Dependency Injection Hierarchy

Services are organized in clear layers to prevent circular dependencies:

```
┌─────────────────┐
│   Core Services │ ← NotificationService, ErrorHandlerService, DataIntegrityService
└─────────────────┘
         ↓
┌─────────────────┐
│  Data Services  │ ← ProjectDbService, IndexedDbService, MigrationDbService
└─────────────────┘
         ↓
┌─────────────────┐
│Feature Services │ ← ProjectService, ZipperService, PdfjslibService
└─────────────────┘
         ↓
┌─────────────────┐
│ Shared Utilities│ ← Type guards, Model factories, Safe access utilities
└─────────────────┘
```

**Dependency Rules:**
- **Downward Dependencies Only**: Higher layers can depend on lower layers
- **No Circular Dependencies**: Services avoid circular dependency chains
- **Store Communication**: Services communicate through ReactiveStateStore
- **Direct Injection**: Only for utility services (error handling, validation)

### Service Communication Patterns

#### 1. **State Management Communication** (Primary Pattern)
```typescript
@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(private store: ReactiveStateStore) {}
  
  loadProject(id: number): void {
    // Dispatch action to store
    this.store.dispatch(ProjectActions.loadProject({ id }));
  }
  
  // Subscribe to state changes
  currentProject$ = this.store.select(selectCurrentProject);
}
```

#### 2. **Direct Service Integration** (Utility Pattern)
```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(
    private errorHandler: ErrorHandlerService,    // Error handling
    private dataIntegrity: DataIntegrityService, // Data validation
    private notifications: NotificationService   // User feedback
  ) {}
  
  async saveData(data: ProjectData): Promise<void> {
    // Validate data
    const validation = this.dataIntegrity.validateProjectData(data);
    if (!validation.isValid) {
      this.errorHandler.handleValidationError(validation.errors);
      return;
    }
    
    try {
      await this.persistData(data);
      this.notifications.success('Data saved successfully');
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'DataService.saveData' });
    }
  }
}
```

#### 3. **Event-Driven Communication** (Observable Pattern)
```typescript
@Injectable({ providedIn: 'root' })
export class FileProcessingService {
  private fileProcessed$ = new Subject<ProcessedFile>();
  
  // Expose observable for other services
  onFileProcessed$ = this.fileProcessed$.asObservable();
  
  processFile(file: File): void {
    // Process file and emit event
    const processed = this.doProcessing(file);
    this.fileProcessed$.next(processed);
  }
}
```

### Memory Management Guidelines

**Required Patterns:**
```typescript
@Injectable({ providedIn: 'root' })
export class ServiceWithSubscriptions implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  constructor(private store: ReactiveStateStore) {
    // Set up subscriptions with automatic cleanup
    this.store.select(selectSomeData)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.handleData(data));
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Guidelines:**
- **Always implement OnDestroy** for services with subscriptions
- **Use takeUntil pattern** for automatic subscription cleanup
- **Complete subjects** in ngOnDestroy to prevent memory leaks
- **Avoid manual unsubscribe** - use takeUntil instead

### Testing Integration

**Service Testing Pattern:**
```typescript
describe('ExampleService', () => {
  let service: ExampleService;
  let storeSpy: jasmine.SpyObj<ReactiveStateStore>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    const storeSpyObj = jasmine.createSpyObj('ReactiveStateStore', ['dispatch', 'select']);
    const errorSpyObj = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ReactiveStateStore, useValue: storeSpyObj },
        { provide: ErrorHandlerService, useValue: errorSpyObj }
      ]
    });

    service = TestBed.inject(ExampleService);
    storeSpy = TestBed.inject(ReactiveStateStore) as jasmine.SpyObj<ReactiveStateStore>;
    errorHandlerSpy = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

**Testing Guidelines:**
- Use **TestBed.inject()** for service injection in tests
- Mock dependencies with **jasmine.createSpyObj()**
- Test **both success and error scenarios**
- Verify **subscription cleanup** in OnDestroy tests

## Available Core Services

### [NotificationService](./notification.service.ts)
**Purpose**: User feedback and notification management
- Queue-based notification system
- Support for success, error, warning, and info messages
- Integration with Material Design snackbars

### [MarkModeService](./mark-mode.service.ts)
**Purpose**: Mark mode state management with undo capability
- Mark mode history and undo functionality
- Reactive mark mode updates
- Integration with step marking UI

### [SettingsService](./settings.service.ts)
**Purpose**: Application settings persistence and loading
- localStorage-based settings persistence
- Settings validation and defaults
- Reactive settings updates

### [FlamService](./flam.service.ts)
**Purpose**: First/Last Appearance Map generation and color management
- FLAM algorithm implementation
- Color mapping persistence
- Pattern analysis and visualization

### [ErrorHandlerService](./error-handler.service.ts)
**Purpose**: Comprehensive error handling with categorization and recovery
- Error categorization by severity
- Context-aware error reporting
- Recovery strategy recommendations
- Integration with notification system

### [DataIntegrityService](./data-integrity.service.ts)
**Purpose**: Data validation and corruption prevention
- Input validation and sanitization
- File path security validation
- JSON parsing safety
- Event logging for debugging

## Architecture Integration

### Store Integration
```typescript
// Services integrate with ReactiveStateStore for state management
this.store.dispatch(ProjectActions.loadProject({ id }));
this.currentProject$ = this.store.select(selectCurrentProject);
```

### Error Handling Integration
```typescript
// All services use ErrorHandlerService for consistent error handling
catch (error) {
  this.errorHandler.handleError(error, { 
    component: 'ServiceName',
    method: 'methodName',
    data: { contextData }
  });
}
```

### Data Validation Integration
```typescript
// Services use DataIntegrityService for input validation
const validation = this.dataIntegrity.validateProjectName(name);
if (!validation.isValid) {
  this.handleValidationError(validation);
  return;
}
```

## Development Guidelines

1. **Follow the established patterns** for service creation and lifecycle
2. **Use dependency injection hierarchy** to avoid circular dependencies
3. **Implement proper memory management** with OnDestroy and takeUntil
4. **Integrate error handling** through ErrorHandlerService
5. **Use ReactiveStateStore** for state management instead of service-to-service state sharing
6. **Write comprehensive tests** with proper mocking and cleanup verification
7. **Document all public methods** with JSDoc including examples and integration patterns

## Related Documentation

- [Core Models README](../models/README.md) - Domain models and null safety utilities
- [Store README](../store/README.md) - ReactiveStateStore implementation and usage
- [Null Safety Guide](../models/NULL_SAFETY_GUIDE.md) - Comprehensive null safety patterns

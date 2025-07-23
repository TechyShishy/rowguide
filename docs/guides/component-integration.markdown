---
layout: default
title: Component Integration Guide
permalink: /guides/component-integration/
---

# Component Integration Guide

Comprehensive guide for integrating components with Rowguide's architecture, demonstrating patterns for reactive state management, error handling, and performance optimization.

## Smart vs Presentational Components

### Smart Components (Container Components)

Smart components handle state management, business logic, and service integration.

```typescript
// Smart Component: ProjectContainerComponent
@Component({
  selector: 'app-project-container',
  template: `
    <app-project-view
      [project]="project$ | async"
      [currentPosition]="currentPosition$ | async"
      [isLoading]="isLoading$ | async"
      [error]="error$ | async"
      (positionChange)="onPositionChange($event)"
      (saveProject)="onSaveProject($event)"
      (deleteProject)="onDeleteProject($event)"
    >
    </app-project-view>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectContainerComponent implements OnInit, OnDestroy {
  // Reactive state streams
  project$ = this.store.select(selectCurrentProject);
  currentPosition$ = this.store.select(selectCurrentPosition);
  isLoading$ = this.store.select(selectProjectLoading);
  error$ = this.store.select(selectProjectError);

  private destroy$ = new Subject<void>();

  constructor(
    private store: ReactiveStateStore,
    private projectCommands: ProjectCommandService,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit() {
    // Handle global error states
    this.error$.pipe(
      filter(error => error !== null),
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.errorHandler.handleError(error, {
        component: 'ProjectContainerComponent',
        operation: 'state-change',
        context: { projectId: this.getCurrentProjectId() }
      });
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Command handlers
  onPositionChange(position: Position) {
    this.projectCommands.updatePosition({
      projectId: this.getCurrentProjectId(),
      position
    }).subscribe({
      error: (error) => this.handleCommandError(error, 'updatePosition')
    });
  }

  onSaveProject(project: Project) {
    this.projectCommands.saveProject(project).subscribe({
      error: (error) => this.handleCommandError(error, 'saveProject')
    });
  }

  onDeleteProject(projectId: number) {
    this.projectCommands.deleteProject(projectId).subscribe({
      error: (error) => this.handleCommandError(error, 'deleteProject')
    });
  }

  private handleCommandError(error: any, operation: string) {
    this.errorHandler.handleError(error, {
      component: 'ProjectContainerComponent',
      operation,
      context: { projectId: this.getCurrentProjectId() }
    });
  }

  private getCurrentProjectId(): number | null {
    // Safe access to current project ID
    return this.store.selectSnapshot(selectCurrentProject)?.id ?? null;
  }
}
```

### Presentational Components (View Components)

Presentational components focus on UI rendering and user interaction.

```typescript
// Presentational Component: ProjectViewComponent
@Component({
  selector: 'app-project-view',
  template: `
    <div class="project-container">
      <!-- Loading State -->
      <mat-spinner *ngIf="isLoading" diameter="50"></mat-spinner>

      <!-- Error State -->
      <app-error-display
        *ngIf="error"
        [error]="error"
        [showRetry]="true"
        (retry)="onRetry()"
      >
      </app-error-display>

      <!-- Project Content -->
      <div *ngIf="project && !isLoading && !error" class="project-content">
        <app-project-header
          [project]="project"
          (save)="saveProject.emit($event)"
          (delete)="deleteProject.emit(project.id)"
        >
        </app-project-header>

        <app-pattern-grid
          [rows]="project.rows"
          [currentPosition]="currentPosition"
          [trackBy]="trackByRowId"
          (positionChange)="positionChange.emit($event)"
        >
        </app-pattern-grid>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectViewComponent {
  @Input() project: Project | null = null;
  @Input() currentPosition: Position | null = null;
  @Input() isLoading: boolean = false;
  @Input() error: any = null;

  @Output() positionChange = new EventEmitter<Position>();
  @Output() saveProject = new EventEmitter<Project>();
  @Output() deleteProject = new EventEmitter<number>();
  @Output() retry = new EventEmitter<void>();

  // Optimized trackBy function
  trackByRowId = (index: number, row: Row): number => row.id;

  onRetry() {
    this.retry.emit();
  }
}
```

## Advanced Integration Patterns

### 1. Multi-State Component Integration

```typescript
@Component({
  selector: 'app-multi-state-component',
  template: `
    <div class="multi-state-container">
      <!-- Combined state display -->
      <div *ngIf="viewModel$ | async as vm" class="view-model">
        <app-project-summary
          [project]="vm.project"
          [statistics]="vm.statistics"
          [userPreferences]="vm.userPreferences"
        >
        </app-project-summary>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiStateComponent implements OnInit {
  // Combine multiple state streams
  viewModel$ = combineLatest([
    this.store.select(selectCurrentProject),
    this.store.select(selectProjectStatistics),
    this.store.select(selectUserPreferences)
  ]).pipe(
    map(([project, statistics, userPreferences]) => ({
      project,
      statistics,
      userPreferences
    })),
    shareReplay(1)
  );

  constructor(private store: ReactiveStateStore) {}

  ngOnInit() {
    // Pre-load required data
    this.store.dispatch(ProjectActions.loadStatistics());
    this.store.dispatch(UserActions.loadPreferences());
  }
}
```

### 2. Error Boundary Component

```typescript
@Component({
  selector: 'app-error-boundary',
  template: `
    <div class="error-boundary">
      <ng-container *ngIf="!hasError; else errorTemplate">
        <ng-content></ng-content>
      </ng-container>

      <ng-template #errorTemplate>
        <div class="error-fallback">
          <h3>Something went wrong</h3>
          <p>{{ errorMessage }}</p>
          <button mat-button (click)="retry()">Try Again</button>
          <button mat-button (click)="reset()">Reset</button>
        </div>
      </ng-template>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorBoundaryComponent implements OnInit, OnDestroy {
  @Input() fallbackMessage: string = 'An error occurred';
  @Output() errorOccurred = new EventEmitter<Error>();

  hasError = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Listen for global errors
    this.errorHandler.errorStream$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.handleError(error);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleError(error: any) {
    this.hasError = true;
    this.errorMessage = error.message || this.fallbackMessage;
    this.errorOccurred.emit(error);
    this.cdr.markForCheck();
  }

  retry() {
    this.hasError = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
    // Trigger retry logic
  }

  reset() {
    this.hasError = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
    // Trigger reset logic
  }
}
```

### 3. Virtual Scrolling Integration

```typescript
@Component({
  selector: 'app-virtual-pattern-grid',
  template: `
    <cdk-virtual-scroll-viewport
      class="pattern-viewport"
      [itemSize]="itemSize"
      [minBufferPx]="minBufferPx"
      [maxBufferPx]="maxBufferPx"
    >
      <div
        *cdkVirtualFor="let row of rows; let i = index; trackBy: trackByRowId"
        class="pattern-row"
        [class.current]="i === currentPosition?.row"
      >
        <app-pattern-row
          [row]="row"
          [rowIndex]="i"
          [currentStepIndex]="getCurrentStepIndex(i)"
          [isActive]="i === currentPosition?.row"
          (stepClick)="onStepClick(i, $event)"
        >
        </app-pattern-row>
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualPatternGridComponent {
  @Input() rows: Row[] = [];
  @Input() currentPosition: Position | null = null;
  @Input() itemSize: number = 60;
  @Input() minBufferPx: number = 200;
  @Input() maxBufferPx: number = 400;

  @Output() positionChange = new EventEmitter<Position>();

  trackByRowId = (index: number, row: Row): number => row.id;

  onStepClick(rowIndex: number, stepIndex: number) {
    this.positionChange.emit({
      row: rowIndex,
      step: stepIndex
    });
  }

  getCurrentStepIndex(rowIndex: number): number {
    if (!this.currentPosition || this.currentPosition.row !== rowIndex) {
      return -1;
    }
    return this.currentPosition.step;
  }
}
```

## Form Integration Patterns

### 4. Reactive Form Integration

```typescript
@Component({
  selector: 'app-project-form',
  template: `
    <form [formGroup]="projectForm" (ngSubmit)="onSubmit()">
      <mat-form-field>
        <mat-label>Project Name</mat-label>
        <input matInput formControlName="name" />
        <mat-error *ngIf="projectForm.get('name')?.errors?.['required']">
          Project name is required
        </mat-error>
      </mat-form-field>

      <div formArrayName="rows">
        <div *ngFor="let rowControl of rowControls; let i = index">
          <app-row-form
            [formGroup]="rowControl"
            [rowIndex]="i"
            (remove)="removeRow(i)"
          >
          </app-row-form>
        </div>
      </div>

      <button type="button" mat-button (click)="addRow()">Add Row</button>
      <button type="submit" mat-raised-button color="primary">Save</button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectFormComponent implements OnInit {
  @Input() initialProject: Project | null = null;
  @Output() projectSave = new EventEmitter<Project>();

  projectForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dataIntegrity: DataIntegrityService
  ) {
    this.projectForm = this.createForm();
  }

  ngOnInit() {
    if (this.initialProject) {
      this.populateForm(this.initialProject);
    }

    // Real-time validation
    this.projectForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.performValidation(value);
    });
  }

  get rowControls(): FormArray {
    return this.projectForm.get('rows') as FormArray;
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      rows: this.fb.array([])
    });
  }

  private populateForm(project: Project) {
    this.projectForm.patchValue({
      name: project.name,
      description: project.description || ''
    });

    const rowsArray = this.projectForm.get('rows') as FormArray;
    project.rows.forEach(row => {
      rowsArray.push(this.createRowControl(row));
    });
  }

  private createRowControl(row?: Row): FormGroup {
    const stepsArray = this.fb.array([]);

    if (row) {
      row.steps.forEach(step => {
        stepsArray.push(this.createStepControl(step));
      });
    }

    return this.fb.group({
      id: [row?.id || this.generateId()],
      steps: stepsArray
    });
  }

  private createStepControl(step?: Step): FormGroup {
    return this.fb.group({
      id: [step?.id || this.generateId()],
      count: [step?.count || 1, [Validators.required, Validators.min(1)]],
      description: [step?.description || '', Validators.required]
    });
  }

  addRow() {
    const rowsArray = this.projectForm.get('rows') as FormArray;
    rowsArray.push(this.createRowControl());
  }

  removeRow(index: number) {
    const rowsArray = this.projectForm.get('rows') as FormArray;
    rowsArray.removeAt(index);
  }

  onSubmit() {
    if (this.projectForm.valid) {
      const formValue = this.projectForm.value;
      const project = this.createProjectFromForm(formValue);
      this.projectSave.emit(project);
    }
  }

  private performValidation(formValue: any) {
    // Create a project from form value and validate
    const project = this.createProjectFromForm(formValue);
    const validation = this.dataIntegrity.validateProject(project);

    // Apply validation errors to form
    this.applyValidationErrors(validation);
  }

  private createProjectFromForm(formValue: any): Project {
    return ModelFactory.createProject({
      id: this.initialProject?.id || this.generateId(),
      name: formValue.name,
      description: formValue.description,
      rows: formValue.rows.map((row: any) => ModelFactory.createRow({
        id: row.id,
        steps: row.steps.map((step: any) => ModelFactory.createStep({
          id: step.id,
          count: step.count,
          description: step.description
        }))
      }))
    });
  }

  private applyValidationErrors(validation: ValidationResult) {
    // Apply validation errors to form controls
    // This is a simplified example
    if (!validation.isValid) {
      console.warn('Form validation errors:', validation.errors);
    }
  }

  private generateId(): number {
    return Math.floor(Math.random() * 1000000);
  }
}
```

## Testing Integration

### 5. Component Testing Patterns

```typescript
describe('ProjectContainerComponent', () => {
  let component: ProjectContainerComponent;
  let fixture: ComponentFixture<ProjectContainerComponent>;
  let store: jasmine.SpyObj<ReactiveStateStore>;
  let projectCommands: jasmine.SpyObj<ProjectCommandService>;
  let errorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('ReactiveStateStore', ['select', 'selectSnapshot']);
    const commandsSpy = jasmine.createSpyObj('ProjectCommandService', ['updatePosition', 'saveProject', 'deleteProject']);
    const errorSpy = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

    await TestBed.configureTestingModule({
      declarations: [ProjectContainerComponent],
      providers: [
        { provide: ReactiveStateStore, useValue: storeSpy },
        { provide: ProjectCommandService, useValue: commandsSpy },
        { provide: ErrorHandlerService, useValue: errorSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(ReactiveStateStore) as jasmine.SpyObj<ReactiveStateStore>;
    projectCommands = TestBed.inject(ProjectCommandService) as jasmine.SpyObj<ProjectCommandService>;
    errorHandler = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectContainerComponent);
    component = fixture.componentInstance;

    // Setup store mocks
    store.select.and.returnValue(of(null));
    store.selectSnapshot.and.returnValue(null);
  });

  it('should handle position changes', () => {
    const position: Position = { row: 0, step: 1 };
    projectCommands.updatePosition.and.returnValue(of(position));

    component.onPositionChange(position);

    expect(projectCommands.updatePosition).toHaveBeenCalledWith({
      projectId: null,
      position
    });
  });

  it('should handle command errors', () => {
    const error = new Error('Test error');
    projectCommands.updatePosition.and.returnValue(throwError(error));

    component.onPositionChange({ row: 0, step: 1 });

    expect(errorHandler.handleError).toHaveBeenCalledWith(error, {
      component: 'ProjectContainerComponent',
      operation: 'updatePosition',
      context: { projectId: null }
    });
  });

  it('should handle state changes', () => {
    const project = TestDataBuilder.createProject();
    store.select.and.returnValue(of(project));

    fixture.detectChanges();

    expect(component.project$).toBeDefined();
  });
});
```

### 6. Integration Testing

```typescript
describe('Project Integration', () => {
  let component: ProjectContainerComponent;
  let fixture: ComponentFixture<ProjectContainerComponent>;
  let store: ReactiveStateStore;
  let testDataBuilder: TestDataBuilder;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ProjectContainerComponent,
        ProjectViewComponent,
        PatternGridComponent
      ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        ReactiveStateStore,
        ProjectCommandService,
        ErrorHandlerService
      ]
    }).compileComponents();

    store = TestBed.inject(ReactiveStateStore);
    testDataBuilder = new TestDataBuilder();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectContainerComponent);
    component = fixture.componentInstance;
  });

  it('should display project data correctly', async () => {
    const project = testDataBuilder.createProject();
    store.dispatch(ProjectActions.loadProjectSuccess(project));

    fixture.detectChanges();
    await fixture.whenStable();

    const projectView = fixture.debugElement.query(By.directive(ProjectViewComponent));
    expect(projectView).toBeTruthy();
    expect(projectView.componentInstance.project).toEqual(project);
  });

  it('should handle user interactions', async () => {
    const project = testDataBuilder.createProject();
    store.dispatch(ProjectActions.loadProjectSuccess(project));

    fixture.detectChanges();
    await fixture.whenStable();

    const patternGrid = fixture.debugElement.query(By.directive(PatternGridComponent));
    const newPosition: Position = { row: 1, step: 2 };

    patternGrid.componentInstance.positionChange.emit(newPosition);
    fixture.detectChanges();

    // Verify position update was handled
    const currentPosition = store.selectSnapshot(selectCurrentPosition);
    expect(currentPosition).toEqual(newPosition);
  });
});
```

## Performance Optimization

### 7. OnPush Change Detection Strategy

```typescript
@Component({
  selector: 'app-optimized-component',
  template: `
    <div *ngIf="data$ | async as data" class="optimized-component">
      <app-child-component
        *ngFor="let item of data.items; trackBy: trackByItem"
        [item]="item"
        [config]="config"
        (itemChange)="onItemChange($event)"
      >
      </app-child-component>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedComponent implements OnInit, OnDestroy {
  @Input()
  set config(value: ComponentConfig) {
    this._config = value;
    this.configSubject.next(value);
  }
  get config(): ComponentConfig {
    return this._config;
  }
  private _config: ComponentConfig = DEFAULT_CONFIG;
  private configSubject = new BehaviorSubject<ComponentConfig>(DEFAULT_CONFIG);

  // Memoized data stream
  data$ = combineLatest([
    this.store.select(selectComponentData),
    this.configSubject.asObservable()
  ]).pipe(
    map(([data, config]) => ({
      items: this.processItems(data, config),
      config
    })),
    distinctUntilChanged(this.dataComparer),
    shareReplay(1)
  );

  private destroy$ = new Subject<void>();

  constructor(
    private store: ReactiveStateStore,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Trigger change detection only when necessary
    this.data$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Optimized trackBy function
  trackByItem = (index: number, item: DataItem): string =>
    `${item.id}_${item.version}`;

  // Custom equality comparer
  private dataComparer = (a: ProcessedData, b: ProcessedData): boolean => {
    return a.items.length === b.items.length &&
           a.items.every((item, index) =>
             item.id === b.items[index]?.id &&
             item.version === b.items[index]?.version
           );
  };

  private processItems(data: RawData, config: ComponentConfig): DataItem[] {
    // Expensive processing should be memoized
    return data.items.map(item => ({
      ...item,
      processed: this.processItem(item, config)
    }));
  }

  @Memoize({ maxAge: 60000 }) // Cache for 1 minute
  private processItem(item: RawDataItem, config: ComponentConfig): ProcessedItem {
    // Expensive processing logic
    return {
      id: item.id,
      version: item.version,
      computed: this.performExpensiveComputation(item, config)
    };
  }

  onItemChange(item: DataItem) {
    // Trigger minimal state update
    this.store.dispatch(DataActions.updateItem(item));
  }
}
```

## Best Practices Summary

### Component Integration Checklist

- ✅ **Separation of Concerns** - Smart vs presentational components
- ✅ **OnPush Change Detection** - Optimize rendering performance
- ✅ **TrackBy Functions** - Efficient list rendering
- ✅ **Error Boundaries** - Graceful error handling
- ✅ **Reactive Patterns** - Use observables for data flow
- ✅ **Memory Management** - Proper subscription cleanup
- ✅ **Testing Coverage** - Unit and integration tests
- ✅ **Performance Monitoring** - Track component performance

### Integration Patterns

1. **Container/Presenter Pattern** - Separate business logic from presentation
2. **Reactive State Management** - Use observables for state changes
3. **Error Handling** - Implement error boundaries and recovery
4. **Form Integration** - Reactive forms with validation
5. **Virtual Scrolling** - Optimize large lists
6. **Memoization** - Cache expensive computations

## See Also

- [Architecture: State Management]({{ site.baseurl }}/architecture/state-management) - State management patterns
- [Architecture: Error Handling]({{ site.baseurl }}/architecture/error-handling) - Error handling integration
- [Testing Strategy]({{ site.baseurl }}/testing/testing-strategy) - Component testing patterns

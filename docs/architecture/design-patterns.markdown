---
layout: default
title: Design Patterns and Usage
permalink: /architecture/design-patterns/
---

# Design Patterns and Usage

This document describes the design patterns used throughout the Rowguide application, providing implementation examples and usage guidelines.

## Core Design Patterns

### 1. Repository Pattern

**Purpose**: Abstracts data access logic and provides a uniform interface for accessing domain objects.

**Implementation**:
```typescript
// Abstract repository interface
interface IRepository<T> {
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: number): Promise<void>;
}

// Concrete implementation
@Injectable({ providedIn: 'root' })
export class ProjectRepository implements IRepository<Project> {
  constructor(private db: ProjectDbService) {}

  async findById(id: number): Promise<Project | null> {
    return await this.db.getProject(id);
  }

  async findAll(): Promise<Project[]> {
    return await this.db.loadProjects();
  }

  async save(project: Project): Promise<Project> {
    return await this.db.saveProject(project);
  }

  async delete(id: number): Promise<void> {
    await this.db.deleteProject(id);
  }
}
```

**Usage**: Used in `ProjectDbService`, `MigrationDbService` for consistent data access patterns.

### 2. Observer Pattern

**Purpose**: Defines a one-to-many dependency between objects so that when one object changes state, all dependents are notified.

**Implementation**:
```typescript
// Subject interface
interface ISubject<T> {
  subscribe(observer: (value: T) => void): Subscription;
  next(value: T): void;
}

// Concrete subject
@Injectable({ providedIn: 'root' })
export class NotificationService implements ISubject<UiNotification> {
  private subject = new Subject<UiNotification>();

  subscribe(observer: (notification: UiNotification) => void): Subscription {
    return this.subject.subscribe(observer);
  }

  next(notification: UiNotification): void {
    this.subject.next(notification);
  }

  // Convenience methods
  success(message: string): void {
    this.next({ type: 'success', message, timestamp: Date.now() });
  }
}
```

**Usage**: Throughout the application for state changes, notifications, and event handling.

### 3. Factory Pattern

**Purpose**: Creates objects without specifying their concrete classes, providing a common interface for object creation.

**Implementation**:
```typescript
// Factory interface
interface IModelFactory {
  createProject(data?: Partial<Project>): Project;
  createRow(data?: Partial<Row>): Row;
  createStep(data?: Partial<Step>): Step;
}

// Concrete factory
export class ModelFactory implements IModelFactory {
  createProject(data: Partial<Project> = {}): Project {
    return {
      id: data.id ?? this.generateId(),
      name: data.name ?? '',
      rows: data.rows ?? [],
      position: data.position ?? this.createPosition(),
      firstLastAppearanceMap: data.firstLastAppearanceMap ?? {},
      colorMapping: data.colorMapping ?? {},
      image: data.image ?? null
    };
  }

  createRow(data: Partial<Row> = {}): Row {
    return {
      id: data.id ?? this.generateId(),
      steps: data.steps ?? []
    };
  }

  createStep(data: Partial<Step> = {}): Step {
    return {
      id: data.id ?? this.generateId(),
      count: data.count ?? 1,
      description: data.description ?? ''
    };
  }

  private generateId(): number {
    return Math.floor(Math.random() * 1000000);
  }
}
```

**Usage**: Used throughout the application for safe object creation with validation.

### 4. Strategy Pattern

**Purpose**: Defines a family of algorithms, encapsulates each one, and makes them interchangeable.

**Implementation**:
```typescript
// Strategy interface
interface IFileProcessorStrategy {
  canProcess(file: File): boolean;
  process(file: File): Promise<Project>;
}

// Concrete strategies
@Injectable({ providedIn: 'root' })
export class PeyoteShorthandStrategy implements IFileProcessorStrategy {
  canProcess(file: File): boolean {
    return file.type === 'text/plain';
  }

  async process(file: File): Promise<Project> {
    const content = await file.text();
    return this.parseContent(content);
  }
}

@Injectable({ providedIn: 'root' })
export class PdfProcessorStrategy implements IFileProcessorStrategy {
  canProcess(file: File): boolean {
    return file.type === 'application/pdf';
  }

  async process(file: File): Promise<Project> {
    const buffer = await file.arrayBuffer();
    return this.extractFromPdf(buffer);
  }
}

// Context class
@Injectable({ providedIn: 'root' })
export class FileProcessorContext {
  constructor(
    private peyoteStrategy: PeyoteShorthandStrategy,
    private pdfStrategy: PdfProcessorStrategy
  ) {}

  async processFile(file: File): Promise<Project> {
    const strategy = this.getStrategy(file);
    return await strategy.process(file);
  }

  private getStrategy(file: File): IFileProcessorStrategy {
    if (this.peyoteStrategy.canProcess(file)) {
      return this.peyoteStrategy;
    }
    if (this.pdfStrategy.canProcess(file)) {
      return this.pdfStrategy;
    }
    throw new Error(`Unsupported file type: ${file.type}`);
  }
}
```

**Usage**: File processing services (`PeyoteShorthandService`, `BeadToolPdfService`, `C2cCrochetShorthandService`).

### 5. Command Pattern

**Purpose**: Encapsulates a request as an object, allowing parameterization of clients with different requests.

**Implementation**:
```typescript
// Command interface
interface ICommand {
  execute(): Promise<void>;
  undo(): Promise<void>;
}

// Concrete commands
export class UpdatePositionCommand implements ICommand {
  constructor(
    private store: ReactiveStateStore,
    private newPosition: Position,
    private oldPosition: Position
  ) {}

  async execute(): Promise<void> {
    this.store.dispatch(ProjectActions.updatePosition({ position: this.newPosition }));
  }

  async undo(): Promise<void> {
    this.store.dispatch(ProjectActions.updatePosition({ position: this.oldPosition }));
  }
}

export class UpdateMarkModeCommand implements ICommand {
  constructor(
    private store: ReactiveStateStore,
    private newMode: MarkMode,
    private oldMode: MarkMode
  ) {}

  async execute(): Promise<void> {
    this.store.dispatch(MarkModeActions.updateMarkMode({ mode: this.newMode }));
  }

  async undo(): Promise<void> {
    this.store.dispatch(MarkModeActions.updateMarkMode({ mode: this.oldMode }));
  }
}

// Command invoker
@Injectable({ providedIn: 'root' })
export class CommandInvoker {
  private history: ICommand[] = [];
  private currentIndex = -1;

  async execute(command: ICommand): Promise<void> {
    await command.execute();
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(command);
    this.currentIndex++;
  }

  async undo(): Promise<void> {
    if (this.currentIndex >= 0) {
      const command = this.history[this.currentIndex];
      await command.undo();
      this.currentIndex--;
    }
  }

  async redo(): Promise<void> {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const command = this.history[this.currentIndex];
      await command.execute();
    }
  }
}
```

**Usage**: Used in `MarkModeService` for undo/redo functionality.

### 6. Null Object Pattern

**Purpose**: Provides a default object with neutral behavior to avoid null reference exceptions.

**Implementation**:
```typescript
// Abstract interface
interface IProject {
  id: number;
  name: string;
  rows: Row[];
  position: Position;
  isNull(): boolean;
}

// Real implementation
export class BeadProject implements IProject {
  constructor(
    public id: number,
    public name: string,
    public rows: Row[],
    public position: Position,
    public firstLastAppearanceMap: FLAM = {},
    public colorMapping: { [key: string]: string } = {},
    public image: ArrayBuffer | null = null
  ) {}

  isNull(): boolean {
    return false;
  }
}

// Null object implementation
export class NullProject implements IProject {
  id = -1;
  name = '';
  rows: Row[] = [];
  position = { row: 0, step: 0 };
  firstLastAppearanceMap = {};
  colorMapping = {};
  image = null;

  isNull(): boolean {
    return true;
  }

  toString(): string {
    return 'NullProject';
  }
}

// Usage in services
@Injectable({ providedIn: 'root' })
export class ProjectService {
  getCurrentProject(): IProject {
    const project = this.loadFromStorage();
    return project || new NullProject();
  }
}
```

**Usage**: Used in `NullProject` class to provide safe defaults.

### 7. Decorator Pattern

**Purpose**: Allows behavior to be added to objects dynamically without altering their structure.

**Implementation**:
```typescript
// Component interface
interface IValidationService {
  validate(data: unknown): ValidationResult;
}

// Concrete component
@Injectable({ providedIn: 'root' })
export class BaseValidationService implements IValidationService {
  validate(data: unknown): ValidationResult {
    return { isValid: true, errors: [] };
  }
}

// Decorator base class
abstract class ValidationDecorator implements IValidationService {
  constructor(protected component: IValidationService) {}

  validate(data: unknown): ValidationResult {
    return this.component.validate(data);
  }
}

// Concrete decorators
export class ProjectValidationDecorator extends ValidationDecorator {
  validate(data: unknown): ValidationResult {
    const result = super.validate(data);

    if (!ModelTypeGuards.isProject(data)) {
      result.isValid = false;
      result.errors.push('Invalid project structure');
    }

    return result;
  }
}

export class IntegrityCheckDecorator extends ValidationDecorator {
  validate(data: unknown): ValidationResult {
    const result = super.validate(data);

    if (result.isValid && ModelTypeGuards.isProject(data)) {
      // Perform integrity checks
      const integrityResult = this.checkIntegrity(data);
      if (!integrityResult.isValid) {
        result.isValid = false;
        result.errors.push(...integrityResult.errors);
      }
    }

    return result;
  }
}
```

**Usage**: Used in `DataIntegrityService` for layered validation.

### 8. Facade Pattern

**Purpose**: Provides a simplified interface to a complex subsystem.

**Implementation**:
```typescript
// Complex subsystem classes
class ProjectLoader { /* complex loading logic */ }
class ProjectValidator { /* complex validation logic */ }
class ProjectSaver { /* complex saving logic */ }
class ProjectNotifier { /* complex notification logic */ }

// Facade class
@Injectable({ providedIn: 'root' })
export class ProjectFacade {
  constructor(
    private loader: ProjectLoader,
    private validator: ProjectValidator,
    private saver: ProjectSaver,
    private notifier: ProjectNotifier
  ) {}

  async loadProject(id: number): Promise<Project> {
    try {
      const project = await this.loader.loadById(id);
      const validation = this.validator.validate(project);

      if (!validation.isValid) {
        throw new Error('Invalid project data');
      }

      this.notifier.notifySuccess('Project loaded successfully');
      return project;
    } catch (error) {
      this.notifier.notifyError('Failed to load project');
      throw error;
    }
  }

  async saveProject(project: Project): Promise<void> {
    try {
      const validation = this.validator.validate(project);

      if (!validation.isValid) {
        throw new Error('Invalid project data');
      }

      await this.saver.save(project);
      this.notifier.notifySuccess('Project saved successfully');
    } catch (error) {
      this.notifier.notifyError('Failed to save project');
      throw error;
    }
  }
}
```

**Usage**: Used in high-level services to simplify complex operations.

### 9. Builder Pattern

**Purpose**: Constructs complex objects step by step, allowing different representations using the same construction process.

**Implementation**:
```typescript
// Product class
export class Project {
  constructor(
    public id: number,
    public name: string,
    public rows: Row[],
    public position: Position,
    public firstLastAppearanceMap: FLAM = {},
    public colorMapping: { [key: string]: string } = {},
    public image: ArrayBuffer | null = null
  ) {}
}

// Builder interface
interface IProjectBuilder {
  setId(id: number): IProjectBuilder;
  setName(name: string): IProjectBuilder;
  addRow(row: Row): IProjectBuilder;
  setPosition(position: Position): IProjectBuilder;
  setColorMapping(mapping: { [key: string]: string }): IProjectBuilder;
  build(): Project;
}

// Concrete builder
export class ProjectBuilder implements IProjectBuilder {
  private id: number = 0;
  private name: string = '';
  private rows: Row[] = [];
  private position: Position = { row: 0, step: 0 };
  private firstLastAppearanceMap: FLAM = {};
  private colorMapping: { [key: string]: string } = {};
  private image: ArrayBuffer | null = null;

  setId(id: number): IProjectBuilder {
    this.id = id;
    return this;
  }

  setName(name: string): IProjectBuilder {
    this.name = name;
    return this;
  }

  addRow(row: Row): IProjectBuilder {
    this.rows.push(row);
    return this;
  }

  setPosition(position: Position): IProjectBuilder {
    this.position = position;
    return this;
  }

  setColorMapping(mapping: { [key: string]: string }): IProjectBuilder {
    this.colorMapping = mapping;
    return this;
  }

  build(): Project {
    return new BeadProject(
      this.id,
      this.name,
      this.rows,
      this.position,
      this.firstLastAppearanceMap,
      this.colorMapping,
      this.image
    );
  }
}

// Director class
export class ProjectDirector {
  constructor(private builder: IProjectBuilder) {}

  createBasicProject(name: string): Project {
    return this.builder
      .setId(Math.floor(Math.random() * 1000000))
      .setName(name)
      .setPosition({ row: 0, step: 0 })
      .build();
  }

  createProjectFromPattern(pattern: string): Project {
    const rows = this.parsePattern(pattern);

    return this.builder
      .setId(Math.floor(Math.random() * 1000000))
      .setName('Imported Project')
      .setPosition({ row: 0, step: 0 })
      .build();
  }
}
```

**Usage**: Used in file processing services for complex project construction.

### 10. Adapter Pattern

**Purpose**: Allows incompatible interfaces to work together by wrapping one interface with another.

**Implementation**:
```typescript
// Target interface (what the client expects)
interface IStorageService {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
}

// Adaptee (existing interface we need to adapt)
interface IIndexedDBService {
  put(storeName: string, data: any): Promise<void>;
  get(storeName: string, key: string): Promise<any>;
  remove(storeName: string, key: string): Promise<void>;
}

// Adapter class
@Injectable({ providedIn: 'root' })
export class IndexedDBAdapter implements IStorageService {
  constructor(private indexedDB: IIndexedDBService) {}

  async save(key: string, data: any): Promise<void> {
    await this.indexedDB.put('projects', { id: key, data });
  }

  async load(key: string): Promise<any> {
    const result = await this.indexedDB.get('projects', key);
    return result?.data;
  }

  async delete(key: string): Promise<void> {
    await this.indexedDB.remove('projects', key);
  }
}

// Usage
@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(private storage: IStorageService) {}

  async saveProject(project: Project): Promise<void> {
    await this.storage.save(project.id.toString(), project);
  }
}
```

**Usage**: Used to adapt IndexedDB API to simpler storage interfaces.

## Angular-Specific Patterns

### 1. Reactive Forms with Validation

**Implementation**:
```typescript
@Component({
  selector: 'app-project-form',
  template: `
    <form [formGroup]="projectForm" (ngSubmit)="onSubmit()">
      <mat-form-field>
        <mat-label>Project Name</mat-label>
        <input matInput formControlName="name" />
        <mat-error *ngIf="projectForm.get('name')?.hasError('required')">
          Name is required
        </mat-error>
      </mat-form-field>
    </form>
  `
})
export class ProjectFormComponent {
  projectForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['']
  });

  constructor(private fb: FormBuilder) {}

  onSubmit(): void {
    if (this.projectForm.valid) {
      const project = this.projectForm.value;
      // Process form data
    }
  }
}
```

### 2. Smart/Dumb Component Pattern

**Implementation**:
```typescript
// Smart component (container)
@Component({
  selector: 'app-project-container',
  template: `
    <app-project-display
      [project]="project$ | async"
      [loading]="loading$ | async"
      (projectUpdate)="onProjectUpdate($event)"
    ></app-project-display>
  `
})
export class ProjectContainerComponent {
  project$ = this.store.select(selectCurrentProject);
  loading$ = this.store.select(selectProjectLoading);

  constructor(private store: ReactiveStateStore) {}

  onProjectUpdate(project: Project): void {
    this.store.dispatch(ProjectActions.updateProject({ project }));
  }
}

// Dumb component (presentational)
@Component({
  selector: 'app-project-display',
  template: `
    <div *ngIf="!loading; else loadingTemplate">
      <h2>{{ project?.name }}</h2>
      <button (click)="onUpdate()">Update</button>
    </div>
    <ng-template #loadingTemplate>
      <mat-spinner></mat-spinner>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDisplayComponent {
  @Input() project: Project | null = null;
  @Input() loading: boolean = false;
  @Output() projectUpdate = new EventEmitter<Project>();

  onUpdate(): void {
    if (this.project) {
      this.projectUpdate.emit(this.project);
    }
  }
}
```

### 3. Service Composition

**Implementation**:
```typescript
@Injectable({ providedIn: 'root' })
export class ProjectManagementService {
  constructor(
    private projectService: ProjectService,
    private validationService: DataIntegrityService,
    private notificationService: NotificationService,
    private errorHandler: ErrorHandlerService
  ) {}

  async createProject(name: string, rows: Row[]): Promise<Project> {
    try {
      // Validate input
      const validation = await this.validationService.validateProjectName(name);
      if (!validation.isValid) {
        throw new Error('Invalid project name');
      }

      // Create project
      const project = await this.projectService.createProject(name, rows);

      // Notify success
      this.notificationService.success('Project created successfully');

      return project;
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'ProjectManagementService.createProject' });
      throw error;
    }
  }
}
```

## Best Practices

### 1. Pattern Selection Guidelines

- **Use Factory Pattern** for complex object creation with validation
- **Use Observer Pattern** for reactive state changes and notifications
- **Use Strategy Pattern** for interchangeable algorithms (file processing)
- **Use Command Pattern** for undo/redo functionality
- **Use Null Object Pattern** for safe default values
- **Use Facade Pattern** for simplifying complex subsystems

### 2. Implementation Guidelines

- **Single Responsibility**: Each pattern should solve one specific problem
- **Open/Closed Principle**: Patterns should be open for extension, closed for modification
- **Dependency Inversion**: Depend on abstractions, not concrete implementations
- **Interface Segregation**: Create specific interfaces for different use cases

### 3. Testing Patterns

- **Test concrete implementations**, not abstract interfaces
- **Use dependency injection** for easy mocking in tests
- **Test pattern interactions**, not just individual components
- **Create integration tests** for complex pattern compositions

### 4. Performance Considerations

- **Lazy initialization** for expensive pattern implementations
- **Caching strategies** for frequently accessed pattern results
- **Memory management** for patterns that hold references
- **Async patterns** for I/O operations and heavy computations

## See Also

- [Service Contracts]({{ site.baseurl }}/architecture/service-contracts) - API definitions
- [Architectural Decision Records]({{ site.baseurl }}/architecture/adrs) - Decision context
- [Component Patterns]({{ site.baseurl }}/architecture/component-patterns) - Angular-specific patterns
- [API Documentation]({{ site.baseurl }}/api/) - Complete JSDoc examples

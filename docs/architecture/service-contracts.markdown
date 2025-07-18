---
layout: default
title: Service Contracts and Interfaces
permalink: /architecture/service-contracts/
---

# Service Contracts and Interfaces

This document defines the contracts and interfaces for all major services in the Rowguide application, ensuring consistent APIs and clear separation of concerns.

## Core Service Architecture

### Service Layer Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│           (Components, Directives, Pipes)                   │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                        │
│        (Feature Services, Command/Query Services)           │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                           │
│           (Business Logic, Domain Services)                 │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│         (Data Services, External Integrations)              │
└─────────────────────────────────────────────────────────────┘
```

## Domain Service Contracts

### IProjectService

Core project management interface defining business operations.

```typescript
interface IProjectService {
  // Project Lifecycle
  createProject(name: string, rows: Row[]): Promise<Project>;
  loadProject(id: number): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;
  deleteProject(id: number): Promise<void>;

  // Project Operations
  updateProjectName(id: number, name: string): Promise<void>;
  updateProjectPosition(id: number, position: Position): Promise<void>;
  exportProject(id: number): Promise<Blob>;

  // Validation
  validateProject(project: Project): ValidationResult;

  // Events
  readonly projectChanged$: Observable<ProjectChangeEvent>;
}
```

**Implementation**: `ProjectService`
**Dependencies**: `ProjectDbService`, `DataIntegrityService`, `ReactiveStateStore`

### IStateStore

Centralized state management interface with Redux-like patterns.

```typescript
interface IStateStore<T> {
  // State Access
  getState(): T;
  select<K>(selector: (state: T) => K): Observable<K>;

  // State Mutation
  dispatch(action: Action): void;

  // Debugging
  getHistory(): StateHistory<T>;
  timeTravel(index: number): void;

  // Lifecycle
  destroy(): void;
}
```

**Implementation**: `ReactiveStateStore`
**State Shape**: `AppState`

### IDataIntegrityService

Data validation and integrity checking interface.

```typescript
interface IDataIntegrityService {
  // Validation
  validateProject(project: Project): ValidationResult;
  validateRow(row: Row): ValidationResult;
  validateStep(step: Step): ValidationResult;

  // Sanitization
  sanitizeProjectName(name: string): string;
  sanitizeStepDescription(description: string): string;

  // Integrity Checks
  checkProjectIntegrity(project: Project): IntegrityReport;
  repairProject(project: Project): Project;

  // Events
  readonly validationError$: Observable<ValidationError>;
}
```

**Implementation**: `DataIntegrityService`
**Used By**: All data manipulation services

## Infrastructure Service Contracts

### IDbService

Database abstraction interface for IndexedDB operations.

```typescript
interface IDbService<T> {
  // Connection Management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // CRUD Operations
  create(item: T): Promise<T>;
  read(id: number): Promise<T | null>;
  update(id: number, item: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;

  // Batch Operations
  createMany(items: T[]): Promise<T[]>;
  readMany(ids: number[]): Promise<(T | null)[]>;
  readAll(): Promise<T[]>;

  // Transactions
  transaction<R>(callback: (tx: IDBTransaction) => Promise<R>): Promise<R>;
}
```

**Implementation**: `ProjectDbService`, `MigrationDbService`
**Database**: IndexedDB with `RowguideDb` schema

### IFileProcessorService

File import and processing interface.

```typescript
interface IFileProcessorService {
  // Format Detection
  getSupportedFormats(): string[];
  detectFormat(content: string | ArrayBuffer): FileFormat;

  // Processing
  processFile(file: File): Promise<ProcessingResult>;
  validateFile(file: File): ValidationResult;

  // Conversion
  toProject(content: string | ArrayBuffer): Promise<Project>;

  // Error Handling
  readonly processingError$: Observable<ProcessingError>;
}
```

**Implementations**:
- `PeyoteShorthandService` - Peyote pattern text processing
- `BeadToolPdfService` - PDF pattern extraction
- `C2cCrochetShorthandService` - C2C crochet pattern processing

## Application Service Contracts

### IErrorHandlerService

Centralized error handling and recovery interface.

```typescript
interface IErrorHandlerService {
  // Error Handling
  handleError(error: Error, context: ErrorContext): void;
  handleCriticalError(error: Error, context: ErrorContext): void;

  // Recovery
  attemptRecovery(error: RecoverableError): Promise<boolean>;
  getRecoveryStrategy(error: Error): RecoveryStrategy;

  // Reporting
  reportError(error: Error, context: ErrorContext): void;
  getErrorHistory(): ErrorHistoryItem[];

  // Events
  readonly errorOccurred$: Observable<ErrorEvent>;
  readonly recoveryAttempted$: Observable<RecoveryEvent>;
}
```

**Implementation**: `ErrorHandlerService`
**Integration**: All services use this for error handling

### INotificationService

User notification and feedback interface.

```typescript
interface INotificationService {
  // Notification Types
  success(message: string, options?: NotificationOptions): void;
  error(message: string, options?: NotificationOptions): void;
  warning(message: string, options?: NotificationOptions): void;
  info(message: string, options?: NotificationOptions): void;

  // Queue Management
  queueNotification(notification: UiNotification): void;
  clearNotifications(): void;

  // Events
  readonly notificationQueued$: Observable<UiNotification>;
}
```

**Implementation**: `NotificationService`
**UI Integration**: `NotificationComponent`

## Utility Service Contracts

### IModelFactory

Safe object creation interface with validation.

```typescript
interface IModelFactory {
  // Creation Methods
  createProject(data?: Partial<Project>): Project;
  createRow(data?: Partial<Row>): Row;
  createStep(data?: Partial<Step>): Step;
  createPosition(data?: Partial<Position>): Position;

  // Validation
  validateProject(project: Project): boolean;
  validateRow(row: Row): boolean;
  validateStep(step: Step): boolean;
  validatePosition(position: Position): boolean;

  // Safe Access
  safeGetProject(value: unknown): Project | null;
  safeGetRow(value: unknown): Row | null;
  safeGetStep(value: unknown): Step | null;
  safeGetPosition(value: unknown): Position | null;
}
```

**Implementation**: `ModelFactory` utility
**Usage**: All services use this for object creation

### ITypeGuards

Runtime type checking interface.

```typescript
interface ITypeGuards {
  // Type Checking
  isProject(value: unknown): value is Project;
  isRow(value: unknown): value is Row;
  isStep(value: unknown): value is Step;
  isPosition(value: unknown): value is Position;

  // Validation
  isValidProject(project: Project): boolean;
  isValidRow(row: Row): boolean;
  isValidStep(step: Step): boolean;
  isValidPosition(position: Position): boolean;

  // Null Safety
  hasValidId(entity: { id?: number }): boolean;
  hasName(entity: { name?: string }): boolean;
  isEmptyProject(project: Project): boolean;
}
```

**Implementation**: `ModelTypeGuards` utility
**Usage**: All services use this for type safety

## Service Integration Patterns

### Dependency Injection

All services follow Angular's dependency injection patterns:

```typescript
@Injectable({ providedIn: 'root' })
export class ExampleService implements IExampleService {
  constructor(
    private readonly store: ReactiveStateStore,
    private readonly errorHandler: ErrorHandlerService,
    private readonly logger: NGXLogger
  ) {}
}
```

### Error Propagation

Services handle errors through the centralized error handler:

```typescript
async performOperation(): Promise<Result<T, Error>> {
  try {
    const result = await this.doWork();
    return Result.success(result);
  } catch (error) {
    this.errorHandler.handleError(error, {
      service: 'ExampleService',
      method: 'performOperation'
    });
    return Result.failure(error);
  }
}
```

### State Integration

Services interact with state through actions and selectors:

```typescript
// Dispatching actions
this.store.dispatch(ProjectActions.loadProject({ id }));

// Selecting state
const project$ = this.store.select(selectCurrentProject);
```

## Contract Testing

All service contracts are validated through:

1. **Interface Compliance**: TypeScript ensures implementation matches interface
2. **Unit Tests**: Each service has comprehensive test coverage
3. **Integration Tests**: End-to-end testing of service interactions
4. **Contract Tests**: Explicit testing of service contracts

## Migration and Versioning

Service contracts support evolution through:

- **Backward Compatibility**: New optional parameters and methods
- **Deprecation Warnings**: `@deprecated` JSDoc tags for removal planning
- **Version Interfaces**: Versioned interfaces for breaking changes
- **Migration Utilities**: Automated migration between contract versions

## See Also

- [Design Patterns]({{ site.baseurl }}/architecture/design-patterns) - Implementation patterns
- [API Documentation]({{ site.baseurl }}/api/) - Complete TypeScript API reference
- [Error Recovery Patterns]({{ site.baseurl }}/architecture/error-recovery-patterns) - Error handling strategies

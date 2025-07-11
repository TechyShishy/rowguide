---
applyTo: "**/*.ts"
---

# Rowguide Stack Guidelines

**Rowguide** uses Angular 20+ with a domain-driven architecture and reactive patterns. Focus on these stack-specific best practices when working with the codebase.

## Angular 20+ Patterns

### Component Architecture

```typescript
// ✅ Use OnPush change detection for performance
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatCardModule], // Import modules directly
})
export class MyComponent {
  // Use observables for reactive data flow
  data$ = this.service.getData();
}
```

### Change Detection & Async Operations

- **No setTimeout()**: Use proper Angular/RxJS mechanisms instead
  - Change detection: `ChangeDetectorRef.detectChanges()` or `markForCheck()`
  - Async operations: RxJS operators (`delay()`, `timer()`, `debounceTime()`)
  - DOM updates: `afterNextRender()` or lifecycle hooks
  - Testing delays: `tick()` in fakeAsync tests

### Module Imports

- **Direct imports**: Components import Angular Material modules directly in `imports` array
- **No NgModules**: Project uses Angular's modern standalone component pattern
- **Common patterns**: `CommonModule`, `FormsModule`, specific Material modules per component

## RxJS Reactive Patterns

### State Management

```typescript
// ✅ Use BehaviorSubject for stateful observables
export class MyService {
  private data$ = new BehaviorSubject<Data[]>([]);
  readonly dataStream$ = this.data$.asObservable();

  // Use Subject for events without initial value
  ready: Subject<boolean> = new Subject<boolean>();
}
```

### Observable Consumption

- **Async pipe**: Prefer `| async` in templates over manual subscriptions
- **switchMap**: Use for dependent API calls and data transformations
- **BehaviorSubject**: For state that needs current value access
- **Subject**: For event streams and notifications

## Angular Material Usage

### Component Import Pattern

```typescript
// ✅ Import specific Material modules per component
imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule];
```

### Common Material Components

- **MatBottomSheet**: Used for bead count display (`BeadCountBottomSheet`)
- **MatTable + MatSort**: For data tables with sorting
- **MatExpansion**: For collapsible content sections
- **MatCard**: Primary container component

## IndexedDB Data Persistence

### Service Pattern

```typescript
// ✅ Use IndexedDbService wrapper with type safety
export class ProjectDbService {
  async loadProjects(): Promise<Project[]> {
    const db = await this.indexedDbService.openDB();
    const projects = await db.getAll("projects");

    // Always validate data from IndexedDB
    return projects.filter(isValidProject);
  }
}
```

### Data Validation

- **Always validate**: Use type guards on data from IndexedDB
- **Error handling**: Log invalid data, filter out corrupted entries
- **Migration support**: Use `MigrationDbService` for schema updates

## TypeScript Patterns

### Type Guards

```typescript
// ✅ Use runtime type validation
if (isValidProject(data)) {
  // TypeScript knows data is Project type
  processProject(data);
}
```

### Null Safety

- **Type guards**: `isValidProject()`, `hasValidId()` for runtime validation
- **Model factories**: `ModelFactory.createProject()` for safe object creation
- **Safe access**: `SafeAccess.getProjectRows()` for null-aware property access

## Logging with ngx-logger

### Service Integration

```typescript
// ✅ Inject logger for structured logging
constructor(private logger: NGXLogger) {}

// Use appropriate log levels
this.logger.debug('Data loaded successfully');
this.logger.warn('Invalid data found:', invalidData);
this.logger.error('Operation failed:', error);
```

### Configuration

- **Debug level**: Set in `app.config.ts` via `LoggerModule.forRoot()`
- **Testing**: Use `LoggerTestingModule` in tests

## File Processing Stack

### PDF.js Integration

- **Worker setup**: PDF.js worker auto-copied to `/assets/` during build
- **Service pattern**: Use `PdfjslibService` for PDF parsing
- **Error handling**: Handle PDF corruption and parsing failures

### Compression with Pako

- **Data compression**: Use `pako` library for compressing large pattern data
- **Import pattern**: Import specific functions: `import { deflate, inflate } from 'pako'`

## Testing Patterns

### Service Testing

```typescript
// ✅ Use jasmine spies for dependencies
beforeEach(() => {
  const serviceSpy = jasmine.createSpyObj("ServiceName", ["method1", "method2"]);

  TestBed.configureTestingModule({
    providers: [{ provide: ServiceName, useValue: serviceSpy }],
  });
});
```

### Observable Testing

- **BehaviorSubject**: Create test subjects for reactive dependencies
- **Async testing**: Use `firstValueFrom()` for testing observable results
- **Error scenarios**: Test both success and error paths

## Performance Considerations

### Change Detection

- **OnPush strategy**: Required for all components handling large datasets
- **Immutable updates**: Update observables with new objects, not mutations
- **TrackBy functions**: Use for `*ngFor` with dynamic lists

### Memory Management

- **Unsubscribe**: Use `takeUntil()` pattern or async pipe to prevent leaks
- **Large data**: Use virtual scrolling for lists with 50+ items
- **Image handling**: Lazy load images and provide fallbacks

This stack emphasizes reactive programming, type safety, and performance through Angular's modern patterns combined with robust data persistence and validation.

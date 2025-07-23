---
applyTo: "**/*.ts"
---

# Rowguide Stack Guidelines - LLM Agent Instructions

## Angular 20+ Architecture

### Component Pattern (Required)
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, // Always use OnPush
  imports: [CommonModule, MatButtonModule, MatCardModule], // Direct imports only
})
export class MyComponent {
  data$ = this.service.getData(); // Reactive observables
}
```

### Critical Rules
- **NEVER use time-based change detection**: No `setTimeout()`, `debounceTime()`, `delay()` for DOM/change detection
- **Use event-driven mechanisms**: `ChangeDetectorRef.detectChanges()`, `afterNextRender()`, lifecycle hooks
- **Standalone components only**: No NgModules, direct Material module imports

## RxJS & State Management

### Observable Patterns
```typescript
// State with current value access
private data$ = new BehaviorSubject<Data[]>([]);
readonly dataStream$ = this.data$.asObservable();

// Events without initial value
ready: Subject<boolean> = new Subject<boolean>();
```

### Usage Rules
- **Templates**: Use `| async` pipe (avoid manual subscriptions)
- **API calls**: Use `switchMap` for dependent operations
- **Memory**: Use `takeUntil()` pattern or async pipe to prevent leaks

## TypeScript & Data Safety

### Type Guards & Validation
```typescript
// Always validate IndexedDB data
if (isValidProject(data)) {
  processProject(data); // TypeScript knows type
}

// Use safe factories and access
const project = ModelFactory.createProject();
const rows = SafeAccess.getProjectRows(project);
```

### Required Patterns
- **Runtime validation**: Type guards for all external data
- **Null safety**: Model factories over object literals
- **Safe access**: Utility functions over direct property access

## Key Dependencies

### Angular Material
- **Import per component**: `MatButtonModule`, `MatCardModule`, `MatTableModule`
- **Common components**: `MatBottomSheet`, `MatTable + MatSort`, `MatExpansion`

### Data & Logging
- **IndexedDB**: Via `IndexedDbService` wrapper with validation
- **Logging**: `NGXLogger` with appropriate levels (`debug`, `warn`, `error`)
- **Files**: PDF.js (worker auto-copied), Pako compression

## Testing Requirements
```typescript
// Service mocking
const serviceSpy = jasmine.createSpyObj("Service", ["method1"]);

// Observable testing
const result = await firstValueFrom(observable$);
```

### Test Rules
- **Spy all dependencies**: Use `jasmine.createSpyObj`
- **Test both paths**: Success and error scenarios
- **Async patterns**: `firstValueFrom()` for observable results

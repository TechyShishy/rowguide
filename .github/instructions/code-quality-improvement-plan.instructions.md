---
applyTo: "**"
---

# Rowguide Code Quality & Development Standards

## Project Overview

**Rowguide** is a sophisticated pattern tracking application built with Angular 20+, featuring enterprise-grade architecture with exceptional null safety practices. The application helps users track their progress through complex patterns (primarily peyote beading) with intuitive navigation and marking systems.

## Current Architecture Excellence

### Core Strengths to Preserve

- **Outstanding null safety**: Comprehensive type guards, safe factories (`ModelFactory`), and null-aware utilities (`SafeAccess`)
- **Domain-driven design**: Clean separation with layered architecture (Core → Data → Features → Shared)
- **Modern Angular patterns**: Standalone components, reactive programming with RxJS
- **Strong documentation**: Extensive JSDoc comments and architectural guides

### Key Domain Models

```typescript
// Core domain entities
interface Project {
  id: number;
  name: string;
  rows: Row[];
  position: Position;
  // Always use ModelFactory.createProject() for creation
}

interface Row {
  id: number;
  steps: Step[];
  // Use safe access: SafeAccess.getRowSteps(row)
}

interface Step {
  id: number;
  count: number;
  description: string;
}

interface Position {
  row: number;
  step: number;
}
```

## Code Quality Standards

### 1. Null Safety Requirements (Critical)

- **Always use type guards**: Implement comprehensive null checks
- **Use safe factories**: `ModelFactory.createProject()`, `ModelFactory.createRow()`
- **Implement safe access**: `SafeAccess.getProjectRows()`, `SafeAccess.getCurrentStep()`
- **Default values**: Use `DEFAULT_VALUES` constants throughout

```typescript
// ✅ Correct null-safe implementation
function updateProjectPosition(project: Project | null, position: Position): Project | null {
  if (!ModelTypeGuards.isValidProject(project)) {
    return null;
  }

  const currentRow = SafeAccess.getRowAtIndex(project, position.row);
  if (!currentRow) {
    return SafeAccess.createSafeProject(project);
  }

  return ModelFactory.updateProject(project, { position });
}

// ❌ Avoid direct property access
function badUpdate(project: any, position: any) {
  project.position = position; // No null checks, no type safety
  return project;
}
```

### 2. State Management Patterns

- **Use centralized store**: Implement Redux-like patterns with `ReactiveStateStore`
- **Command/Query separation**: Use CQRS pattern (`ProjectCommandService`, `ProjectQueryService`)
- **Event sourcing**: Track state changes with domain events
- **Optimistic updates**: Implement with rollback capability

```typescript
// ✅ Proper state management
@Injectable({ providedIn: "root" })
export class ProjectCommandService {
  constructor(private store: ReactiveStateStore, private eventBus: DomainEventBus) {}

  async updatePosition(command: UpdatePositionCommand): Promise<Result<Position, Error>> {
    // Optimistic update
    const optimisticAction = ProjectActions.updatePositionOptimistic(command.position);
    this.store.dispatch(optimisticAction);

    try {
      const result = await this.executeCommand(command);
      this.store.dispatch(ProjectActions.updatePositionSuccess(result));
      return Result.success(result);
    } catch (error) {
      this.store.dispatch(ProjectActions.updatePositionFailure(error));
      return Result.failure(error);
    }
  }
}
```

### 3. Component Standards

- **OnPush change detection**: Use `ChangeDetectionStrategy.OnPush` for all components
- **Virtual scrolling**: Implement for lists with 50+ items
- **TrackBy functions**: Always use for `*ngFor` loops
- **Error boundaries**: Wrap route components with error handling

```typescript
// ✅ Optimized component pattern
@Component({
  selector: "app-project",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cdk-virtual-scroll-viewport *ngIf="rows$ | async as rows">
      <app-row *cdkVirtualFor="let row of rows; trackBy: trackByRowId" [row]="row" [currentPosition]="currentPosition$ | async" (positionChange)="onPositionChange($event)"></app-row>
    </cdk-virtual-scroll-viewport>
  `,
})
export class ProjectComponent implements OnInit, OnDestroy {
  // Memoized observables
  rows$ = this.store.select(selectZippedRows).pipe(shareReplay(1), distinctUntilChanged(this.compareRows));

  // Optimized trackBy
  trackByRowId = (index: number, row: Row): number => row.id;

  private compareRows = (a: Row[], b: Row[]): boolean => {
    return a.length === b.length && a.every((row, idx) => row.id === b[idx]?.id);
  };
}
```

### 4. Error Handling Standards

- **Comprehensive error boundaries**: Implement `ErrorBoundaryComponent`
- **Error categorization**: Use structured error types (critical, recoverable, user)
- **Recovery strategies**: Provide retry mechanisms and fallback UI
- **Telemetry**: Log errors with context for debugging

```typescript
// ✅ Proper error handling
@Injectable({ providedIn: "root" })
export class ErrorHandlerService {
  handleError<T>(error: unknown, context: ErrorContext): ErrorResult<T> {
    const categorizedError = this.categorizeError(error);

    // Log with telemetry
    this.telemetryService.trackError(categorizedError, context);

    // Determine recovery strategy
    const recovery = this.getRecoveryStrategy(categorizedError);

    return {
      error: categorizedError,
      recovery,
      canRetry: recovery.retryable,
      userMessage: this.getUserFriendlyMessage(categorizedError),
    };
  }
}
```

### 5. Performance Requirements

- **60fps target**: Components must render under 16ms
- **Memory budgets**: No memory leaks, max 50MB heap growth
- **Bundle size**: Keep chunks under 200KB after compression
- **Core Web Vitals**: LCP < 1.5s, FID < 100ms, CLS < 0.1

```typescript
// ✅ Performance monitoring
@Injectable({ providedIn: "root" })
export class PerformanceMonitorService {
  @Memoize({ ttl: 30000 }) // Cache expensive calculations
  calculateProjectMetrics(project: Project): ProjectMetrics {
    const startTime = performance.now();

    const metrics = {
      totalSteps: SafeAccess.getProjectRows(project).reduce((sum, row) => sum + row.steps.length, 0),
      completionPercentage: this.calculateCompletion(project),
    };

    const duration = performance.now() - startTime;
    this.trackCalculation("project-metrics", duration);

    return metrics;
  }
}
```

### 6. Testing Standards

- **95%+ unit test coverage**: All services and components
- **Integration tests**: Test complete user workflows
- **Accessibility tests**: Automated WCAG 2.1 AAA compliance
- **Performance tests**: Regression testing with budgets
- **Contract tests**: Validate service interfaces

```typescript
// ✅ Comprehensive testing pattern
describe("ProjectService Integration", () => {
  let service: ProjectService;
  let testBuilder: TestDataBuilder;

  beforeEach(() => {
    testBuilder = new TestDataBuilder();
    service = TestBed.inject(ProjectService);
  });

  it("should handle complex project operations", async () => {
    const project = testBuilder.createComplexProject();

    // Test with performance monitoring
    const performanceHelper = new PerformanceTestHelper();
    const metrics = await performanceHelper.measureOperation(async () => {
      const result = await service.saveProject(project);
      expect(result).toBeDefined();
      expect(ModelTypeGuards.isValidProject(result)).toBe(true);
    });

    expect(metrics.duration).toBeLessThan(100); // Performance budget
  });

  it("should pass accessibility requirements", async () => {
    const fixture = TestBed.createComponent(ProjectComponent);
    const axeHelper = new AxeTestHelper();

    fixture.detectChanges();
    const violations = await axeHelper.runAxeTest(fixture.nativeElement);

    expect(violations).toHaveLength(0);
  });
});
```

## Development Workflow

### 1. Feature Development Process

1. **Start with tests**: Write failing tests first (TDD approach)
2. **Implement null-safe**: Use type guards and safe factories
3. **Add error handling**: Implement comprehensive error boundaries
4. **Performance check**: Validate against performance budgets
5. **Accessibility audit**: Run automated a11y tests

### 2. Code Review Checklist

- [ ] Null safety implementations using established patterns
- [ ] Error handling with recovery strategies
- [ ] Performance optimizations (OnPush, trackBy, memoization)
- [ ] Accessibility compliance (ARIA, keyboard navigation)
- [ ] Test coverage and quality
- [ ] Documentation updates

### 3. Architecture Decision Guidelines

- **State management**: Use centralized store with CQRS patterns
- **Component communication**: Prefer observables over direct property binding
- **Error handling**: Implement at multiple layers (service, component, boundary)
- **Performance**: Prioritize user experience (60fps, fast loading)
- **Accessibility**: Design for all users from the start

## File Organization

```
src/app/
├── core/                    # Singleton services, guards, interceptors
│   ├── store/              # State management (ReactiveStateStore)
│   ├── commands/           # CQRS command handlers
│   ├── events/             # Event sourcing and domain events
│   ├── services/           # Core business services
│   └── aggregates/         # Domain aggregates
├── data/                   # Data access layer
│   ├── services/           # Data services (ProjectDbService)
│   └── models/             # Data models and factories
├── features/               # Feature modules
│   ├── project-management/ # Project CRUD operations
│   └── pattern-tracking/   # Pattern navigation and marking
├── shared/                 # Shared components and utilities
│   ├── components/         # Reusable UI components
│   ├── services/           # Utility services
│   └── utilities/          # Helper functions and type guards
└── testing/               # Test utilities and builders
```

## When Writing New Code

### Always Consider:

1. **Null safety**: Can this value be null/undefined? Use appropriate guards
2. **Error scenarios**: What can fail? How do we recover gracefully?
3. **Performance impact**: Will this affect rendering or memory usage?
4. **Accessibility**: Is this usable with keyboard/screen readers?
5. **Testing**: How will this be tested? What edge cases exist?

### Prefer These Patterns:

- **Type guards over type assertions**: `ModelTypeGuards.isValidProject(x)` vs `x as Project`
- **Safe access over direct property access**: `SafeAccess.getRowSteps(row)` vs `row.steps`
- **Factory functions over object literals**: `ModelFactory.createProject()` vs `{ id: 1, ... }`
- **Observable streams over imperative code**: Reactive patterns with RxJS
- **Memoization for expensive operations**: Use `@Memoize` decorator

### Avoid These Antipatterns:

- Direct DOM manipulation (use Angular's reactive patterns)
- Unhandled null/undefined access
- Missing error boundaries or recovery strategies
- Synchronous operations that could block the UI
- Hard-coded values without proper configuration

This codebase represents enterprise-grade Angular development with exceptional attention to reliability, performance, and user experience. Maintain these standards while implementing the enhancement phases outlined in the code quality improvement plan.

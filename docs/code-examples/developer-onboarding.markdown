---
layout: page
title: Developer Onboarding Guide
permalink: /code-examples/developer-onboarding/
---

# Developer Onboarding Guide

Welcome to Rowguide development! This comprehensive guide will get you up and running with the codebase, development workflow, and key architectural patterns.

## Table of Contents

1. [Quick Start Setup](#quick-start-setup)
2. [Project Architecture Overview](#project-architecture-overview)
3. [Development Workflow](#development-workflow)
4. [Essential Patterns & Utilities](#essential-patterns--utilities)
5. [Testing Guidelines](#testing-guidelines)
6. [Common Development Tasks](#common-development-tasks)
7. [Debugging & Troubleshooting](#debugging--troubleshooting)

## Quick Start Setup

### Prerequisites

- **Node.js** 18+ and **Yarn** 4.9.2+
- **Git** for version control
- **VS Code** (recommended IDE)

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/TechyShishy/rowguide.git
cd rowguide

# 2. Install dependencies
yarn install

# 3. Start development server (runs on http://localhost:4200)
yarn start

# 4. Run tests to verify setup
yarn test
```

### Development Environment Verification

```bash
# Verify all systems are working
yarn workspace rowguide test --browsers=ChromeHeadless --watch=false

# Should see: "737/737 tests passing (100% success rate)"
```

## Project Architecture Overview

Rowguide follows **enterprise-grade Angular architecture** with exceptional null safety practices:

```
src/app/
├── core/                    # Singleton services, guards, interceptors
│   ├── store/              # ReactiveStateStore (Redux-like state management)
│   ├── commands/           # CQRS command handlers
│   ├── events/             # Event sourcing and domain events
│   └── services/           # Core business services
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

### Key Architectural Principles

1. **Null Safety First**: Every operation uses type guards and safe factories
2. **Reactive Programming**: RxJS streams throughout with proper subscription management
3. **CQRS Pattern**: Separated command/query responsibilities
4. **Domain-Driven Design**: Clear domain boundaries and models
5. **Performance-Optimized**: OnPush change detection, virtual scrolling, memoization

## Development Workflow

### 1. Feature Development Process

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes following architectural patterns
# 3. Run tests continuously
yarn workspace rowguide test --watch

# 4. Build and validate
yarn workspace rowguide build

# 5. Commit with meaningful messages
git commit -m "feat: add pattern validation service

- Implement comprehensive pattern validation
- Add type guards for pattern data
- Include error recovery mechanisms"
```

### 2. Code Quality Requirements

- **100% test pass rate** before commit
- **Type safety**: Use type guards, never `any` types
- **Null safety**: Use `ModelFactory` and `SafeAccess` utilities
- **Performance**: OnPush change detection, trackBy functions
- **Documentation**: JSDoc for all public APIs

## Essential Patterns & Utilities

### 1. Null-Safe Data Creation

```typescript
// ✅ ALWAYS use ModelFactory for object creation
import { ModelFactory, DEFAULT_VALUES } from '@shared/utilities';

// Create safe project
const project = ModelFactory.createProject({
  name: 'My Pattern',
  rows: [
    ModelFactory.createRow({
      steps: [
        ModelFactory.createStep({ count: 5, description: 'Red' })
      ]
    })
  ]
});

// ❌ NEVER create objects directly
const badProject = { id: 1, name: 'Bad' }; // Missing required properties
```

### 2. Safe Property Access

```typescript
// ✅ Use SafeAccess for null-safe property access
import { SafeAccess } from '@shared/utilities';

function processProject(project: Project | null): void {
  const rows = SafeAccess.getProjectRows(project); // Returns Row[] or []
  const name = SafeAccess.getProjectName(project); // Returns string or ''
  
  // Safe to iterate
  rows.forEach(row => {
    const steps = SafeAccess.getRowSteps(row);
    // Process steps...
  });
}

// ❌ NEVER access properties directly
function badProcessProject(project: any): void {
  project.rows.forEach(...); // Will crash if project is null
}
```

### 3. Type Guards for Runtime Safety

```typescript
// ✅ Always validate data with type guards
import { ModelTypeGuards } from '@shared/utilities';

function updateProject(data: unknown): Result<Project, Error> {
  if (!ModelTypeGuards.isValidProject(data)) {
    return Result.failure(new Error('Invalid project data'));
  }
  
  // TypeScript now knows data is Project
  return Result.success(this.processProject(data));
}
```

### 4. State Management Integration

```typescript
// ✅ Service integration with ReactiveStateStore
@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(
    private store: ReactiveStateStore,
    private errorHandler: ErrorHandlerService
  ) {}

  async saveProject(project: Project): Promise<Result<Project, Error>> {
    try {
      // Optimistic update
      this.store.dispatch(ProjectActions.saveProjectStart(project));
      
      const result = await this.projectDb.save(project);
      
      this.store.dispatch(ProjectActions.saveProjectSuccess(result));
      return Result.success(result);
    } catch (error) {
      this.store.dispatch(ProjectActions.saveProjectFailure(error));
      this.errorHandler.handleError(error, { operation: 'saveProject' });
      return Result.failure(error);
    }
  }
}
```

## Testing Guidelines

### 1. Test Structure & Setup

```typescript
// ✅ Comprehensive test setup
describe('ProjectService', () => {
  let service: ProjectService;
  let mockStore: jasmine.SpyObj<ReactiveStateStore>;
  let testBuilder: TestDataBuilder;

  beforeEach(async () => {
    const mockStoreObj = jasmine.createSpyObj('ReactiveStateStore', [
      'dispatch', 'select', 'getState'
    ]);

    await TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: ReactiveStateStore, useValue: mockStoreObj }
      ]
    }).compileComponents();

    service = TestBed.inject(ProjectService);
    mockStore = TestBed.inject(ReactiveStateStore) as jasmine.SpyObj<ReactiveStateStore>;
    testBuilder = new TestDataBuilder();
  });

  it('should handle project saving with null safety', async () => {
    const project = testBuilder.createValidProject();
    
    const result = await service.saveProject(project);
    
    expect(result.isSuccess()).toBe(true);
    expect(mockStore.dispatch).toHaveBeenCalledWith(
      jasmine.objectContaining({ type: 'SAVE_PROJECT_START' })
    );
  });
});
```

### 2. Testing Utilities Usage

```typescript
// ✅ Test type guards and factories
describe('ModelFactory', () => {
  it('should create safe projects with all required properties', () => {
    const project = ModelFactory.createProject();
    
    expect(ModelTypeGuards.isValidProject(project)).toBe(true);
    expect(project.rows).toEqual([]);
    expect(project.position).toEqual(DEFAULT_VALUES.position());
  });

  it('should handle invalid input gracefully', () => {
    const result = ModelFactory.createProject(null as any);
    
    expect(ModelTypeGuards.isValidProject(result)).toBe(true);
    expect(result.name).toBe('');
  });
});
```

## Common Development Tasks

### 1. Adding a New Service

```typescript
// 1. Create service with proper patterns
@Injectable({ providedIn: 'root' })
export class MyNewService {
  constructor(
    private store: ReactiveStateStore,
    private errorHandler: ErrorHandlerService,
    private dataIntegrity: DataIntegrityService
  ) {}

  async processData(input: unknown): Promise<Result<ProcessedData, Error>> {
    // 1. Validate input
    if (!this.dataIntegrity.validateInput(input)) {
      return Result.failure(new Error('Invalid input'));
    }

    try {
      // 2. Process safely
      const result = this.safeProcess(input as ValidInput);
      
      // 3. Update state
      this.store.dispatch(MyActions.processSuccess(result));
      
      return Result.success(result);
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'processData' });
      return Result.failure(error);
    }
  }
}
```

### 2. Creating Components

```typescript
// ✅ Component with proper patterns
@Component({
  selector: 'app-my-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="data$ | async as data; else loadingTemplate">
      <div *ngFor="let item of data; trackBy: trackById">
        {{ item.name }}
      </div>
    </div>
    <ng-template #loadingTemplate>Loading...</ng-template>
  `
})
export class MyComponent implements OnInit {
  data$ = this.store.select(selectMyData).pipe(
    shareReplay(1),
    catchError(error => {
      this.errorHandler.handleError(error, { component: 'MyComponent' });
      return of([]);
    })
  );

  constructor(
    private store: ReactiveStateStore,
    private errorHandler: ErrorHandlerService
  ) {}

  trackById = (index: number, item: { id: number }): number => item.id;
}
```

### 3. State Management Integration

```typescript
// 1. Define actions
export const MyActions = {
  loadData: () => ({ type: 'LOAD_DATA' } as const),
  loadDataSuccess: (data: MyData[]) => ({ 
    type: 'LOAD_DATA_SUCCESS', 
    payload: data 
  } as const),
  loadDataFailure: (error: Error) => ({ 
    type: 'LOAD_DATA_FAILURE', 
    payload: error 
  } as const)
};

// 2. Create selectors
export const selectMyData = (state: AppState) => state.myFeature.data;
export const selectMyDataLoading = (state: AppState) => state.myFeature.loading;

// 3. Implement reducer
export function myReducer(
  state: MyState = initialState,
  action: MyAction
): MyState {
  switch (action.type) {
    case 'LOAD_DATA_SUCCESS':
      return {
        ...state,
        data: action.payload,
        loading: false,
        error: null
      };
    default:
      return state;
  }
}
```

## Debugging & Troubleshooting

### 1. Common Issues & Solutions

**Issue: "Cannot read property 'x' of null"**
```typescript
// ❌ Problem
const name = project.name; // Crashes if project is null

// ✅ Solution
const name = SafeAccess.getProjectName(project); // Safe fallback
```

**Issue: "Type 'unknown' is not assignable to type 'Project'"**
```typescript
// ❌ Problem
const project: Project = data; // No runtime validation

// ✅ Solution
if (ModelTypeGuards.isValidProject(data)) {
  const project: Project = data; // TypeScript knows it's safe
}
```

### 2. Development Tools

```bash
# Run tests with debugging
yarn workspace rowguide test --browsers=Chrome

# Build with analysis
yarn workspace rowguide build --verbose

# Check bundle size
yarn workspace rowguide run ng build --analyze
```

### 3. State Debugging

```typescript
// Debug state changes
this.store.getActions$().subscribe(action => {
  console.log('Action dispatched:', action);
});

// Debug state history
const history = this.store.getStateHistory();
console.log('State history:', history);
```

## Next Steps

1. **Explore the codebase**: Start with `src/app/core/services/` to understand key services
2. **Run the test suite**: `yarn test` to see comprehensive testing patterns
3. **Build a feature**: Try adding a simple service following the patterns above
4. **Read architecture docs**: Check `/docs/architecture/` for detailed design decisions
5. **Join development**: Review `/docs/code-quality-improvement-plan.md` for current priorities

## Additional Resources

- [Code Quality Standards](/code-quality-improvement-plan/)
- [Testing Strategy](/code-examples/testing-strategy/)
- [Type Guards & Utilities](/code-examples/type-guards-utilities/)
- [Error Handling Patterns](/code-examples/error-handling/)
- [Architecture Documentation](/architecture/)

---

*This guide represents the current state of Rowguide development practices. Always refer to the latest implementation checklist for current priorities and architectural decisions.*

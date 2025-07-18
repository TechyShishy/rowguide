---
layout: default
title: Type Guards and Utilities Code Examples
permalink: /code-examples/type-guards-utilities/
---

# Type Guards and Utilities Code Examples

Comprehensive examples demonstrating Rowguide's type safety utilities, safe access patterns, and null safety implementations.

## Type Guards Overview

Type guards provide runtime type checking to ensure null safety and type correctness throughout the application.

```typescript
// Core Type Guard Functions
function isProject(obj: unknown): obj is Project {
  return typeof obj === 'object' && obj !== null &&
         'id' in obj && 'name' in obj && 'rows' in obj;
}

function isRow(obj: unknown): obj is Row {
  return typeof obj === 'object' && obj !== null &&
         'id' in obj && 'steps' in obj && Array.isArray((obj as any).steps);
}

function isStep(obj: unknown): obj is Step {
  return typeof obj === 'object' && obj !== null &&
         'id' in obj && 'count' in obj && 'description' in obj;
}

function isPosition(obj: unknown): obj is Position {
  return typeof obj === 'object' && obj !== null &&
         'row' in obj && 'step' in obj &&
         typeof (obj as any).row === 'number' &&
         typeof (obj as any).step === 'number';
}
```

## Basic Type Guard Usage

### 1. Service Integration Patterns

```typescript
@Injectable({ providedIn: 'root' })
export class SafeProjectService {
  constructor(private errorHandler: ErrorHandlerService) {}

  updateProject(projectData: unknown): Project | null {
    // Type guard validation
    if (!isProject(projectData)) {
      this.errorHandler.handleError(new Error('Invalid project data'), {
        operation: 'updateProject',
        context: { receivedType: typeof projectData }
      });
      return null;
    }

    // TypeScript now knows projectData is Project
    return this.processProject(projectData);
  }

  private processProject(project: Project): Project {
    // Safe to access project properties
    return {
      ...project,
      rows: project.rows.filter(row => isRow(row))
    };
  }
}
```

### 2. Component Integration

```typescript
@Component({
  selector: 'app-safe-project-display',
  template: `
    <div *ngIf="validProject; else invalidTemplate">
      <h2>{{ validProject.name }}</h2>
      <div *ngFor="let row of validProject.rows">
        <app-row-display [row]="row"></app-row-display>
      </div>
    </div>

    <ng-template #invalidTemplate>
      <div class="error">Invalid project data</div>
    </ng-template>
  `
})
export class SafeProjectDisplayComponent implements OnInit {
  @Input()
  set projectData(value: unknown) {
    this.validProject = isProject(value) ? value : null;
  }

  validProject: Project | null = null;

  ngOnInit() {
    if (!this.validProject) {
      console.warn('Component received invalid project data');
    }
  }
}
```

## Advanced Type Guard Patterns

### 3. Composite Type Guards

```typescript
// Advanced type checking with comprehensive validation
export class ModelTypeGuards {
  static isValidProject(obj: unknown): obj is Project {
    if (!isProject(obj)) return false;

    // Additional validation
    return obj.id > 0 &&
           obj.name.trim().length > 0 &&
           Array.isArray(obj.rows) &&
           obj.rows.every(row => this.isValidRow(row));
  }

  static isValidRow(obj: unknown): obj is Row {
    if (!isRow(obj)) return false;

    return obj.id > 0 &&
           Array.isArray(obj.steps) &&
           obj.steps.length > 0 &&
           obj.steps.every(step => this.isValidStep(step));
  }

  static isValidStep(obj: unknown): obj is Step {
    if (!isStep(obj)) return false;

    return obj.id > 0 &&
           obj.count > 0 &&
           obj.description.trim().length > 0;
  }

  static isValidPosition(obj: unknown, project?: Project): obj is Position {
    if (!isPosition(obj)) return false;

    if (project) {
      return obj.row >= 0 &&
             obj.row < project.rows.length &&
             obj.step >= 0 &&
             obj.step < (project.rows[obj.row]?.steps.length || 0);
    }

    return obj.row >= 0 && obj.step >= 0;
  }
}
```

### 4. Type Guard with Error Recovery

```typescript
@Injectable({ providedIn: 'root' })
export class TypeSafeDataService {
  constructor(private errorHandler: ErrorHandlerService) {}

  loadProjectSafely(data: unknown): Project | null {
    try {
      // Attempt type validation
      if (ModelTypeGuards.isValidProject(data)) {
        return data;
      }

      // Attempt data repair
      const repairedData = this.attemptDataRepair(data);
      if (ModelTypeGuards.isValidProject(repairedData)) {
        this.errorHandler.handleError(new Error('Data repaired during load'), {
          operation: 'loadProjectSafely',
          severity: 'warning',
          context: { repaired: true }
        });
        return repairedData;
      }

      throw new Error('Unable to repair project data');
    } catch (error) {
      this.errorHandler.handleError(error, {
        operation: 'loadProjectSafely',
        severity: 'error',
        context: { originalData: data }
      });
      return null;
    }
  }

  private attemptDataRepair(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return DEFAULT_VALUES.project();
    }

    const obj = data as any;

    // Repair missing or invalid properties
    return {
      id: typeof obj.id === 'number' && obj.id > 0 ? obj.id : Date.now(),
      name: typeof obj.name === 'string' && obj.name.trim() ? obj.name : 'Untitled Project',
      rows: Array.isArray(obj.rows) ? obj.rows.filter(row => isRow(row)) : [],
      position: ModelTypeGuards.isValidPosition(obj.position) ? obj.position : { row: 0, step: 0 }
    };
  }
}
```

## Safe Access Utilities

### 5. Safe Property Access

```typescript
export class SafeAccess {
  // Project property access
  static getProjectId(project: unknown): number | null {
    return isProject(project) ? project.id : null;
  }

  static getProjectName(project: unknown): string {
    return isProject(project) ? project.name : 'Unknown Project';
  }

  static getProjectRows(project: unknown): Row[] {
    return isProject(project) ? project.rows : [];
  }

  static getProjectPosition(project: unknown): Position | null {
    return isProject(project) ? project.position : null;
  }

  // Row property access
  static getRowId(row: unknown): number | null {
    return isRow(row) ? row.id : null;
  }

  static getRowSteps(row: unknown): Step[] {
    return isRow(row) ? row.steps : [];
  }

  static getRowStepCount(row: unknown): number {
    return isRow(row) ? row.steps.length : 0;
  }

  // Step property access
  static getStepId(step: unknown): number | null {
    return isStep(step) ? step.id : null;
  }

  static getStepCount(step: unknown): number {
    return isStep(step) ? step.count : 0;
  }

  static getStepDescription(step: unknown): string {
    return isStep(step) ? step.description : 'Unknown Step';
  }

  // Position property access
  static getPositionRow(position: unknown): number {
    return isPosition(position) ? position.row : 0;
  }

  static getPositionStep(position: unknown): number {
    return isPosition(position) ? position.step : 0;
  }

  // Advanced safe access patterns
  static getStepAtPosition(project: unknown, position: unknown): Step | null {
    if (!isProject(project) || !isPosition(position)) {
      return null;
    }

    const row = project.rows[position.row];
    if (!isRow(row)) {
      return null;
    }

    const step = row.steps[position.step];
    return isStep(step) ? step : null;
  }

  static getRowAtIndex(project: unknown, index: number): Row | null {
    if (!isProject(project) || index < 0 || index >= project.rows.length) {
      return null;
    }

    const row = project.rows[index];
    return isRow(row) ? row : null;
  }

  static createSafeProject(data: unknown): Project {
    if (isProject(data)) {
      return data;
    }

    return DEFAULT_VALUES.project();
  }
}
```

### 6. Chained Safe Access

```typescript
// Utility for chained safe property access
export class ChainedAccess {
  static getNestedValue<T>(
    obj: unknown,
    path: string[],
    defaultValue: T,
    validator?: (value: unknown) => value is T
  ): T {
    let current = obj;

    for (const key of path) {
      if (typeof current !== 'object' || current === null || !(key in current)) {
        return defaultValue;
      }
      current = (current as any)[key];
    }

    if (validator && !validator(current)) {
      return defaultValue;
    }

    return current as T;
  }

  // Usage examples
  static getProjectStepDescription(project: unknown, rowIndex: number, stepIndex: number): string {
    return this.getNestedValue(
      project,
      ['rows', rowIndex.toString(), 'steps', stepIndex.toString(), 'description'],
      'Unknown',
      (value): value is string => typeof value === 'string'
    );
  }

  static getProjectRowCount(project: unknown): number {
    return this.getNestedValue(
      project,
      ['rows', 'length'],
      0,
      (value): value is number => typeof value === 'number'
    );
  }
}
```

## Model Factory Patterns

### 7. Safe Object Creation

```typescript
export class ModelFactory {
  static createStep(data: Partial<Step> = {}): Step {
    return {
      id: data.id || this.generateId(),
      count: Math.max(1, data.count || 1),
      description: data.description?.trim() || 'Unknown Step'
    };
  }

  static createRow(data: Partial<Row> = {}): Row {
    const steps = Array.isArray(data.steps)
      ? data.steps.filter(step => isStep(step))
      : [];

    return {
      id: data.id || this.generateId(),
      steps: steps.length > 0 ? steps : [this.createStep()]
    };
  }

  static createProject(data: Partial<Project> = {}): Project {
    const rows = Array.isArray(data.rows)
      ? data.rows.filter(row => isRow(row))
      : [];

    return {
      id: data.id || this.generateId(),
      name: data.name?.trim() || 'Untitled Project',
      rows: rows.length > 0 ? rows : [this.createRow()],
      position: data.position || { row: 0, step: 0 },
      firstLastAppearanceMap: data.firstLastAppearanceMap || {},
      colorMapping: data.colorMapping || {},
      image: data.image || null
    };
  }

  static createPosition(data: Partial<Position> = {}): Position {
    return {
      row: Math.max(0, data.row || 0),
      step: Math.max(0, data.step || 0)
    };
  }

  static updateProject(project: Project, updates: Partial<Project>): Project {
    if (!isProject(project)) {
      throw new Error('Invalid project provided for update');
    }

    return {
      ...project,
      ...updates,
      rows: updates.rows ? updates.rows.filter(row => isRow(row)) : project.rows
    };
  }

  private static generateId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }
}
```

### 8. Default Values Pattern

```typescript
export class DEFAULT_VALUES {
  static step(overrides: Partial<Step> = {}): Step {
    return {
      id: Date.now(),
      count: 1,
      description: 'New Step',
      ...overrides
    };
  }

  static row(overrides: Partial<Row> = {}): Row {
    return {
      id: Date.now(),
      steps: [this.step()],
      ...overrides
    };
  }

  static project(overrides: Partial<Project> = {}): Project {
    return {
      id: Date.now(),
      name: 'New Project',
      rows: [this.row()],
      position: this.position(),
      firstLastAppearanceMap: {},
      colorMapping: {},
      image: null,
      ...overrides
    };
  }

  static position(overrides: Partial<Position> = {}): Position {
    return {
      row: 0,
      step: 0,
      ...overrides
    };
  }
}
```

## Testing Type Guards

### 9. Type Guard Testing Patterns

```typescript
describe('Type Guards', () => {
  describe('isProject', () => {
    it('should validate valid project objects', () => {
      const validProject = {
        id: 1,
        name: 'Test Project',
        rows: [],
        position: { row: 0, step: 0 }
      };

      expect(isProject(validProject)).toBe(true);
    });

    it('should reject invalid project objects', () => {
      const invalidCases = [
        null,
        undefined,
        {},
        { id: 1 },
        { name: 'Test' },
        { id: '1', name: 'Test', rows: [] }
      ];

      invalidCases.forEach(testCase => {
        expect(isProject(testCase)).toBe(false);
      });
    });
  });

  describe('ModelTypeGuards.isValidProject', () => {
    it('should validate project with valid rows', () => {
      const project = {
        id: 1,
        name: 'Test Project',
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 2, description: 'Red' }
            ]
          }
        ]
      };

      expect(ModelTypeGuards.isValidProject(project)).toBe(true);
    });

    it('should reject project with invalid rows', () => {
      const project = {
        id: 1,
        name: 'Test Project',
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 0, description: '' } // Invalid step
            ]
          }
        ]
      };

      expect(ModelTypeGuards.isValidProject(project)).toBe(false);
    });
  });
});
```

### 10. Safe Access Testing

```typescript
describe('SafeAccess', () => {
  const validProject = {
    id: 1,
    name: 'Test Project',
    rows: [
      {
        id: 1,
        steps: [
          { id: 1, count: 2, description: 'Red' },
          { id: 2, count: 1, description: 'Blue' }
        ]
      }
    ],
    position: { row: 0, step: 1 }
  };

  describe('getProjectName', () => {
    it('should return project name for valid project', () => {
      expect(SafeAccess.getProjectName(validProject)).toBe('Test Project');
    });

    it('should return default for invalid project', () => {
      expect(SafeAccess.getProjectName(null)).toBe('Unknown Project');
      expect(SafeAccess.getProjectName({})).toBe('Unknown Project');
    });
  });

  describe('getStepAtPosition', () => {
    it('should return step at valid position', () => {
      const step = SafeAccess.getStepAtPosition(validProject, { row: 0, step: 1 });
      expect(step).toEqual({ id: 2, count: 1, description: 'Blue' });
    });

    it('should return null for invalid position', () => {
      expect(SafeAccess.getStepAtPosition(validProject, { row: 0, step: 5 })).toBe(null);
      expect(SafeAccess.getStepAtPosition(validProject, { row: 5, step: 0 })).toBe(null);
    });

    it('should return null for invalid project', () => {
      expect(SafeAccess.getStepAtPosition(null, { row: 0, step: 0 })).toBe(null);
      expect(SafeAccess.getStepAtPosition({}, { row: 0, step: 0 })).toBe(null);
    });
  });
});
```

## Integration with State Management

### 11. Type-Safe State Updates

```typescript
// Type-safe state update patterns
export class TypeSafeStateUpdates {
  static updateProjectPosition(
    state: ProjectState,
    projectId: number,
    newPosition: unknown
  ): ProjectState {
    // Validate position
    if (!isPosition(newPosition)) {
      return state;
    }

    const project = state.entities[projectId];
    if (!isProject(project)) {
      return state;
    }

    // Validate position bounds
    if (!ModelTypeGuards.isValidPosition(newPosition, project)) {
      return state;
    }

    return {
      ...state,
      entities: {
        ...state.entities,
        [projectId]: {
          ...project,
          position: newPosition
        }
      }
    };
  }

  static addStepToRow(
    state: ProjectState,
    projectId: number,
    rowIndex: number,
    stepData: unknown
  ): ProjectState {
    const project = state.entities[projectId];
    if (!isProject(project)) {
      return state;
    }

    const row = SafeAccess.getRowAtIndex(project, rowIndex);
    if (!row) {
      return state;
    }

    const newStep = isStep(stepData) ? stepData : DEFAULT_VALUES.step();

    return {
      ...state,
      entities: {
        ...state.entities,
        [projectId]: {
          ...project,
          rows: project.rows.map((r, idx) =>
            idx === rowIndex
              ? { ...r, steps: [...r.steps, newStep] }
              : r
          )
        }
      }
    };
  }
}
```

## Performance Optimizations

### 12. Memoized Type Guards

```typescript
// Memoized type checking for expensive validations
export class MemoizedTypeGuards {
  private static validationCache = new Map<string, boolean>();
  private static readonly CACHE_SIZE = 1000;

  static isValidProjectCached(obj: unknown): obj is Project {
    const key = this.generateKey(obj);

    if (this.validationCache.has(key)) {
      return this.validationCache.get(key)!;
    }

    const result = ModelTypeGuards.isValidProject(obj);

    // Manage cache size
    if (this.validationCache.size > this.CACHE_SIZE) {
      const firstKey = this.validationCache.keys().next().value;
      this.validationCache.delete(firstKey);
    }

    this.validationCache.set(key, result);
    return result;
  }

  private static generateKey(obj: unknown): string {
    if (typeof obj !== 'object' || obj === null) {
      return `${typeof obj}_${obj}`;
    }

    // Simple hash for objects
    return JSON.stringify(obj).substring(0, 50);
  }

  static clearCache(): void {
    this.validationCache.clear();
  }
}
```

## Best Practices Summary

### Type Safety Checklist

- ✅ **Always use type guards** - Validate data at service boundaries
- ✅ **Implement safe access patterns** - Use SafeAccess utilities
- ✅ **Create with factories** - Use ModelFactory for object creation
- ✅ **Provide default values** - Use DEFAULT_VALUES for fallbacks
- ✅ **Test type guards thoroughly** - Unit test all validation logic
- ✅ **Handle edge cases** - Plan for null, undefined, and malformed data
- ✅ **Use TypeScript strict mode** - Enable all strict type checking
- ✅ **Document type contracts** - Clear JSDoc for all type guards

### Common Patterns

1. **Validation at Boundaries** - Check types when data enters your system
2. **Safe Property Access** - Use utilities to avoid null/undefined errors
3. **Factory Creation** - Create objects with safe defaults
4. **Graceful Degradation** - Handle invalid data without crashing
5. **Type Narrowing** - Use type guards to narrow union types
6. **Memoization** - Cache expensive type validations

## See Also

- [ErrorHandlerService Examples]({{ site.baseurl }}/code-examples/error-handler-service) - Error handling with type safety
- [ReactiveStateStore Examples]({{ site.baseurl }}/code-examples/reactive-state-store) - Type-safe state management
- [DataIntegrityService Examples]({{ site.baseurl }}/code-examples/data-integrity-service) - Data validation patterns
- [Component Integration Guide]({{ site.baseurl }}/code-examples/component-integration) - Type-safe component patterns

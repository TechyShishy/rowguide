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

## Advanced Type Guard Scenarios

### Complex Validation Patterns

#### 1. Nested Object Validation with Deep Checking

```typescript
// Advanced nested validation for complex project structures
function isComplexProject(obj: unknown): obj is ComplexProject {
  if (!isProject(obj)) return false;
  
  const project = obj as Project;
  
  // Validate FLAM structure if present
  if (project.firstLastAppearanceMap) {
    if (!isValidFLAM(project.firstLastAppearanceMap)) {
      return false;
    }
  }
  
  // Validate color mappings
  if (project.colorMapping) {
    if (!isValidColorMapping(project.colorMapping)) {
      return false;
    }
  }
  
  // Validate nested row and step structures
  return project.rows.every(row => 
    isRow(row) && 
    row.steps.every(step => 
      isStep(step) && 
      isValidStepContent(step)
    )
  );
}

function isValidFLAM(flam: unknown): flam is FLAM {
  if (typeof flam !== 'object' || flam === null) return false;
  
  return Object.entries(flam).every(([key, value]) => {
    return typeof key === 'string' && 
           isFLAMRow(value) &&
           value.key === key;
  });
}

function isFLAMRow(obj: unknown): obj is FLAMRow {
  return typeof obj === 'object' && obj !== null &&
         'key' in obj && typeof (obj as any).key === 'string' &&
         'firstAppearance' in obj && isPosition((obj as any).firstAppearance) &&
         'lastAppearance' in obj && isPosition((obj as any).lastAppearance) &&
         'count' in obj && typeof (obj as any).count === 'number' &&
         (obj as any).count >= 0;
}

function isValidColorMapping(mapping: unknown): mapping is Record<string, string> {
  if (typeof mapping !== 'object' || mapping === null) return false;
  
  return Object.entries(mapping).every(([key, value]) => {
    return typeof key === 'string' && 
           typeof value === 'string' &&
           isValidHexColor(value);
  });
}

function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}
```

#### 2. Runtime Type Validation with Error Context

```typescript
// Enhanced type guards with detailed error reporting
interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  path: string;
  expectedType: string;
  actualType: string;
  message: string;
}

interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

function validateProjectWithContext(obj: unknown): ValidationResult<Project> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Root level validation
  if (typeof obj !== 'object' || obj === null) {
    return {
      isValid: false,
      errors: [{
        path: 'root',
        expectedType: 'object',
        actualType: typeof obj,
        message: 'Project must be an object'
      }],
      warnings: []
    };
  }
  
  const project = obj as any;
  
  // ID validation
  if (!('id' in project)) {
    errors.push({
      path: 'id',
      expectedType: 'number',
      actualType: 'missing',
      message: 'Project ID is required'
    });
  } else if (typeof project.id !== 'number' || project.id <= 0) {
    errors.push({
      path: 'id',
      expectedType: 'positive number',
      actualType: typeof project.id,
      message: 'Project ID must be a positive number'
    });
  }
  
  // Name validation with suggestions
  if (!('name' in project)) {
    warnings.push({
      path: 'name',
      message: 'Project name is missing',
      suggestion: 'Consider adding a descriptive name for better organization'
    });
  } else if (typeof project.name !== 'string') {
    errors.push({
      path: 'name',
      expectedType: 'string',
      actualType: typeof project.name,
      message: 'Project name must be a string'
    });
  } else if (project.name.length > 100) {
    warnings.push({
      path: 'name',
      message: 'Project name is very long',
      suggestion: 'Consider shortening to improve readability'
    });
  }
  
  // Rows validation with path tracking
  if (!('rows' in project)) {
    errors.push({
      path: 'rows',
      expectedType: 'array',
      actualType: 'missing',
      message: 'Project rows array is required'
    });
  } else if (!Array.isArray(project.rows)) {
    errors.push({
      path: 'rows',
      expectedType: 'array',
      actualType: typeof project.rows,
      message: 'Project rows must be an array'
    });
  } else {
    // Validate each row
    project.rows.forEach((row: unknown, rowIndex: number) => {
      const rowResult = validateRowWithPath(row, `rows[${rowIndex}]`);
      errors.push(...rowResult.errors);
      warnings.push(...rowResult.warnings);
    });
  }
  
  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? project as Project : undefined,
    errors,
    warnings
  };
}

function validateRowWithPath(obj: unknown, basePath: string): ValidationResult<Row> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (typeof obj !== 'object' || obj === null) {
    errors.push({
      path: basePath,
      expectedType: 'object',
      actualType: typeof obj,
      message: 'Row must be an object'
    });
    return { isValid: false, errors, warnings };
  }
  
  const row = obj as any;
  
  // Validate row ID
  if (!('id' in row) || typeof row.id !== 'number') {
    errors.push({
      path: `${basePath}.id`,
      expectedType: 'number',
      actualType: typeof row.id,
      message: 'Row ID must be a number'
    });
  }
  
  // Validate steps array
  if (!Array.isArray(row.steps)) {
    errors.push({
      path: `${basePath}.steps`,
      expectedType: 'array',
      actualType: typeof row.steps,
      message: 'Row steps must be an array'
    });
  } else if (row.steps.length === 0) {
    warnings.push({
      path: `${basePath}.steps`,
      message: 'Row has no steps',
      suggestion: 'Empty rows may indicate incomplete pattern data'
    });
  } else {
    // Validate each step
    row.steps.forEach((step: unknown, stepIndex: number) => {
      const stepResult = validateStepWithPath(step, `${basePath}.steps[${stepIndex}]`);
      errors.push(...stepResult.errors);
      warnings.push(...stepResult.warnings);
    });
  }
  
  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? row as Row : undefined,
    errors,
    warnings
  };
}
```

#### 3. Advanced Safe Access Patterns

```typescript
// Advanced safe access with path-based property extraction
class AdvancedSafeAccess {
  /**
   * Extract nested properties using dot notation path
   */
  static getNestedProperty<T>(obj: unknown, path: string, defaultValue: T): T {
    if (!obj || typeof obj !== 'object') {
      return defaultValue;
    }
    
    const keys = path.split('.');
    let current: any = obj;
    
    for (const key of keys) {
      if (current == null || typeof current !== 'object' || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
  }
  
  /**
   * Safe array access with bounds checking
   */
  static getArrayElement<T>(arr: unknown, index: number, defaultValue: T): T {
    if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
      return defaultValue;
    }
    
    const element = arr[index];
    return element !== undefined ? element : defaultValue;
  }
  
  /**
   * Extract project statistics safely
   */
  static getProjectStatistics(project: unknown): ProjectStatistics {
    if (!ModelTypeGuards.isValidProject(project)) {
      return {
        totalRows: 0,
        totalSteps: 0,
        uniqueColors: 0,
        completionPercentage: 0
      };
    }
    
    const rows = SafeAccess.getProjectRows(project);
    const totalSteps = rows.reduce((sum, row) => {
      const steps = SafeAccess.getRowSteps(row);
      return sum + steps.length;
    }, 0);
    
    const uniqueColors = new Set(
      rows.flatMap(row => 
        SafeAccess.getRowSteps(row).map(step => 
          SafeAccess.getStepDescription(step)
        )
      ).filter(desc => desc.length > 0)
    ).size;
    
    const position = SafeAccess.getProjectPosition(project);
    const currentStepIndex = rows.slice(0, position.row + 1)
      .reduce((sum, row, index) => {
        const steps = SafeAccess.getRowSteps(row);
        if (index === position.row) {
          return sum + Math.min(position.step + 1, steps.length);
        }
        return sum + steps.length;
      }, 0);
    
    const completionPercentage = totalSteps > 0 
      ? Math.round((currentStepIndex / totalSteps) * 100)
      : 0;
    
    return {
      totalRows: rows.length,
      totalSteps,
      uniqueColors,
      completionPercentage
    };
  }
  
  /**
   * Safe access to step at specific position
   */
  static getStepAtPosition(project: unknown, position: Position): Step | null {
    if (!ModelTypeGuards.isValidProject(project) || !ModelTypeGuards.isPosition(position)) {
      return null;
    }
    
    const rows = SafeAccess.getProjectRows(project);
    const row = this.getArrayElement(rows, position.row, null);
    
    if (!row) return null;
    
    const steps = SafeAccess.getRowSteps(row);
    return this.getArrayElement(steps, position.step, null);
  }
  
  /**
   * Safe navigation with position boundaries
   */
  static getNextPosition(project: unknown, currentPosition: Position): Position | null {
    if (!ModelTypeGuards.isValidProject(project) || !ModelTypeGuards.isPosition(currentPosition)) {
      return null;
    }
    
    const rows = SafeAccess.getProjectRows(project);
    const currentRow = this.getArrayElement(rows, currentPosition.row, null);
    
    if (!currentRow) return null;
    
    const currentSteps = SafeAccess.getRowSteps(currentRow);
    
    // Try next step in current row
    if (currentPosition.step + 1 < currentSteps.length) {
      return {
        row: currentPosition.row,
        step: currentPosition.step + 1
      };
    }
    
    // Try first step of next row
    if (currentPosition.row + 1 < rows.length) {
      const nextRow = rows[currentPosition.row + 1];
      const nextSteps = SafeAccess.getRowSteps(nextRow);
      
      if (nextSteps.length > 0) {
        return {
          row: currentPosition.row + 1,
          step: 0
        };
      }
    }
    
    return null; // End of project
  }
}

interface ProjectStatistics {
  totalRows: number;
  totalSteps: number;
  uniqueColors: number;
  completionPercentage: number;
}
```

#### 4. High-Performance Type Guards with Caching

```typescript
// Memoized type guards for performance-critical operations
class MemoizedTypeGuards {
  private static validationCache = new Map<string, boolean>();
  private static cacheSize = 1000; // Prevent memory leaks
  
  /**
   * Cached project validation for frequently accessed projects
   */
  static isValidProjectCached(obj: unknown): obj is Project {
    if (obj == null) return false;
    
    // Generate cache key (simplified - in production use better hashing)
    const cacheKey = JSON.stringify({
      id: (obj as any)?.id,
      hasRows: Array.isArray((obj as any)?.rows),
      rowCount: (obj as any)?.rows?.length || 0
    });
    
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }
    
    const isValid = ModelTypeGuards.isValidProject(obj);
    
    // Manage cache size
    if (this.validationCache.size >= this.cacheSize) {
      const firstKey = this.validationCache.keys().next().value;
      this.validationCache.delete(firstKey);
    }
    
    this.validationCache.set(cacheKey, isValid);
    return isValid;
  }
  
  /**
   * Bulk validation with early termination
   */
  static validateProjectArray(projects: unknown[]): Project[] {
    const validProjects: Project[] = [];
    
    for (const project of projects) {
      // Fast rejection for obvious non-projects
      if (typeof project !== 'object' || project === null) {
        continue;
      }
      
      // Quick structural check before full validation
      if (!('id' in project) || !('rows' in project)) {
        continue;
      }
      
      // Full validation only for candidates
      if (this.isValidProjectCached(project)) {
        validProjects.push(project);
      }
    }
    
    return validProjects;
  }
  
  /**
   * Clear validation cache (call when project structure changes)
   */
  static clearValidationCache(): void {
    this.validationCache.clear();
  }
}
```

#### 5. Type Guard Composition and Chaining

```typescript
// Composable type guards for complex validation scenarios
type TypeGuard<T> = (obj: unknown) => obj is T;
type ValidationPredicate = (obj: unknown) => boolean;

class ComposableTypeGuards {
  /**
   * Combine multiple type guards with AND logic
   */
  static and<T>(...guards: TypeGuard<T>[]): TypeGuard<T> {
    return (obj: unknown): obj is T => {
      return guards.every(guard => guard(obj));
    };
  }
  
  /**
   * Combine multiple type guards with OR logic
   */
  static or<T>(...guards: TypeGuard<T>[]): TypeGuard<T> {
    return (obj: unknown): obj is T => {
      return guards.some(guard => guard(obj));
    };
  }
  
  /**
   * Negate a type guard
   */
  static not<T>(guard: TypeGuard<T>): ValidationPredicate {
    return (obj: unknown): boolean => {
      return !guard(obj);
    };
  }
  
  /**
   * Create array type guard from element type guard
   */
  static arrayOf<T>(elementGuard: TypeGuard<T>): TypeGuard<T[]> {
    return (obj: unknown): obj is T[] => {
      return Array.isArray(obj) && obj.every(elementGuard);
    };
  }
  
  /**
   * Create optional property type guard
   */
  static optional<T>(guard: TypeGuard<T>): TypeGuard<T | undefined> {
    return (obj: unknown): obj is T | undefined => {
      return obj === undefined || guard(obj);
    };
  }
}

// Usage examples of composed type guards
const isValidProjectArray = ComposableTypeGuards.arrayOf(ModelTypeGuards.isValidProject);

const isProjectWithOptionalImage = ComposableTypeGuards.and(
  ModelTypeGuards.isValidProject,
  (obj: unknown): obj is Project => {
    const project = obj as Project;
    return ComposableTypeGuards.optional(
      (img): img is ArrayBuffer => img instanceof ArrayBuffer
    )(project.image);
  }
);

const isCompleteProject = ComposableTypeGuards.and(
  ModelTypeGuards.isValidProject,
  (obj: unknown): obj is Project => {
    const project = obj as Project;
    return project.rows.length > 0 && 
           project.rows.every(row => SafeAccess.getRowSteps(row).length > 0);
  }
);
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

### Advanced Patterns

1. **Contextual Validation** - Provide detailed error information for debugging
2. **Path-Based Access** - Navigate nested structures safely with dot notation
3. **Performance Optimization** - Cache validation results for frequently accessed data
4. **Composable Guards** - Build complex validators from simple building blocks
5. **Early Termination** - Fail fast for obvious invalid data
6. **Statistical Analysis** - Extract meaningful metrics from validated data

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
- [Developer Onboarding Guide]({{ site.baseurl }}/code-examples/developer-onboarding) - Getting started with type safety
- [Testing Strategy]({{ site.baseurl }}/code-examples/testing-strategy) - Testing type guards and utilities

```

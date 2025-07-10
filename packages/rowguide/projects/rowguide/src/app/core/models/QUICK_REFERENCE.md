# Null Safety Quick Reference

## Import Statement
```typescript
import { 
  // Type Guards
  isProject, isRow, isStep, hasValidId, hasName, hasPosition, 
  isValidProject, isEmptyProject,
  
  // Safe Factory
  ModelFactory, DEFAULT_VALUES,
  
  // Safe Access
  SafeAccess 
} from './core/models';
```

## Common Patterns

### ✅ Validate API Responses
```typescript
const response = await api.getProject(id);
if (isValidProject(response)) {
  this.project = response;
} else {
  this.showError('Invalid project data');
}
```

### ✅ Safe Property Access
```typescript
// Instead of: project?.name || 'Untitled'
const name = SafeAccess.getProjectName(project, 'Untitled');

// Instead of: project?.rows || []
const rows = SafeAccess.getProjectRows(project);
```

### ✅ Create Safe Objects
```typescript
// Instead of: { id: 1, count: 5, description: 'step' }
const step = ModelFactory.createStep({
  id: 1, 
  count: 5, 
  description: 'step'
});

// Instead of: { row: 0, step: 0 }
const position = DEFAULT_VALUES.position();
```

### ✅ Database Operations
```typescript
async saveProject(project: Project) {
  if (!hasValidId(project)) {
    throw new Error('Cannot save project without ID');
  }
  
  if (!isValidProject(project)) {
    throw new Error('Invalid project data');
  }
  
  return await this.db.save(project);
}
```

### ✅ Component Safety
```typescript
ngOnInit() {
  this.project$ = this.route.params.pipe(
    map(params => parseInt(params.id)),
    switchMap(id => this.projectService.loadProject(id)),
    map(project => isValidProject(project) ? project : ModelFactory.createProject())
  );
}
```

### ✅ Navigation Safety
```typescript
navigateToStep(rowIndex: number, stepIndex: number) {
  const position = ModelFactory.createPosition(rowIndex, stepIndex);
  
  if (SafeAccess.isValidPosition(this.project, position)) {
    this.currentPosition = position;
  } else {
    console.warn('Invalid position, staying at current location');
  }
}
```

## Type Narrowing Examples

```typescript
// After type guard, TypeScript knows the exact type
if (hasValidId(project)) {
  // project.id is definitely a number
  await this.db.updateProject(project.id, project);
}

if (hasName(project)) {
  // project.name is definitely a string
  document.title = project.name;
}

if (hasPosition(project)) {
  // project.position is definitely a Position
  this.scrollTo(project.position.row, project.position.step);
}
```

## Error Handling

```typescript
function processProject(data: unknown) {
  // 1. Validate structure
  if (!isProject(data)) {
    throw new Error('Invalid project structure');
  }
  
  // 2. Validate content
  if (!isValidProject(data)) {
    console.warn('Empty project, using defaults');
    return ModelFactory.createProject();
  }
  
  // 3. Safe to use
  return data;
}
```

## Anti-Patterns to Avoid

### ❌ Don't use type assertions
```typescript
const project = response as Project; // Dangerous!
```

### ❌ Don't access properties without checking
```typescript
const name = project.name.trim(); // Can throw!
```

### ❌ Don't use inconsistent defaults
```typescript
const pos1 = { row: 0, step: 0 };
const pos2 = { row: 0, step: 0 }; // Duplicated magic values
```

### ❌ Don't ignore validation results
```typescript
if (isValidProject(project)) {
  // Handle valid case
}
// Missing: what if project is invalid?
```

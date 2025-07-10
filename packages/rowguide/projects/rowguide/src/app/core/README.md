# Core Module

This directory contains the core application functionality that is used throughout the entire application.

## Structure

- **models/**: Core domain models, interfaces, and null safety utilities
  - Domain interfaces: Project, Row, Step, Position, FLAM
  - Type guards: Runtime validation with TypeScript type narrowing
  - Model factory: Safe object creation with validation
  - Safe access: Null-aware property access utilities
- **services/**: Core application services (notification, settings, mark-mode)
- **guards/**: Route guards and authentication logic (if needed)

## Null Safety Features

The core module includes comprehensive null safety utilities to prevent runtime errors:

### Type Guards (`models/type-guards.ts`)
```typescript
import { isProject, hasValidId, isValidProject } from './models';

if (isProject(data)) {
  // TypeScript knows 'data' is now Project
  processProject(data);
}
```

### Safe Object Creation (`models/model-factory.ts`)
```typescript
import { ModelFactory, DEFAULT_VALUES } from './models';

const project = ModelFactory.createProject({
  name: 'My Pattern'
});

const position = DEFAULT_VALUES.position();
```

### Safe Property Access (`models/model-factory.ts`)
```typescript
import { SafeAccess } from './models';

const projectName = SafeAccess.getProjectName(project, 'Untitled');
const rows = SafeAccess.getProjectRows(project);
```

## Guidelines

- **Always use type guards** when validating external data (API responses, user input)
- **Use ModelFactory** instead of object literals for creating domain objects
- **Use SafeAccess** instead of direct property access when objects might be null
- **Use DEFAULT_VALUES** for consistent fallback values
- Models should be pure interfaces/types without business logic
- Services should provide foundational functionality used across features

## Documentation

- See `models/NULL_SAFETY_GUIDE.md` for comprehensive usage examples
- All type guards and utilities include detailed JSDoc comments
- Check individual files for specific API documentation

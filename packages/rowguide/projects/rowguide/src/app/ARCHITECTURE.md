# Rowguide Application Structure

This document describes the new domain-driven architecture of the Rowguide application.

## Overview

The application has been reorganized following domain-driven design principles to improve maintainability, scalability, and developer experience.

## Directory Structure

```
src/app/
├── core/                    # Core application functionality
│   ├── models/             # Core domain models and interfaces
│   └── services/           # Core services (notification, settings, etc.)
├── data/                   # Data access layer
│   ├── services/           # Database access services
│   ├── schemas/            # Database schema definitions
│   └── migrations/         # Database migration logic
├── features/               # Feature modules organized by domain
│   ├── project-management/ # Project CRUD operations
│   │   ├── components/     # Project selector, inspector, summary
│   │   ├── services/       # Project service
│   │   └── models/         # Project-specific models
│   ├── pattern-tracking/   # Core tracking functionality
│   │   └── components/     # Project, row, step, bead-count components
│   ├── file-import/        # File parsing and import
│   │   ├── loaders/        # Format-specific parsers
│   │   └── services/       # Import utilities
│   └── settings/           # Application settings
│       └── components/     # Settings UI
└── shared/                 # Shared utilities
    ├── components/         # Reusable UI components
    ├── utils/              # Utility functions
    └── constants/          # Application constants
```

## Module Responsibilities

### Core (`/core`)
Contains fundamental application models and services that are used throughout the entire application.

- **Models**: Project, Row, Step, Position, FLAM, FlamRow
- **Services**: NotificationService, SettingsService, MarkModeService, FlamService

### Data (`/data`)
Handles all data persistence and database-related functionality.

- **Services**: IndexedDbService, ProjectDbService, MigrationDbService
- **Schemas**: Database schema definitions
- **Migrations**: Database upgrade logic

### Features (`/features`)
Domain-specific functionality organized by business capability.

#### Project Management (`/features/project-management`)
Handles project creation, editing, and management.
- **Components**: ProjectSelectorComponent, ProjectInspectorComponent, ProjectSummaryComponent
- **Services**: ProjectService
- **Models**: BeadProject, NullProject, MockProject

#### Pattern Tracking (`/features/pattern-tracking`)
Core functionality for tracking progress through patterns.
- **Components**: ProjectComponent, RowComponent, StepComponent, BeadCountBottomSheet

#### File Import (`/features/file-import`)
Handles importing patterns from various file formats.
- **Loaders**: BeadtoolPdfService, PeyoteShorthandService, C2cCrochetShorthandService
- **Services**: PdfjslibService, ZipperService

#### Settings (`/features/settings`)
Application configuration and user preferences.
- **Components**: SettingsComponent

### Shared (`/shared`)
Reusable components, utilities, and constants used across multiple features.

- **Components**: NotificationComponent
- **Utils**: HierarchicalList, Sanity utilities
- **Constants**: Application-wide constants

## Import Guidelines

### Using Index Files
Each module exports its public API through index.ts files:

```typescript
// Import from core
import { Project, Row, Step } from './core/models';
import { NotificationService, SettingsService } from './core/services';

// Import from features
import { ProjectService } from './features/project-management';
import { BeadtoolPdfService } from './features/file-import';

// Import from data layer
import { ProjectDbService } from './data/services';
```

### Direct Imports
For specific files when needed:

```typescript
import { ProjectComponent } from './features/pattern-tracking/components/project/project.component';
```

## Benefits

1. **Clear Separation of Concerns**: Each directory has a specific responsibility
2. **Improved Maintainability**: Related code is grouped together
3. **Better Scalability**: Easy to add new features without cluttering
4. **Enhanced Developer Experience**: Intuitive file locations
5. **Improved Testing**: Better isolation of components and services
6. **Code Reusability**: Shared utilities are clearly identified

## Migration Status

- ✅ Phase 1: Directory structure created
- ✅ Phase 2: Models and interfaces moved
- ✅ Phase 3: Services reorganized by domain
- ✅ Phase 4: Components grouped into feature modules
- ✅ Phase 5: Structure finalized and optimized

All phases have been completed successfully with full build and test verification.

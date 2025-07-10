# Rowguide Codebase Reorganization Plan

## Overview

This document outlines the planned reorganization of the Rowguide codebase into a more maintainable, scalable structure based on domain-driven design principles.

## New Structure

```
src/app/
├── core/                    # Core application functionality
│   ├── models/             # Core domain models and interfaces
│   └── services/           # Core services
├── data/                   # Data access layer
│   ├── services/           # Database access services
│   ├── schemas/            # Database schema definitions
│   └── migrations/         # Database migration logic
├── features/               # Feature modules
│   ├── project-management/ # Project CRUD operations
│   │   ├── components/     # Project selector, inspector, summary
│   │   ├── services/       # Project service
│   │   └── models/         # Project-specific models
│   ├── pattern-tracking/   # Core tracking functionality
│   │   ├── components/     # Project, row, step, bead-count components
│   │   └── services/       # Tracking services
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

## Migration Phases

### ✅ Phase 1: Create Directory Structure (COMPLETED)
- Create new folder hierarchy
- Add documentation and README files
- Add .gitkeep files for empty directories

### ✅ Phase 2: Move Models and Interfaces (COMPLETED)
**Target files moved to `core/models/`:**
- ✅ `project.ts` → `core/models/project.ts`
- ✅ `row.ts` → `core/models/row.ts`
- ✅ `step.ts` → `core/models/step.ts`
- ✅ `position.ts` → `core/models/position.ts`
- ✅ `flam.ts` → `core/models/flam.ts`
- ✅ `flamrow.ts` → `core/models/flamrow.ts`
- ✅ Created index files for easy importing
- ✅ Updated ALL imports across components, services, and tests
- ✅ Removed duplicate files from original locations
- ✅ Verified application builds successfully

### ✅ Phase 3: Reorganize Services by Domain (COMPLETED)

**Core Services (`core/services/`):**
- ✅ `notification.service.ts`
- ✅ `mark-mode.service.ts`
- ✅ `settings.service.ts`
- ✅ `flam.service.ts`

**Data Services (`data/services/`):**
- ✅ `indexed-db.service.ts`
- ✅ `project-db.service.ts`
- ✅ `migration-db.service.ts`

**Data Schemas (`data/schemas/`):**
- ✅ `rowguide-db.ts`
- ✅ `project-db.ts`
- ✅ `migration-db.ts`

**Migration Services (`data/migrations/`):**
- ✅ `upgrade.service.ts`

**File Import (`features/file-import/`):**
- ✅ `loader/` → `loaders/`
  - ✅ `beadtool-pdf.service.ts`
  - ✅ `peyote-shorthand.service.ts`
  - ✅ `c2ccrochet-shorthand.service.ts`
- ✅ `pdfjslib.service.ts` → `services/`
- ✅ `zipper.service.ts` → `services/`

**Project Management (`features/project-management/`):**
- ✅ `project.service.ts` → `services/`
- ✅ `bead-project.ts` → `models/`
- ✅ `null-project.ts` → `models/`
- ✅ `mock-project.ts` → `models/`

**Shared Utilities (`shared/utils/`):**
- ✅ `hierarchical-list.ts`
- ✅ `sanity.ts`

**✅ All services reorganized by domain with updated imports**
**✅ Created index files for easy importing**
**✅ Updated ALL import statements across the codebase**
**✅ Verified application builds successfully**

### ✅ Phase 4: Group Components into Feature Modules (COMPLETED)

**Project Management Components:**
- ✅ `project-selector/` → `features/project-management/components/`
- ✅ `project-inspector/` → `features/project-management/components/`
- ✅ `project-summary/` → `features/project-management/components/`

**Pattern Tracking Components:**
- ✅ `project/` → `features/pattern-tracking/components/`
- ✅ `row/` → `features/pattern-tracking/components/`
- ✅ `step/` → `features/pattern-tracking/components/`
- ✅ `bead-count-bottom-sheet/` → `features/pattern-tracking/components/`

**Settings Components:**
- ✅ `settings/` → `features/settings/components/`

**Shared Components:**
- ✅ `notification/` → `shared/components/`

**✅ All components moved to feature directories**
**✅ Created index files for component modules**  
**✅ Updated routing to reference new component locations**
**✅ Fixed critical import statements for core services and models**
**✅ Updated SCSS import paths for new directory structure**
**✅ Fixed all test file import paths and removed obsolete test files**
**✅ Verified successful build completion**
**✅ Phase 4 COMPLETED - All components successfully reorganized**

### Phase 5: Finalize Structure and Optimization
- ✅ Update all import statements to reflect new file locations (mostly completed)
- ✅ Create index files for easy importing (completed for core modules)
- 🔄 Update angular.json and other configuration files as needed
- 🔄 Optimize remaining index files and clean up any redundant exports
- 🔄 Final verification of all tests and build configurations
- 🔄 Documentation updates for the new structure

## Benefits of New Structure

1. **Clear Separation of Concerns**: Each directory has a specific responsibility
2. **Improved Maintainability**: Related code is grouped together
3. **Better Scalability**: Easy to add new features without cluttering
4. **Enhanced Developer Experience**: Intuitive file locations
5. **Improved Testing**: Better isolation of components and services
6. **Code Reusability**: Shared utilities are clearly identified

## Implementation Notes

- **Corrected Structure**: Project component is correctly placed alongside row and step components in pattern-tracking, not as a separate management feature
- **Backward Compatibility**: Each phase maintains application functionality
- **Gradual Migration**: Can be implemented incrementally without breaking changes
- **Documentation**: Each module includes README files explaining purpose and guidelines

## Next Steps

Ready to proceed with Phase 3: Reorganizing services by domain.

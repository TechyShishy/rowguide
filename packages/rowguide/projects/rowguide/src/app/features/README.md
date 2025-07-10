# Features Module

This directory contains feature-specific modules organized by business domain.

## Current Features

- **project-management/**: Project creation, selection, inspection, and summary
- **pattern-tracking/**: Row, step, and project tracking during crafting
- **file-import/**: File parsing and import functionality
- **settings/**: Application settings and preferences

## Guidelines

- Each feature should be self-contained with its own components, services, and models
- Features can depend on core and data modules but not on other features
- Shared functionality between features should be moved to the shared module

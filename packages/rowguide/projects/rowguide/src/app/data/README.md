# Data Access Layer

This directory contains all data access functionality including database services, schemas, and migrations.

## Structure

- **services/**: Database access services (IndexedDB, ProjectDB, MigrationDB)
- **schemas/**: Database schema definitions (RowguideDB, ProjectDB, MigrationDB)
- **migrations/**: Database migration logic and upgrade services

## Guidelines

- All database interactions should go through this layer
- Services should provide clean abstractions over storage mechanisms
- Migrations should be versioned and idempotent

# Core Module

This directory contains the core application functionality that is used throughout the entire application.

## Structure

- **models/**: Core domain models and interfaces (Project, Row, Step, Position, FLAM, etc.)
- **services/**: Core application services (notification, settings, mark-mode)
- **guards/**: Route guards and authentication logic (if needed)

## Guidelines

- Code in this module should be application-agnostic and reusable
- Models should be pure interfaces/types without business logic
- Services should provide foundational functionality used across features

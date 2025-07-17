/**
 * Core Domain Models Module - Business Logic and Data Structures
 *
 * This module provides the core domain models and interfaces that define the
 * business logic and data structures for the Rowguide pattern tracking application.
 * All models follow domain-driven design principles with strong typing and validation.
 *
 * @fileoverview
 * Comprehensive collection of domain models including Project, Row, Step, Position,
 * and FLAM (First/Last Appearance Map) structures. Includes type guards, factory
 * functions, and utilities for safe model creation and manipulation.
 *
 * **Domain Model Hierarchy:**
 * ```
 * Project
 * ├── Row[]
 * │   └── Step[]
 * ├── Position (current tracking)
 * ├── FLAM (First/Last Appearance Map)
 * └── ColorMapping
 * ```
 *
 * **Model Categories:**
 *
 * **Core Entities:**
 * - `Project`: Top-level pattern container with metadata
 * - `Row`: Individual pattern rows with step sequences
 * - `Step`: Atomic pattern steps with count and description
 * - `Position`: Navigation coordinates for current tracking
 *
 * **Analysis Models:**
 * - `FLAM`: First/Last Appearance Map for pattern analysis
 * - `FLAMRow`: Individual FLAM entries with appearance data
 *
 * **Utility Functions:**
 * - `TypeGuards`: Runtime type validation and narrowing
 * - `ModelFactory`: Safe model creation with defaults
 * - `SafeAccess`: Null-safe property access utilities
 *
 * @example
 * ```typescript
 * // Safe model creation
 * import { ModelFactory, TypeGuards } from '@core/models';
 *
 * const project = ModelFactory.createProject({
 *   name: 'My Pattern',
 *   rows: [
 *     ModelFactory.createRow({
 *       steps: [
 *         ModelFactory.createStep({ count: 5, description: 'red' }),
 *         ModelFactory.createStep({ count: 3, description: 'blue' })
 *       ]
 *     })
 *   ]
 * });
 *
 * // Type validation
 * if (TypeGuards.isValidProject(project)) {
 *   console.log('Project is valid');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // FLAM analysis
 * import { FLAM, FLAMRow } from '@core/models';
 *
 * const flamData: FLAM = {
 *   'red': {
 *     key: 'red',
 *     firstAppearance: { row: 0, step: 0 },
 *     lastAppearance: { row: 2, step: 5 },
 *     count: 15,
 *     color: 'Red',
 *     hexColor: '#FF0000'
 *   }
 * };
 * ```
 *
 * **Design Principles:**
 * - **Immutability**: All models are designed for immutable operations
 * - **Type Safety**: Comprehensive TypeScript typing with runtime guards
 * - **Null Safety**: Safe access patterns and factory functions
 * - **Validation**: Built-in validation and error handling
 *
 * @since 1.0.0
 */

// Core domain models and interfaces
export * from './project';
export * from './row';
export * from './step';
export * from './position';
export * from './flam';
export * from './flamrow';
export * from './type-guards';
export * from './model-factory';

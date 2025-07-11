import { Project } from './project';
import { Row } from './row';
import { Step } from './step';
import { Position } from './position';

/**
 * @fileoverview Model Factory and Safe Access Utilities
 *
 * This module provides safe factory functions and utilities for creating and
 * accessing domain objects in a null-safe manner. It replaces dangerous type
 * assertions and provides consistent default values throughout the application.
 *
 * ## Key Features
 * - Safe object creation with validation
 * - Consistent default values
 * - Null-safe property access
 * - Boundary checking for arrays and positions
 *
 * ## Usage Examples
 *
 * ### Creating Safe Objects
 * ```typescript
 * import { ModelFactory } from './model-factory';
 *
 * // Create a safe step with validation
 * const step = ModelFactory.createStep({
 *   id: 1,
 *   description: 'Chain 10',
 *   count: 10
 * });
 *
 * // Create a project with defaults
 * const project = ModelFactory.createProject({
 *   name: 'My Pattern'
 * });
 * ```
 *
 * ### Safe Property Access
 * ```typescript
 * import { SafeAccess } from './model-factory';
 *
 * // Safely get project properties with fallbacks
 * const projectId = SafeAccess.getProjectId(project, 0);
 * const projectName = SafeAccess.getProjectName(project, 'Untitled');
 * const position = SafeAccess.getProjectPosition(project);
 * ```
 *
 * ### Using Default Values
 * ```typescript
 * import { DEFAULT_VALUES } from './model-factory';
 *
 * // Get consistent defaults
 * const newPosition = DEFAULT_VALUES.position();
 * const emptyProject = DEFAULT_VALUES.project();
 * ```
 */

/**
 * Default values for core domain objects.
 *
 * Provides consistent, safe default values for all domain objects.
 * Use these instead of object literals to ensure consistency.
 *
 * @example
 * ```typescript
 * // Good - consistent defaults
 * const position = DEFAULT_VALUES.position();
 *
 * // Avoid - inconsistent defaults
 * const position = { row: 0, step: 0 };
 * ```
 */
export const DEFAULT_VALUES = {
  /** Creates a default position at origin (0, 0) */
  position: (): Position => ({ row: 0, step: 0 }),

  /** Creates a default step with given ID */
  step: (id: number = 0): Step => ({
    id,
    count: 1,
    description: '',
  }),

  /** Creates a default row with given ID and empty steps */
  row: (id: number = 0): Row => ({
    id,
    steps: [],
  }),

  /** Creates a default empty project with position at origin */
  project: (): Project => ({
    rows: [],
    position: { row: 0, step: 0 },
  }),
} as const;

/**
 * Factory class for creating safe, validated domain objects.
 *
 * All factory methods include validation and sanitization to prevent
 * invalid data from being created. Use these instead of object literals
 * when you need guaranteed valid objects.
 */
export class ModelFactory {
  /**
   * Creates a safe Step with validated properties.
   *
   * Ensures count is at least 1 and description is properly trimmed.
   * Use this instead of object literals when creating steps programmatically.
   *
   * @param partial - Partial step data with required ID
   * @returns A valid Step object with sanitized properties
   *
   * @example
   * ```typescript
   * // Creates a step with validated count
   * const step = ModelFactory.createStep({
   *   id: 1,
   *   description: 'Single Crochet',
   *   count: 5
   * });
   *
   * // Handles invalid count (negative or zero values become 1)
   * const safeStep = ModelFactory.createStep({
   *   id: 2,
   *   count: -10 // Will become 1
   * });
   * ```
   */
  static createStep(partial: Partial<Step> & Pick<Step, 'id'>): Step {
    return {
      ...DEFAULT_VALUES.step(),
      ...partial,
      count: Math.max(1, partial.count ?? 1),
      description: (partial.description ?? '').trim(),
    };
  }

  /**
   * Creates a safe Row with validated properties.
   *
   * Ensures the steps array is valid and properly initialized.
   * Handles cases where steps might be null or undefined.
   *
   * @param partial - Partial row data with required ID
   * @returns A valid Row object with safe steps array
   *
   * @example
   * ```typescript
   * // Creates a row with existing steps
   * const row = ModelFactory.createRow({
   *   id: 1,
   *   steps: [step1, step2, step3]
   * });
   *
   * // Handles invalid steps array
   * const safeRow = ModelFactory.createRow({
   *   id: 2,
   *   steps: null // Will become empty array
   * });
   * ```
   */
  static createRow(partial: Partial<Row> & Pick<Row, 'id'>): Row {
    return {
      ...DEFAULT_VALUES.row(),
      ...partial,
      steps: Array.isArray(partial.steps) ? partial.steps : [],
    };
  }

  /**
   * Creates a safe Project with validated properties.
   *
   * Provides comprehensive validation for all project properties:
   * - Ensures rows array is valid
   * - Validates and sanitizes position coordinates
   * - Trims and validates project name
   * - Sets up safe defaults for all optional properties
   *
   * @param partial - Partial project data (all properties optional)
   * @returns A valid Project object with sanitized properties
   *
   * @example
   * ```typescript
   * // Creates a complete project
   * const project = ModelFactory.createProject({
   *   name: 'My Pattern',
   *   rows: [row1, row2],
   *   position: { row: 1, step: 5 }
   * });
   *
   * // Creates project with defaults
   * const emptyProject = ModelFactory.createProject();
   *
   * // Handles invalid data gracefully
   * const safeProject = ModelFactory.createProject({
   *   name: '   ', // Will become undefined
   *   rows: null, // Will become empty array
   *   position: { row: -1, step: -5 } // Will become { row: 0, step: 0 }
   * });
   * ```
   */
  static createProject(partial: Partial<Project> = {}): Project {
    const project: Project = {
      ...DEFAULT_VALUES.project(),
      ...partial,
      rows: Array.isArray(partial.rows) ? partial.rows : [],
    };

    // Ensure position is valid
    if (partial.position && typeof partial.position === 'object') {
      project.position = {
        row: Math.max(0, partial.position.row ?? 0),
        step: Math.max(0, partial.position.step ?? 0),
      };
    }

    // Validate name if provided
    if (partial.name !== undefined) {
      project.name =
        typeof partial.name === 'string' ? partial.name.trim() : undefined;
      if (project.name === '') {
        project.name = undefined;
      }
    }

    return project;
  }

  /**
   * Creates a safe Position with validated coordinates.
   *
   * Ensures row and step values are non-negative integers.
   * Use this when creating positions programmatically to avoid invalid coordinates.
   *
   * @param row - Row coordinate (will be clamped to >= 0)
   * @param step - Step coordinate (will be clamped to >= 0)
   * @returns A valid Position with non-negative integer coordinates
   *
   * @example
   * ```typescript
   * // Creates a valid position
   * const position = ModelFactory.createPosition(2, 5);
   *
   * // Handles invalid coordinates
   * const safePosition = ModelFactory.createPosition(-1, 3.7);
   * // Result: { row: 0, step: 3 }
   * ```
   */
  static createPosition(row: number = 0, step: number = 0): Position {
    return {
      row: Math.max(0, Math.floor(row)),
      step: Math.max(0, Math.floor(step)),
    };
  }
}

/**
 * Utility class for safe, null-aware access to domain object properties.
 *
 * Provides methods that safely access properties of potentially null or undefined
 * objects. All methods include proper fallbacks and boundary checking.
 *
 * Use these methods instead of direct property access when the object might be
 * null, undefined, or have missing properties.
 *
 * @example
 * ```typescript
 * // Instead of this (unsafe):
 * const name = project?.name || 'Untitled';
 *
 * // Use this (safe):
 * const name = SafeAccess.getProjectName(project, 'Untitled');
 * ```
 */
export class SafeAccess {
  /**
   * Safely gets a project's ID with fallback.
   *
   * @param project - The project (may be null/undefined)
   * @param defaultValue - Value to return if ID is missing
   * @returns The project ID or default value
   *
   * @example
   * ```typescript
   * const id = SafeAccess.getProjectId(project, 0);
   * if (id > 0) {
   *   // Project has a valid ID
   *   saveToDatabase(id);
   * }
   * ```
   */
  static getProjectId(
    project: Project | null | undefined,
    defaultValue: number = 0
  ): number {
    return project?.id ?? defaultValue;
  }

  /**
   * Safely gets a project's name with fallback.
   *
   * Trims whitespace and provides fallback for empty/missing names.
   *
   * @param project - The project (may be null/undefined)
   * @param defaultValue - Value to return if name is missing/empty
   * @returns The project name or default value
   *
   * @example
   * ```typescript
   * const displayName = SafeAccess.getProjectName(project, 'Untitled Project');
   * document.title = displayName;
   * ```
   */
  static getProjectName(
    project: Project | null | undefined,
    defaultValue: string = 'Untitled'
  ): string {
    return project?.name?.trim() || defaultValue;
  }

  /**
   * Safely gets a project's position with validation.
   *
   * Always returns a valid Position object, creating one with safe defaults
   * if the project position is missing or invalid.
   *
   * @param project - The project (may be null/undefined)
   * @returns A valid Position object
   *
   * @example
   * ```typescript
   * const currentPos = SafeAccess.getProjectPosition(project);
   * // Always safe to access currentPos.row and currentPos.step
   * scrollToPosition(currentPos.row, currentPos.step);
   * ```
   */
  static getProjectPosition(project: Project | null | undefined): Position {
    if (!project?.position) {
      return DEFAULT_VALUES.position();
    }
    return ModelFactory.createPosition(
      project.position.row,
      project.position.step
    );
  }

  /**
   * Safely gets a project's rows array.
   *
   * Always returns a valid array, even if the project is null or has invalid rows.
   *
   * @param project - The project (may be null/undefined)
   * @returns A valid Row array (may be empty)
   *
   * @example
   * ```typescript
   * const rows = SafeAccess.getProjectRows(project);
   * // Always safe to iterate
   * rows.forEach(row => processRow(row));
   * ```
   */
  static getProjectRows(project: Project | null | undefined): Row[] {
    return Array.isArray(project?.rows) ? project.rows : [];
  }

  /**
   * Safely gets a specific row from a project with bounds checking.
   *
   * Performs boundary checking to prevent array access errors.
   *
   * @param project - The project (may be null/undefined)
   * @param rowIndex - Zero-based row index
   * @returns The Row at the specified index, or null if out of bounds
   *
   * @example
   * ```typescript
   * const row = SafeAccess.getRow(project, 0);
   * if (row) {
   *   // Safe to use row
   *   processSteps(row.steps);
   * } else {
   *   console.log('Row not found');
   * }
   * ```
   */
  static getRow(
    project: Project | null | undefined,
    rowIndex: number
  ): Row | null {
    const rows = SafeAccess.getProjectRows(project);
    return rows[rowIndex] ?? null;
  }

  /**
   * Safely gets a specific step from a row with bounds checking.
   *
   * Performs boundary checking and validates the row has a valid steps array.
   *
   * @param row - The row (may be null/undefined)
   * @param stepIndex - Zero-based step index
   * @returns The Step at the specified index, or null if out of bounds
   *
   * @example
   * ```typescript
   * const step = SafeAccess.getStep(row, 2);
   * if (step) {
   *   // Safe to use step
   *   console.log(`${step.description}: ${step.count}`);
   * } else {
   *   console.log('Step not found');
   * }
   * ```
   */
  static getStep(row: Row | null | undefined, stepIndex: number): Step | null {
    if (!row?.steps || !Array.isArray(row.steps)) {
      return null;
    }
    return row.steps[stepIndex] ?? null;
  }

  /**
   * Safely calculates the total number of steps in a project.
   *
   * Counts all steps across all rows, handling invalid data gracefully.
   *
   * @param project - The project (may be null/undefined)
   * @returns Total number of steps (0 if project is invalid)
   *
   * @example
   * ```typescript
   * const totalSteps = SafeAccess.getTotalSteps(project);
   * console.log(`Project has ${totalSteps} total steps`);
   *
   * if (totalSteps === 0) {
   *   showEmptyProjectMessage();
   * }
   * ```
   */
  static getTotalSteps(project: Project | null | undefined): number {
    const rows = SafeAccess.getProjectRows(project);
    return rows.reduce((total, row) => total + (row.steps?.length ?? 0), 0);
  }

  /**
   * Validates if a position is within the bounds of a project.
   *
   * Checks that the position coordinates are valid for the given project's
   * structure. Useful for navigation and position validation.
   *
   * @param project - The project (may be null/undefined)
   * @param position - The position to validate
   * @returns True if position is valid within the project bounds
   *
   * @example
   * ```typescript
   * const userPosition = { row: 2, step: 5 };
   *
   * if (SafeAccess.isValidPosition(project, userPosition)) {
   *   // Safe to navigate to this position
   *   navigateToPosition(userPosition);
   * } else {
   *   console.log('Position is out of bounds');
   *   resetToStartPosition();
   * }
   * ```
   */
  static isValidPosition(
    project: Project | null | undefined,
    position: Position
  ): boolean {
    const rows = SafeAccess.getProjectRows(project);
    if (position.row < 0 || position.row >= rows.length) {
      return false;
    }
    const row = rows[position.row];
    return position.step >= 0 && position.step < (row?.steps?.length ?? 0);
  }
}

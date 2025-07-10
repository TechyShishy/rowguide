import { Project } from './project';
import { Row } from './row';
import { Step } from './step';
import { Position } from './position';
import { FLAM } from './flam';

/**
 * @fileoverview Type Guards for Null Safety
 *
 * This module provides TypeScript type guards and validation functions to ensure
 * null safety throughout the Rowguide application. These functions help prevent
 * runtime errors by validating data at runtime and providing type narrowing.
 *
 * ## Usage Examples
 *
 * ### Basic Type Validation
 * ```typescript
 * import { isProject, isValidProject } from './type-guards';
 *
 * function handleProjectData(data: unknown) {
 *   if (isProject(data)) {
 *     // TypeScript now knows 'data' is a Project
 *     console.log(`Project has ${data.rows.length} rows`);
 *   }
 * }
 * ```
 *
 * ### Conditional Property Access
 * ```typescript
 * import { hasValidId, hasName } from './type-guards';
 *
 * function processProject(project: Project) {
 *   if (hasValidId(project)) {
 *     // TypeScript knows project.id is a number
 *     await saveToDatabase(project.id);
 *   }
 *
 *   if (hasName(project)) {
 *     // TypeScript knows project.name is a string
 *     displayProjectName(project.name);
 *   }
 * }
 * ```
 *
 * ### Safe Data Processing
 * ```typescript
 * import { isValidProject, isEmptyProject } from './type-guards';
 *
 * function analyzeProject(project: Project) {
 *   if (!isValidProject(project)) {
 *     throw new Error('Invalid project data');
 *   }
 *
 *   if (isEmptyProject(project)) {
 *     console.log('Project has no content');
 *     return;
 *   }
 *
 *   // Safe to process project data
 *   processRows(project.rows);
 * }
 * ```
 */

/**
 * Type guard to check if a value is a valid Project.
 *
 * Validates that the value has the correct structure and all required properties.
 * This is the most comprehensive validation for Project objects.
 *
 * @param value - The value to check
 * @returns True if value is a valid Project with proper structure
 *
 * @example
 * ```typescript
 * const data = JSON.parse(apiResponse);
 * if (isProject(data)) {
 *   // TypeScript knows data is Project
 *   processProject(data);
 * } else {
 *   console.error('Invalid project data received');
 * }
 * ```
 */
export function isProject(value: unknown): value is Project {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Project).rows) &&
    (value as Project).rows.every(isRow)
  );
}

/**
 * Type guard to check if a value is a valid Row.
 *
 * Validates that the value has a numeric ID and an array of valid Steps.
 * Used internally by isProject() and can be used standalone for Row validation.
 *
 * @param value - The value to check
 * @returns True if value is a valid Row
 *
 * @example
 * ```typescript
 * const rowData = getRowFromApi();
 * if (isRow(rowData)) {
 *   // Safe to access row.id and row.steps
 *   console.log(`Row ${rowData.id} has ${rowData.steps.length} steps`);
 * }
 * ```
 */
export function isRow(value: unknown): value is Row {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Row).id === 'number' &&
    Array.isArray((value as Row).steps) &&
    (value as Row).steps.every(isStep)
  );
}

/**
 * Type guard to check if a value is a valid Step.
 *
 * Validates that the value has all required Step properties with correct types.
 * Ensures id and count are numbers, and description is a string.
 *
 * @param value - The value to check
 * @returns True if value is a valid Step
 *
 * @example
 * ```typescript
 * const stepData = parseStepFromFile();
 * if (isStep(stepData)) {
 *   // Safe to access all step properties
 *   console.log(`Step: ${stepData.description} x${stepData.count}`);
 * }
 * ```
 */
export function isStep(value: unknown): value is Step {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Step).id === 'number' &&
    typeof (value as Step).count === 'number' &&
    typeof (value as Step).description === 'string'
  );
}

/**
 * Type guard to check if a value is a valid Position.
 *
 * Validates that the value has numeric row and step coordinates.
 * Does not validate if the position is within bounds of a specific project.
 *
 * @param value - The value to check
 * @returns True if value is a valid Position
 *
 * @example
 * ```typescript
 * const positionData = getUserPosition();
 * if (isPosition(positionData)) {
 *   // Safe to access row and step
 *   navigateToPosition(positionData.row, positionData.step);
 * }
 * ```
 */
export function isPosition(value: unknown): value is Position {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Position).row === 'number' &&
    typeof (value as Position).step === 'number'
  );
}

/**
 * Type guard to check if a Project has a valid ID.
 *
 * Narrows the Project type to include a required numeric ID greater than 0.
 * Use this before database operations that require a valid project ID.
 *
 * @param project - The project to check
 * @returns True if project has a valid ID (number > 0)
 *
 * @example
 * ```typescript
 * function saveProject(project: Project) {
 *   if (hasValidId(project)) {
 *     // TypeScript knows project.id is a number
 *     await db.update(project.id, project);
 *   } else {
 *     // Create new project
 *     const id = await db.create(project);
 *     project.id = id;
 *   }
 * }
 * ```
 */
export function hasValidId(
  project: Project
): project is Project & { id: number } {
  return typeof project.id === 'number' && project.id > 0;
}

/**
 * Type guard to check if a Project has a valid position.
 *
 * Narrows the Project type to include a required Position object.
 * Use this when you need to access the current position in a project.
 *
 * @param project - The project to check
 * @returns True if project has a valid position
 *
 * @example
 * ```typescript
 * function displayCurrentPosition(project: Project) {
 *   if (hasPosition(project)) {
 *     // TypeScript knows project.position exists and is valid
 *     console.log(`Current position: Row ${project.position.row}, Step ${project.position.step}`);
 *   } else {
 *     console.log('No position set for this project');
 *   }
 * }
 * ```
 */
export function hasPosition(
  project: Project
): project is Project & { position: Position } {
  return project.position !== undefined && isPosition(project.position);
}

/**
 * Type guard to check if a Project has a valid name.
 *
 * Narrows the Project type to include a required non-empty string name.
 * Trims whitespace and ensures the name has actual content.
 *
 * @param project - The project to check
 * @returns True if project has a valid, non-empty name
 *
 * @example
 * ```typescript
 * function displayProjectTitle(project: Project) {
 *   if (hasName(project)) {
 *     // TypeScript knows project.name is a string
 *     document.title = project.name;
 *   } else {
 *     document.title = 'Untitled Project';
 *   }
 * }
 * ```
 */
export function hasName(
  project: Project
): project is Project & { name: string } {
  return typeof project.name === 'string' && project.name.trim().length > 0;
}

/**
 * Type guard to check if a Project has FLAM (First/Last Appearance Map) data.
 *
 * Narrows the Project type to include a required FLAM object.
 * FLAM data is used for advanced pattern analysis and step highlighting.
 *
 * @param project - The project to check
 * @returns True if project has FLAM data
 *
 * @example
 * ```typescript
 * function enableAdvancedFeatures(project: Project) {
 *   if (hasFlam(project)) {
 *     // TypeScript knows project.firstLastAppearanceMap exists
 *     showPatternAnalysis(project.firstLastAppearanceMap);
 *   } else {
 *     console.log('FLAM data not available for this project');
 *   }
 * }
 * ```
 */
export function hasFlam(
  project: Project
): project is Project & { firstLastAppearanceMap: FLAM } {
  return project.firstLastAppearanceMap !== undefined;
}

/**
 * Checks if a project is empty (has no content).
 *
 * A project is considered empty if it has no rows or if all rows have no steps.
 * This is useful for UI decisions and validation logic.
 *
 * @param project - The project to check
 * @returns True if project has no meaningful content
 *
 * @example
 * ```typescript
 * function handleEmptyProject(project: Project) {
 *   if (isEmptyProject(project)) {
 *     showWelcomeMessage();
 *     return;
 *   }
 *
 *   // Project has content, proceed with normal rendering
 *   renderProject(project);
 * }
 * ```
 */
export function isEmptyProject(project: Project): boolean {
  return (
    project.rows.length === 0 ||
    project.rows.every((row) => row.steps.length === 0)
  );
}

/**
 * Comprehensive validation for project data integrity.
 *
 * Checks if a project has the minimum required data to be considered valid
 * and usable in the application. This combines structure validation with
 * content validation.
 *
 * A project is valid if:
 * - It passes the isProject() structure validation
 * - It has at least one row
 * - At least one row contains steps
 *
 * @param project - The project to validate
 * @returns True if project is valid and ready for use
 *
 * @example
 * ```typescript
 * function loadProject(projectData: unknown) {
 *   if (!isProject(projectData)) {
 *     throw new Error('Invalid project structure');
 *   }
 *
 *   if (!isValidProject(projectData)) {
 *     throw new Error('Project has no content');
 *   }
 *
 *   // Safe to use project
 *   displayProject(projectData);
 * }
 * ```
 */
export function isValidProject(project: Project): boolean {
  return (
    isProject(project) &&
    project.rows.length > 0 &&
    project.rows.some((row) => row.steps.length > 0)
  );
}

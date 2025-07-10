import { Project } from './project';
import { Row } from './row';
import { Step } from './step';
import { Position } from './position';
import { FLAM } from './flam';

/**
 * Type guard to check if a value is a valid Project
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
 * Type guard to check if a value is a valid Row
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
 * Type guard to check if a value is a valid Step
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
 * Type guard to check if a value is a valid Position
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
 * Type guard to check if a Project has a valid ID
 */
export function hasValidId(
  project: Project
): project is Project & { id: number } {
  return typeof project.id === 'number' && project.id > 0;
}

/**
 * Type guard to check if a Project has a valid position
 */
export function hasPosition(
  project: Project
): project is Project & { position: Position } {
  return project.position !== undefined && isPosition(project.position);
}

/**
 * Type guard to check if a Project has valid name
 */
export function hasName(
  project: Project
): project is Project & { name: string } {
  return typeof project.name === 'string' && project.name.trim().length > 0;
}

/**
 * Type guard to check if a Project has FLAM data
 */
export function hasFlam(
  project: Project
): project is Project & { firstLastAppearanceMap: FLAM } {
  return project.firstLastAppearanceMap !== undefined;
}

/**
 * Checks if a project is empty (no rows or empty rows)
 */
export function isEmptyProject(project: Project): boolean {
  return (
    project.rows.length === 0 ||
    project.rows.every((row) => row.steps.length === 0)
  );
}

/**
 * Checks if a project has the minimum required data to be valid
 */
export function isValidProject(project: Project): boolean {
  return (
    isProject(project) &&
    project.rows.length > 0 &&
    project.rows.some((row) => row.steps.length > 0)
  );
}

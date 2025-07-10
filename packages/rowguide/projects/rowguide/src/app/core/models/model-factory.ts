import { Project } from './project';
import { Row } from './row';
import { Step } from './step';
import { Position } from './position';

/**
 * Default values for core domain objects
 */
export const DEFAULT_VALUES = {
  position: (): Position => ({ row: 0, step: 0 }),
  step: (id: number = 0): Step => ({
    id,
    count: 1,
    description: '',
  }),
  row: (id: number = 0): Row => ({
    id,
    steps: [],
  }),
  project: (): Project => ({
    rows: [],
    position: { row: 0, step: 0 },
  }),
} as const;

/**
 * Factory functions for creating safe instances
 */
export class ModelFactory {
  /**
   * Creates a safe Step with validated properties
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
   * Creates a safe Row with validated properties
   */
  static createRow(partial: Partial<Row> & Pick<Row, 'id'>): Row {
    return {
      ...DEFAULT_VALUES.row(),
      ...partial,
      steps: Array.isArray(partial.steps) ? partial.steps : [],
    };
  }

  /**
   * Creates a safe Project with validated properties
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
   * Creates a safe Position with validated coordinates
   */
  static createPosition(row: number = 0, step: number = 0): Position {
    return {
      row: Math.max(0, Math.floor(row)),
      step: Math.max(0, Math.floor(step)),
    };
  }
}

/**
 * Utility functions for safe access to optional properties
 */
export class SafeAccess {
  /**
   * Safely gets a project's ID or returns a default value
   */
  static getProjectId(
    project: Project | null | undefined,
    defaultValue: number = 0
  ): number {
    return project?.id ?? defaultValue;
  }

  /**
   * Safely gets a project's name or returns a default value
   */
  static getProjectName(
    project: Project | null | undefined,
    defaultValue: string = 'Untitled'
  ): string {
    return project?.name?.trim() || defaultValue;
  }

  /**
   * Safely gets a project's position or returns a default position
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
   * Safely gets a project's rows or returns empty array
   */
  static getProjectRows(project: Project | null | undefined): Row[] {
    return Array.isArray(project?.rows) ? project.rows : [];
  }

  /**
   * Safely gets a specific row from a project
   */
  static getRow(
    project: Project | null | undefined,
    rowIndex: number
  ): Row | null {
    const rows = SafeAccess.getProjectRows(project);
    return rows[rowIndex] ?? null;
  }

  /**
   * Safely gets a specific step from a row
   */
  static getStep(row: Row | null | undefined, stepIndex: number): Step | null {
    if (!row?.steps || !Array.isArray(row.steps)) {
      return null;
    }
    return row.steps[stepIndex] ?? null;
  }

  /**
   * Safely gets the total number of steps in a project
   */
  static getTotalSteps(project: Project | null | undefined): number {
    const rows = SafeAccess.getProjectRows(project);
    return rows.reduce((total, row) => total + (row.steps?.length ?? 0), 0);
  }

  /**
   * Safely checks if a position is valid for a given project
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

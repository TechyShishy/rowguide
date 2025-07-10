import { TestBed } from '@angular/core/testing';

import { isProject, isRow, isStep, hasValidId } from './type-guards';
import { ModelFactory, SafeAccess, DEFAULT_VALUES } from './model-factory';
import { Project } from './project';
import { Row } from './row';
import { Step } from './step';

describe('Type Guards and Null Safety', () => {
  describe('Type Guards', () => {
    it('should validate valid projects', () => {
      const validProject: Project = {
        rows: [
          {
            id: 1,
            steps: [{ id: 1, count: 1, description: 'test' }],
          },
        ],
      };

      expect(isProject(validProject)).toBe(true);
    });

    it('should reject invalid projects', () => {
      expect(isProject(null)).toBe(false);
      expect(isProject(undefined)).toBe(false);
      expect(isProject({})).toBe(false);
      expect(isProject({ rows: null })).toBe(false);
      expect(isProject({ rows: 'invalid' })).toBe(false);
    });

    it('should validate project with valid ID', () => {
      const project: Project = { id: 1, rows: [] };
      expect(hasValidId(project)).toBe(true);

      const projectWithoutId: Project = { rows: [] };
      expect(hasValidId(projectWithoutId)).toBe(false);

      const projectWithInvalidId: Project = { id: 0, rows: [] };
      expect(hasValidId(projectWithInvalidId)).toBe(false);
    });
  });

  describe('ModelFactory', () => {
    it('should create safe steps', () => {
      const step = ModelFactory.createStep({ id: 1 });
      expect(step.id).toBe(1);
      expect(step.count).toBe(1);
      expect(step.description).toBe('');

      // Should validate count
      const stepWithNegativeCount = ModelFactory.createStep({
        id: 2,
        count: -1,
      });
      expect(stepWithNegativeCount.count).toBe(1);
    });

    it('should create safe projects', () => {
      const project = ModelFactory.createProject();
      expect(Array.isArray(project.rows)).toBe(true);
      expect(project.position).toEqual({ row: 0, step: 0 });

      // Should handle invalid input
      const projectWithInvalidRows = ModelFactory.createProject({
        rows: null as any,
      });
      expect(Array.isArray(projectWithInvalidRows.rows)).toBe(true);
    });

    it('should create safe positions', () => {
      const position = ModelFactory.createPosition(-1, -5);
      expect(position.row).toBe(0);
      expect(position.step).toBe(0);

      const validPosition = ModelFactory.createPosition(2, 3);
      expect(validPosition.row).toBe(2);
      expect(validPosition.step).toBe(3);
    });
  });

  describe('SafeAccess', () => {
    it('should safely access project properties', () => {
      const project: Project = {
        id: 1,
        name: 'Test Project',
        rows: [
          {
            id: 1,
            steps: [{ id: 1, count: 1, description: 'step1' }],
          },
        ],
        position: { row: 0, step: 0 },
      };

      expect(SafeAccess.getProjectId(project)).toBe(1);
      expect(SafeAccess.getProjectName(project)).toBe('Test Project');
      expect(SafeAccess.getProjectRows(project)).toEqual(project.rows);
      expect(SafeAccess.getProjectPosition(project)).toEqual({
        row: 0,
        step: 0,
      });
    });

    it('should handle null/undefined projects', () => {
      expect(SafeAccess.getProjectId(null)).toBe(0);
      expect(SafeAccess.getProjectName(undefined)).toBe('Untitled');
      expect(SafeAccess.getProjectRows(null)).toEqual([]);
      expect(SafeAccess.getProjectPosition(undefined)).toEqual({
        row: 0,
        step: 0,
      });
    });

    it('should safely access rows and steps', () => {
      const project: Project = {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 1, description: 'step1' },
              { id: 2, count: 2, description: 'step2' },
            ],
          },
        ],
      };

      const row = SafeAccess.getRow(project, 0);
      expect(row).toBeTruthy();
      expect(row?.id).toBe(1);

      const step = SafeAccess.getStep(row, 1);
      expect(step).toBeTruthy();
      expect(step?.description).toBe('step2');

      // Should handle invalid indices
      expect(SafeAccess.getRow(project, 999)).toBeNull();
      expect(SafeAccess.getStep(row, 999)).toBeNull();
    });

    it('should validate positions', () => {
      const project: Project = {
        rows: [
          {
            id: 1,
            steps: [{ id: 1, count: 1, description: 'step1' }],
          },
        ],
      };

      expect(SafeAccess.isValidPosition(project, { row: 0, step: 0 })).toBe(
        true
      );
      expect(SafeAccess.isValidPosition(project, { row: 0, step: 1 })).toBe(
        false
      );
      expect(SafeAccess.isValidPosition(project, { row: 1, step: 0 })).toBe(
        false
      );
    });
  });

  describe('DEFAULT_VALUES', () => {
    it('should provide safe defaults', () => {
      const position = DEFAULT_VALUES.position();
      expect(position.row).toBe(0);
      expect(position.step).toBe(0);

      const step = DEFAULT_VALUES.step();
      expect(step.id).toBe(0);
      expect(step.count).toBe(1);
      expect(step.description).toBe('');

      const row = DEFAULT_VALUES.row();
      expect(row.id).toBe(0);
      expect(Array.isArray(row.steps)).toBe(true);

      const project = DEFAULT_VALUES.project();
      expect(Array.isArray(project.rows)).toBe(true);
      expect(project.position).toEqual({ row: 0, step: 0 });
    });
  });
});

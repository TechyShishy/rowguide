import { TestBed } from '@angular/core/testing';
import { ModelFactory, SafeAccess, DEFAULT_VALUES } from './model-factory';
import { Project } from './project';
import { Row } from './row';
import { Step } from './step';
import { Position } from './position';

describe('ModelFactory', () => {
  describe('DEFAULT_VALUES', () => {
    it('should provide consistent default values', () => {
      const defaultPosition = DEFAULT_VALUES.position();
      expect(defaultPosition).toEqual({ row: 0, step: 0 });

      const defaultStep = DEFAULT_VALUES.step(1);
      expect(defaultStep.id).toBe(1);
      expect(defaultStep.count).toBe(1);
      expect(defaultStep.description).toBe('');

      const defaultRow = DEFAULT_VALUES.row(1);
      expect(defaultRow.id).toBe(1);
      expect(defaultRow.steps).toEqual([]);

      const defaultProject = DEFAULT_VALUES.project();
      expect(defaultProject.rows).toEqual([]);
      expect(defaultProject.position).toEqual({ row: 0, step: 0 });
    });
  });

  describe('createStep', () => {
    it('should create a valid step with all required properties', () => {
      const stepData = {
        id: 1,
        count: 5,
        description: 'Chain 5',
      };

      const step = ModelFactory.createStep(stepData);

      expect(step.id).toBe(1);
      expect(step.count).toBe(5);
      expect(step.description).toBe('Chain 5');
    });

    it('should use defaults for missing properties', () => {
      const step = ModelFactory.createStep({ id: 1 });

      expect(step.id).toBe(1);
      expect(step.count).toBe(1); // Default count from factory
      expect(step.description).toBe('');
    });

    it('should validate step count is at least 1', () => {
      const step = ModelFactory.createStep({ id: 1, count: -5 });

      expect(step.count).toBe(1); // Negative becomes 1
    });

    it('should trim description', () => {
      const step = ModelFactory.createStep({ id: 1, description: '  Test  ' });

      expect(step.description).toBe('Test');
    });
  });

  describe('createRow', () => {
    it('should create a valid row with steps', () => {
      const rowData = {
        id: 1,
        steps: [
          { id: 1, count: 5, description: 'A' },
          { id: 2, count: 3, description: 'B' },
        ],
      };

      const row = ModelFactory.createRow(rowData);

      expect(row.id).toBe(1);
      expect(row.steps.length).toBe(2);
      expect(row.steps[0].description).toBe('A');
      expect(row.steps[1].description).toBe('B');
    });

    it('should create row with empty steps when not provided', () => {
      const row = ModelFactory.createRow({ id: 1 });

      expect(row.id).toBe(1);
      expect(row.steps).toEqual([]);
    });

    it('should handle invalid steps array safely', () => {
      const row = ModelFactory.createRow({ id: 1, steps: null as any });

      expect(row.id).toBe(1);
      expect(row.steps).toEqual([]);
    });
  });

  describe('createProject', () => {
    it('should create a valid project with all properties', () => {
      const projectData = {
        id: 1,
        name: 'Test Pattern',
        rows: [
          {
            id: 1,
            steps: [{ id: 1, count: 5, description: 'A' }],
          },
        ],
        position: { row: 0, step: 0 },
      };

      const project = ModelFactory.createProject(projectData);

      expect(project.id).toBe(1);
      expect(project.name).toBe('Test Pattern');
      expect(project.rows.length).toBe(1);
      expect(project.position).toEqual({ row: 0, step: 0 });
    });

    it('should create empty project with defaults when no data provided', () => {
      const project = ModelFactory.createProject({});

      expect(project.rows).toEqual([]);
      expect(project.position).toEqual({ row: 0, step: 0 });
    });

    it('should handle invalid rows array safely', () => {
      const project = ModelFactory.createProject({
        rows: null as any,
      });

      expect(project.rows).toEqual([]);
    });

    it('should trim whitespace from project name', () => {
      const project = ModelFactory.createProject({
        name: '  Test Project  ',
      });

      expect(project.name).toBe('Test Project');
    });
  });

  describe('createPosition', () => {
    it('should create a valid position', () => {
      const position = ModelFactory.createPosition(2, 3);

      expect(position.row).toBe(2);
      expect(position.step).toBe(3);
    });

    it('should use defaults for no parameters', () => {
      const position = ModelFactory.createPosition();

      expect(position.row).toBe(0);
      expect(position.step).toBe(0);
    });

    it('should ensure non-negative values', () => {
      const position = ModelFactory.createPosition(-1, -5);

      expect(position.row).toBe(0);
      expect(position.step).toBe(0);
    });

    it('should floor decimal values', () => {
      const position = ModelFactory.createPosition(2.7, 3.9);

      expect(position.row).toBe(2);
      expect(position.step).toBe(3);
    });
  });
});

describe('SafeAccess', () => {
  let mockProject: Project;

  beforeEach(() => {
    mockProject = {
      id: 1,
      name: 'Test Project',
      rows: [
        {
          id: 1,
          steps: [
            { id: 1, count: 5, description: 'A' },
            { id: 2, count: 3, description: 'B' },
          ],
        },
        {
          id: 2,
          steps: [{ id: 3, count: 2, description: 'C' }],
        },
      ],
      position: { row: 0, step: 1 },
    };
  });

  describe('getProjectId', () => {
    it('should return project id when valid', () => {
      const id = SafeAccess.getProjectId(mockProject);
      expect(id).toBe(1);
    });

    it('should return default when project is null', () => {
      const id = SafeAccess.getProjectId(null, 999);
      expect(id).toBe(999);
    });

    it('should return default when project has no id', () => {
      const projectWithoutId = { ...mockProject };
      delete projectWithoutId.id;

      const id = SafeAccess.getProjectId(projectWithoutId, 123);
      expect(id).toBe(123);
    });
  });

  describe('getProjectName', () => {
    it('should return project name when valid', () => {
      const name = SafeAccess.getProjectName(mockProject);
      expect(name).toBe('Test Project');
    });

    it('should return default when project is null', () => {
      const name = SafeAccess.getProjectName(null, 'Default Name');
      expect(name).toBe('Default Name');
    });

    it('should return default when name is empty', () => {
      const projectWithEmptyName = { ...mockProject, name: '' };
      const name = SafeAccess.getProjectName(projectWithEmptyName, 'Fallback');
      expect(name).toBe('Fallback');
    });
  });

  describe('getProjectRows', () => {
    it('should return rows when project is valid', () => {
      const rows = SafeAccess.getProjectRows(mockProject);
      expect(rows.length).toBe(2);
      expect(rows[0].id).toBe(1);
      expect(rows[1].id).toBe(2);
    });

    it('should return empty array when project is null', () => {
      const rows = SafeAccess.getProjectRows(null);
      expect(rows).toEqual([]);
    });

    it('should return empty array when rows is null', () => {
      const projectWithNullRows = { ...mockProject, rows: null as any };
      const rows = SafeAccess.getProjectRows(projectWithNullRows);
      expect(rows).toEqual([]);
    });
  });

  describe('getProjectPosition', () => {
    it('should return position when valid', () => {
      const position = SafeAccess.getProjectPosition(mockProject);
      expect(position).toEqual({ row: 0, step: 1 });
    });

    it('should return default position when project is null', () => {
      const position = SafeAccess.getProjectPosition(null);
      expect(position).toEqual({ row: 0, step: 0 });
    });

    it('should return default position when position is missing', () => {
      const projectWithoutPosition = { ...mockProject };
      delete projectWithoutPosition.position;

      const position = SafeAccess.getProjectPosition(projectWithoutPosition);
      expect(position).toEqual({ row: 0, step: 0 });
    });
  });

  describe('getRow', () => {
    it('should return row at valid index', () => {
      const row = SafeAccess.getRow(mockProject, 0);
      expect(row?.id).toBe(1);
      expect(row?.steps.length).toBe(2);
    });

    it('should return null for invalid index', () => {
      const row = SafeAccess.getRow(mockProject, 5);
      expect(row).toBeNull();
    });

    it('should return null when project is null', () => {
      const row = SafeAccess.getRow(null, 0);
      expect(row).toBeNull();
    });

    it('should return null for negative index', () => {
      const row = SafeAccess.getRow(mockProject, -1);
      expect(row).toBeNull();
    });
  });

  describe('getStep', () => {
    it('should return step at valid index', () => {
      const row = mockProject.rows[0];
      const step = SafeAccess.getStep(row, 1);
      expect(step?.id).toBe(2);
      expect(step?.description).toBe('B');
    });

    it('should return null for invalid index', () => {
      const row = mockProject.rows[0];
      const step = SafeAccess.getStep(row, 5);
      expect(step).toBeNull();
    });

    it('should return null when row is null', () => {
      const step = SafeAccess.getStep(null, 0);
      expect(step).toBeNull();
    });
  });

  describe('getTotalSteps', () => {
    it('should return total step count for valid project', () => {
      const total = SafeAccess.getTotalSteps(mockProject);
      expect(total).toBe(3); // 2 + 1 steps across all rows
    });

    it('should return 0 for null project', () => {
      const total = SafeAccess.getTotalSteps(null);
      expect(total).toBe(0);
    });

    it('should return 0 for project with no rows', () => {
      const emptyProject = { ...mockProject, rows: [] };
      const total = SafeAccess.getTotalSteps(emptyProject);
      expect(total).toBe(0);
    });
  });
});

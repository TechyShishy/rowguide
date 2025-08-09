import { TestBed } from '@angular/core/testing';
import { ProjectCalculationService } from './project-calculation.service';
import { Project } from '../../../core/models/project';
import { Row } from '../../../core/models/row';
import { Step } from '../../../core/models/step';
import { FLAM } from '../../../core/models/flam';

describe('ProjectCalculationService', () => {
  let service: ProjectCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('longestRow', () => {
    it('should return 0 for null project', () => {
      expect(service.longestRow(null)).toBe(0);
    });

    it('should return 0 for undefined project', () => {
      expect(service.longestRow(undefined)).toBe(0);
    });

    it('should return 0 for project with no rows', () => {
      const project: Project = { rows: [] };
      expect(service.longestRow(project)).toBe(0);
    });

    it('should return 0 for project with empty rows', () => {
      const project: Project = {
        rows: [
          { id: 1, steps: [] } as Row
        ]
      };
      expect(service.longestRow(project)).toBe(0);
    });

    it('should calculate longest row correctly', () => {
      const project: Project = {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 3, description: 'A' } as Step,
              { id: 2, count: 2, description: 'B' } as Step
            ]
          } as Row,
          {
            id: 2,
            steps: [
              { id: 3, count: 4, description: 'C' } as Step,
              { id: 4, count: 6, description: 'D' } as Step,
              { id: 5, count: 1, description: 'E' } as Step
            ]
          } as Row
        ]
      };

      // Row 1: 3 + 2 = 5 beads
      // Row 2: 4 + 6 + 1 = 11 beads
      expect(service.longestRow(project)).toBe(11);
    });

    it('should handle steps with zero or undefined counts', () => {
      const project: Project = {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 0, description: 'A' } as Step,
              { id: 2, count: undefined as unknown, description: 'B' } as unknown as Step,
              { id: 3, count: 5, description: 'C' } as Step
            ]
          } as Row
        ]
      };

      expect(service.longestRow(project)).toBe(5);
    });
  });

  describe('totalBeads', () => {
    it('should return 0 for null project', () => {
      expect(service.totalBeads(null)).toBe(0);
    });

    it('should return 0 for undefined project', () => {
      expect(service.totalBeads(undefined)).toBe(0);
    });

    it('should return 0 for project with no rows', () => {
      const project: Project = { rows: [] };
      expect(service.totalBeads(project)).toBe(0);
    });

    it('should calculate total beads correctly', () => {
      const project: Project = {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 3, description: 'A' } as Step,
              { id: 2, count: 2, description: 'B' } as Step
            ]
          } as Row,
          {
            id: 2,
            steps: [
              { id: 3, count: 4, description: 'C' } as Step,
              { id: 4, count: 1, description: 'D' } as Step
            ]
          } as Row
        ]
      };

      // Total: 3 + 2 + 4 + 1 = 10 beads
      expect(service.totalBeads(project)).toBe(10);
    });

    it('should handle empty rows gracefully', () => {
      const project: Project = {
        rows: [
          { id: 1, steps: [] } as Row,
          {
            id: 2,
            steps: [
              { id: 3, count: 5, description: 'A' } as Step
            ]
          } as Row
        ]
      };

      expect(service.totalBeads(project)).toBe(5);
    });
  });

  describe('totalColors', () => {
    it('should return 0 for null project', () => {
      expect(service.totalColors(null)).toBe(0);
    });

    it('should return 0 for undefined project', () => {
      expect(service.totalColors(undefined)).toBe(0);
    });

    it('should return 0 for project with no rows', () => {
      const project: Project = { rows: [] };
      expect(service.totalColors(project)).toBe(0);
    });

    it('should use FLAM when available', () => {
      const flam: FLAM = {
        'A': { key: 'A', firstAppearance: [0], lastAppearance: [1], count: 5 },
        'B': { key: 'B', firstAppearance: [0], lastAppearance: [1], count: 3 },
        'C': { key: 'C', firstAppearance: [1], lastAppearance: [1], count: 2 }
      };

      const project: Project = {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 3, description: 'A' } as Step,
              { id: 2, count: 2, description: 'B' } as Step
            ]
          } as Row
        ],
        firstLastAppearanceMap: flam
      };

      expect(service.totalColors(project)).toBe(3); // A, B, C from FLAM
    });

    it('should count unique descriptions when FLAM not available', () => {
      const project: Project = {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 3, description: 'A' } as Step,
              { id: 2, count: 2, description: 'B' } as Step,
              { id: 3, count: 1, description: 'A' } as Step // Duplicate description
            ]
          } as Row,
          {
            id: 2,
            steps: [
              { id: 4, count: 4, description: 'C' } as Step,
              { id: 5, count: 1, description: 'B' } as Step // Duplicate description
            ]
          } as Row
        ]
      };

      // Unique descriptions: A, B, C = 3 colors
      expect(service.totalColors(project)).toBe(3);
    });

    it('should handle steps with missing descriptions', () => {
      const project: Project = {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 3, description: 'A' } as Step,
              { id: 2, count: 2, description: '' } as Step, // Empty description
              { id: 3, count: 1, description: undefined as unknown } as unknown as Step, // Undefined description
              { id: 4, count: 2, description: 'B' } as Step
            ]
          } as Row
        ]
      };

      // Only A and B should be counted
      expect(service.totalColors(project)).toBe(2);
    });

    it('should prefer FLAM over direct counting for performance', () => {
      const flam: FLAM = {
        'X': { key: 'X', firstAppearance: [0], lastAppearance: [0], count: 10 }
      };

      const project: Project = {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 3, description: 'A' } as Step,
              { id: 2, count: 2, description: 'B' } as Step,
              { id: 3, count: 1, description: 'C' } as Step
            ]
          } as Row
        ],
        firstLastAppearanceMap: flam
      };

      // Should use FLAM (1 color) instead of counting steps (3 colors)
      expect(service.totalColors(project)).toBe(1);
    });
  });
});

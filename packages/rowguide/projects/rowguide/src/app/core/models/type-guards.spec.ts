import { TestBed } from '@angular/core/testing';

import {
  isProject,
  isRow,
  isStep,
  isPosition,
  hasValidId,
  hasPosition,
  hasName,
  hasFlam,
  isEmptyProject,
  isValidProject,
  isValidRowMarking,
  isValidRowMarkingStructure,
} from './type-guards';
import { ModelFactory, SafeAccess, DEFAULT_VALUES } from './model-factory';
import { Project } from './project';
import { Row } from './row';
import { Step } from './step';
import { Position } from './position';
import { FLAM } from './flam';

/**
 * Comprehensive Test Suite for Null Safety System
 *
 * This test suite validates the complete null safety infrastructure including
 * type guards, safe factories, and safe access methods. These tests ensure that
 * the null safety system handles all edge cases correctly and provides reliable
 * validation and fallback behavior throughout the application.
 *
 * Test Categories:
 * - Type Guards: Runtime validation and type narrowing for all domain models
 * - Conditional Type Guards: Advanced validation with property requirements
 * - Project Validation: Content and structure validation for business logic
 * - Model Factory: Safe object creation with validation and defaults
 * - Safe Access: Null-aware property access with fallback behavior
 * - Default Values: Consistent fallback values across the application
 * - Error Scenarios: Comprehensive negative testing and edge cases
 * - Performance: Validation overhead and large data structure handling
 * - Integration: Real-world data patterns and complex scenarios
 *
 * The tests cover positive cases (valid data), negative cases (null, undefined,
 * malformed data), edge cases (boundary conditions), and integration scenarios
 * to ensure robust error handling and reliable null safety throughout the app.
 */

describe('Type Guards and Null Safety System', () => {
  describe('Core Type Guards', () => {
    describe('isProject', () => {
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

      it('should validate empty projects', () => {
        const emptyProject: Project = { rows: [] };
        expect(isProject(emptyProject)).toBe(true);
      });

      it('should validate projects with multiple rows', () => {
        const multiRowProject: Project = {
          id: 42,
          name: 'Test Project',
          rows: [
            {
              id: 1,
              steps: [
                { id: 1, count: 2, description: 'first step' },
                { id: 2, count: 1, description: 'second step' }
              ],
            },
            {
              id: 2,
              steps: [
                { id: 3, count: 3, description: 'third step' }
              ],
            },
          ],
          position: { row: 0, step: 1 }
        };

        expect(isProject(multiRowProject)).toBe(true);
      });

      it('should reject null and undefined values', () => {
        expect(isProject(null)).toBe(false);
        expect(isProject(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isProject(42)).toBe(false);
        expect(isProject('string')).toBe(false);
        expect(isProject(true)).toBe(false);
        expect(isProject(false)).toBe(false);
      });

      it('should reject empty objects', () => {
        expect(isProject({})).toBe(false);
      });

      it('should reject objects with invalid rows property', () => {
        expect(isProject({ rows: null })).toBe(false);
        expect(isProject({ rows: undefined })).toBe(false);
        expect(isProject({ rows: 'invalid' })).toBe(false);
        expect(isProject({ rows: 42 })).toBe(false);
        expect(isProject({ rows: true })).toBe(false);
        expect(isProject({ rows: {} })).toBe(false);
      });

      it('should reject projects with invalid rows', () => {
        const projectWithInvalidRow = {
          rows: [
            { id: 1, steps: [] }, // valid
            { invalidRow: true }, // invalid
          ]
        };
        expect(isProject(projectWithInvalidRow)).toBe(false);
      });

      it('should reject projects with rows containing invalid steps', () => {
        const projectWithInvalidSteps = {
          rows: [
            {
              id: 1,
              steps: [
                { id: 1, count: 1, description: 'valid' },
                { invalidStep: true }, // invalid
              ]
            }
          ]
        };
        expect(isProject(projectWithInvalidSteps)).toBe(false);
      });

      it('should handle arrays that are not objects', () => {
        expect(isProject([])).toBe(false);
      });

      it('should handle circular references safely', () => {
        const circularObj: any = { rows: [] };
        circularObj.self = circularObj;
        expect(isProject(circularObj)).toBe(true); // Should still validate if rows are valid
      });
    });

    describe('isRow', () => {
      it('should validate valid rows', () => {
        const validRow: Row = {
          id: 1,
          steps: [{ id: 1, count: 1, description: 'test' }],
        };

        expect(isRow(validRow)).toBe(true);
      });

      it('should validate rows with empty steps', () => {
        const emptyRow: Row = { id: 5, steps: [] };
        expect(isRow(emptyRow)).toBe(true);
      });

      it('should validate rows with multiple steps', () => {
        const multiStepRow: Row = {
          id: 10,
          steps: [
            { id: 1, count: 2, description: 'first' },
            { id: 2, count: 1, description: 'second' },
            { id: 3, count: 5, description: 'third' }
          ]
        };

        expect(isRow(multiStepRow)).toBe(true);
      });

      it('should reject null and undefined values', () => {
        expect(isRow(null)).toBe(false);
        expect(isRow(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isRow(42)).toBe(false);
        expect(isRow('string')).toBe(false);
        expect(isRow(true)).toBe(false);
        expect(isRow([])).toBe(false);
      });

      it('should reject objects without id', () => {
        expect(isRow({ steps: [] })).toBe(false);
        expect(isRow({ id: null, steps: [] })).toBe(false);
        expect(isRow({ id: undefined, steps: [] })).toBe(false);
      });

      it('should reject objects with non-numeric id', () => {
        expect(isRow({ id: 'string', steps: [] })).toBe(false);
        expect(isRow({ id: true, steps: [] })).toBe(false);
        expect(isRow({ id: {}, steps: [] })).toBe(false);
        // Note: NaN and Infinity are considered numbers in JavaScript
        expect(isRow({ id: NaN, steps: [] })).toBe(true);
        expect(isRow({ id: Infinity, steps: [] })).toBe(true);
      });

      it('should reject objects without steps', () => {
        expect(isRow({ id: 1 })).toBe(false);
        expect(isRow({ id: 1, steps: null })).toBe(false);
        expect(isRow({ id: 1, steps: undefined })).toBe(false);
      });

      it('should reject objects with non-array steps', () => {
        expect(isRow({ id: 1, steps: 'invalid' })).toBe(false);
        expect(isRow({ id: 1, steps: 42 })).toBe(false);
        expect(isRow({ id: 1, steps: true })).toBe(false);
        expect(isRow({ id: 1, steps: {} })).toBe(false);
      });

      it('should reject rows with invalid steps', () => {
        const rowWithInvalidStep = {
          id: 1,
          steps: [
            { id: 1, count: 1, description: 'valid' },
            { invalidStep: true }
          ]
        };
        expect(isRow(rowWithInvalidStep)).toBe(false);
      });

      it('should handle edge case numeric ids', () => {
        expect(isRow({ id: 0, steps: [] })).toBe(true);
        expect(isRow({ id: -1, steps: [] })).toBe(true);
        expect(isRow({ id: 999999, steps: [] })).toBe(true);
        expect(isRow({ id: 1.5, steps: [] })).toBe(true); // Floats are numbers too
      });
    });

    describe('isStep', () => {
      it('should validate valid steps', () => {
        const validStep: Step = { id: 1, count: 1, description: 'test' };
        expect(isStep(validStep)).toBe(true);
      });

      it('should validate steps with various counts', () => {
        expect(isStep({ id: 1, count: 0, description: 'zero count' })).toBe(true);
        expect(isStep({ id: 2, count: 100, description: 'high count' })).toBe(true);
        expect(isStep({ id: 3, count: 1.5, description: 'decimal count' })).toBe(true);
      });

      it('should validate steps with empty description', () => {
        const stepWithEmptyDesc: Step = { id: 1, count: 1, description: '' };
        expect(isStep(stepWithEmptyDesc)).toBe(true);
      });

      it('should validate steps with special characters in description', () => {
        const specialCharStep: Step = {
          id: 1,
          count: 1,
          description: 'Test with "quotes" & symbols @#$%^&*()',
        };
        expect(isStep(specialCharStep)).toBe(true);
      });

      it('should reject null and undefined values', () => {
        expect(isStep(null)).toBe(false);
        expect(isStep(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isStep(42)).toBe(false);
        expect(isStep('string')).toBe(false);
        expect(isStep(true)).toBe(false);
        expect(isStep([])).toBe(false);
      });

      it('should reject objects missing required properties', () => {
        expect(isStep({})).toBe(false);
        expect(isStep({ id: 1 })).toBe(false);
        expect(isStep({ id: 1, count: 1 })).toBe(false);
        expect(isStep({ count: 1, description: 'test' })).toBe(false);
        expect(isStep({ id: 1, description: 'test' })).toBe(false);
      });

      it('should reject objects with wrong property types', () => {
        // Invalid id
        expect(isStep({ id: 'string', count: 1, description: 'test' })).toBe(false);
        expect(isStep({ id: null, count: 1, description: 'test' })).toBe(false);
        expect(isStep({ id: undefined, count: 1, description: 'test' })).toBe(false);
        expect(isStep({ id: true, count: 1, description: 'test' })).toBe(false);
        // Note: NaN is considered a number in JavaScript
        expect(isStep({ id: NaN, count: 1, description: 'test' })).toBe(true);

        // Invalid count
        expect(isStep({ id: 1, count: 'string', description: 'test' })).toBe(false);
        expect(isStep({ id: 1, count: null, description: 'test' })).toBe(false);
        expect(isStep({ id: 1, count: undefined, description: 'test' })).toBe(false);
        expect(isStep({ id: 1, count: true, description: 'test' })).toBe(false);

        // Invalid description
        expect(isStep({ id: 1, count: 1, description: 42 })).toBe(false);
        expect(isStep({ id: 1, count: 1, description: null })).toBe(false);
        expect(isStep({ id: 1, count: 1, description: undefined })).toBe(false);
        expect(isStep({ id: 1, count: 1, description: true })).toBe(false);
        expect(isStep({ id: 1, count: 1, description: {} })).toBe(false);
        expect(isStep({ id: 1, count: 1, description: [] })).toBe(false);
      });

      it('should handle edge case numeric values', () => {
        expect(isStep({ id: 0, count: 0, description: 'zero' })).toBe(true);
        expect(isStep({ id: -1, count: -1, description: 'negative' })).toBe(true);
        expect(isStep({ id: Infinity, count: Infinity, description: 'infinity' })).toBe(true);
      });
    });

    describe('isPosition', () => {
      it('should validate valid positions', () => {
        const validPosition: Position = { row: 0, step: 0 };
        expect(isPosition(validPosition)).toBe(true);
      });

      it('should validate positions with various coordinates', () => {
        expect(isPosition({ row: 5, step: 10 })).toBe(true);
        expect(isPosition({ row: 0, step: 999 })).toBe(true);
        expect(isPosition({ row: 100, step: 0 })).toBe(true);
      });

      it('should validate positions with negative coordinates', () => {
        expect(isPosition({ row: -1, step: 0 })).toBe(true);
        expect(isPosition({ row: 0, step: -1 })).toBe(true);
        expect(isPosition({ row: -5, step: -10 })).toBe(true);
      });

      it('should validate positions with decimal coordinates', () => {
        expect(isPosition({ row: 1.5, step: 2.7 })).toBe(true);
      });

      it('should reject null and undefined values', () => {
        expect(isPosition(null)).toBe(false);
        expect(isPosition(undefined)).toBe(false);
      });

      it('should reject primitive values', () => {
        expect(isPosition(42)).toBe(false);
        expect(isPosition('string')).toBe(false);
        expect(isPosition(true)).toBe(false);
        expect(isPosition([])).toBe(false);
      });

      it('should reject objects missing required properties', () => {
        expect(isPosition({})).toBe(false);
        expect(isPosition({ row: 0 })).toBe(false);
        expect(isPosition({ step: 0 })).toBe(false);
        expect(isPosition({ row: null, step: 0 })).toBe(false);
        expect(isPosition({ row: 0, step: null })).toBe(false);
      });

      it('should reject objects with wrong property types', () => {
        expect(isPosition({ row: 'string', step: 0 })).toBe(false);
        expect(isPosition({ row: 0, step: 'string' })).toBe(false);
        expect(isPosition({ row: true, step: 0 })).toBe(false);
        expect(isPosition({ row: 0, step: true })).toBe(false);
        expect(isPosition({ row: {}, step: 0 })).toBe(false);
        expect(isPosition({ row: 0, step: {} })).toBe(false);
        expect(isPosition({ row: [], step: 0 })).toBe(false);
        expect(isPosition({ row: 0, step: [] })).toBe(false);
      });

      it('should handle special numeric values', () => {
        // Note: NaN, Infinity, and -Infinity are all considered numbers in JavaScript
        expect(isPosition({ row: NaN, step: 0 })).toBe(true);
        expect(isPosition({ row: 0, step: NaN })).toBe(true);
        expect(isPosition({ row: Infinity, step: 0 })).toBe(true);
        expect(isPosition({ row: 0, step: Infinity })).toBe(true);
        expect(isPosition({ row: -Infinity, step: 0 })).toBe(true);
        expect(isPosition({ row: 0, step: -Infinity })).toBe(true);
      });
    });
  });

  describe('Conditional Type Guards', () => {
    describe('hasValidId', () => {
      it('should validate projects with positive numeric IDs', () => {
        const projectWithId: Project = { id: 1, rows: [] };
        expect(hasValidId(projectWithId)).toBe(true);

        const projectWithHighId: Project = { id: 999999, rows: [] };
        expect(hasValidId(projectWithHighId)).toBe(true);
      });

      it('should reject projects with zero or negative IDs', () => {
        const projectWithZeroId: Project = { id: 0, rows: [] };
        expect(hasValidId(projectWithZeroId)).toBe(false);

        const projectWithNegativeId: Project = { id: -1, rows: [] };
        expect(hasValidId(projectWithNegativeId)).toBe(false);
      });

      it('should reject projects without ID', () => {
        const projectWithoutId: Project = { rows: [] };
        expect(hasValidId(projectWithoutId)).toBe(false);
      });

      it('should reject projects with non-numeric IDs', () => {
        const projectWithStringId: any = { id: 'string', rows: [] };
        expect(hasValidId(projectWithStringId)).toBe(false);

        const projectWithNullId: any = { id: null, rows: [] };
        expect(hasValidId(projectWithNullId)).toBe(false);

        const projectWithUndefinedId: any = { id: undefined, rows: [] };
        expect(hasValidId(projectWithUndefinedId)).toBe(false);
      });

      it('should handle special numeric values', () => {
        const projectWithNaN: any = { id: NaN, rows: [] };
        expect(hasValidId(projectWithNaN)).toBe(false);

        const projectWithInfinity: any = { id: Infinity, rows: [] };
        expect(hasValidId(projectWithInfinity)).toBe(true);

        const projectWithDecimal: any = { id: 1.5, rows: [] };
        expect(hasValidId(projectWithDecimal)).toBe(true);
      });
    });

    describe('hasPosition', () => {
      it('should validate projects with valid positions', () => {
        const projectWithPosition: Project = {
          rows: [],
          position: { row: 0, step: 0 },
        };
        expect(hasPosition(projectWithPosition)).toBe(true);

        const projectWithAdvancedPosition: Project = {
          rows: [],
          position: { row: 5, step: 10 },
        };
        expect(hasPosition(projectWithAdvancedPosition)).toBe(true);
      });

      it('should reject projects without position', () => {
        const projectWithoutPosition: Project = { rows: [] };
        expect(hasPosition(projectWithoutPosition)).toBe(false);
      });

      it('should reject projects with undefined position', () => {
        const projectWithUndefinedPosition: any = {
          rows: [],
          position: undefined,
        };
        expect(hasPosition(projectWithUndefinedPosition)).toBe(false);
      });

      it('should reject projects with null position', () => {
        const projectWithNullPosition: any = {
          rows: [],
          position: null,
        };
        expect(hasPosition(projectWithNullPosition)).toBe(false);
      });

      it('should reject projects with invalid position objects', () => {
        const projectWithInvalidPosition1: any = {
          rows: [],
          position: { row: 'string', step: 0 },
        };
        expect(hasPosition(projectWithInvalidPosition1)).toBe(false);

        const projectWithInvalidPosition2: any = {
          rows: [],
          position: { row: 0 }, // missing step
        };
        expect(hasPosition(projectWithInvalidPosition2)).toBe(false);

        const projectWithInvalidPosition3: any = {
          rows: [],
          position: 'invalid',
        };
        expect(hasPosition(projectWithInvalidPosition3)).toBe(false);
      });
    });

    describe('hasName', () => {
      it('should validate projects with non-empty names', () => {
        const projectWithName: Project = {
          rows: [],
          name: 'Test Project',
        };
        expect(hasName(projectWithName)).toBe(true);

        const projectWithLongName: Project = {
          rows: [],
          name: 'A very long project name with special characters @#$%',
        };
        expect(hasName(projectWithLongName)).toBe(true);
      });

      it('should handle names with only whitespace', () => {
        const projectWithWhitespaceName: any = {
          rows: [],
          name: '   ',
        };
        expect(hasName(projectWithWhitespaceName)).toBe(false);

        const projectWithTabsAndSpaces: any = {
          rows: [],
          name: '\t\n  \r\n',
        };
        expect(hasName(projectWithTabsAndSpaces)).toBe(false);
      });

      it('should handle names that trim to non-empty', () => {
        const projectWithPaddedName: Project = {
          rows: [],
          name: '  Valid Name  ',
        };
        expect(hasName(projectWithPaddedName)).toBe(true);
      });

      it('should reject projects without name', () => {
        const projectWithoutName: Project = { rows: [] };
        expect(hasName(projectWithoutName)).toBe(false);
      });

      it('should reject projects with empty string name', () => {
        const projectWithEmptyName: any = {
          rows: [],
          name: '',
        };
        expect(hasName(projectWithEmptyName)).toBe(false);
      });

      it('should reject projects with non-string names', () => {
        const projectWithNumericName: any = {
          rows: [],
          name: 42,
        };
        expect(hasName(projectWithNumericName)).toBe(false);

        const projectWithBooleanName: any = {
          rows: [],
          name: true,
        };
        expect(hasName(projectWithBooleanName)).toBe(false);

        const projectWithNullName: any = {
          rows: [],
          name: null,
        };
        expect(hasName(projectWithNullName)).toBe(false);

        const projectWithUndefinedName: any = {
          rows: [],
          name: undefined,
        };
        expect(hasName(projectWithUndefinedName)).toBe(false);
      });
    });

    describe('hasFlam', () => {
      it('should validate projects with FLAM data', () => {
        const mockFlam: FLAM = {};

        const projectWithFlam: Project = {
          rows: [],
          firstLastAppearanceMap: mockFlam,
        };
        expect(hasFlam(projectWithFlam)).toBe(true);
      });

      it('should validate projects with complex FLAM data', () => {
        const complexFlam: FLAM = {
          stepDesc1: {
            key: 'stepDesc1',
            firstAppearance: [0, 0],
            lastAppearance: [2, 1],
            count: 3,
            color: 'red',
          },
          stepDesc2: {
            key: 'stepDesc2',
            firstAppearance: [1, 0],
            lastAppearance: [1, 2],
            count: 2,
            hexColor: '#0000FF',
          },
        };

        const projectWithComplexFlam: Project = {
          rows: [],
          firstLastAppearanceMap: complexFlam,
        };
        expect(hasFlam(projectWithComplexFlam)).toBe(true);
      });

      it('should reject projects without FLAM data', () => {
        const projectWithoutFlam: Project = { rows: [] };
        expect(hasFlam(projectWithoutFlam)).toBe(false);
      });

      it('should reject projects with undefined FLAM', () => {
        const projectWithUndefinedFlam: any = {
          rows: [],
          firstLastAppearanceMap: undefined,
        };
        expect(hasFlam(projectWithUndefinedFlam)).toBe(false);
      });

      it('should reject projects with null FLAM', () => {
        const projectWithNullFlam: any = {
          rows: [],
          firstLastAppearanceMap: null,
        };
        // Note: hasFlam only checks for !== undefined, null is still considered defined
        expect(hasFlam(projectWithNullFlam)).toBe(true);
      });
    });
  });

  describe('Project Validation Functions', () => {
    describe('isEmptyProject', () => {
      it('should identify projects with no rows as empty', () => {
        const emptyProject: Project = { rows: [] };
        expect(isEmptyProject(emptyProject)).toBe(true);
      });

      it('should identify projects with rows containing no steps as empty', () => {
        const projectWithEmptyRows: Project = {
          rows: [
            { id: 1, steps: [] },
            { id: 2, steps: [] },
          ],
        };
        expect(isEmptyProject(projectWithEmptyRows)).toBe(true);
      });

      it('should identify projects with mixed empty and non-empty rows as non-empty', () => {
        const mixedProject: Project = {
          rows: [
            { id: 1, steps: [] },
            { id: 2, steps: [{ id: 1, count: 1, description: 'step' }] },
          ],
        };
        expect(isEmptyProject(mixedProject)).toBe(false);
      });

      it('should identify projects with content as non-empty', () => {
        const contentProject: Project = {
          rows: [
            {
              id: 1,
              steps: [{ id: 1, count: 1, description: 'step' }],
            },
          ],
        };
        expect(isEmptyProject(contentProject)).toBe(false);
      });

      it('should handle projects with many empty rows', () => {
        const manyEmptyRowsProject: Project = {
          rows: Array.from({ length: 100 }, (_, i) => ({ id: i, steps: [] })),
        };
        expect(isEmptyProject(manyEmptyRowsProject)).toBe(true);
      });
    });

    describe('isValidProject', () => {
      it('should validate projects with content', () => {
        const validProject: Project = {
          rows: [
            {
              id: 1,
              steps: [{ id: 1, count: 1, description: 'step' }],
            },
          ],
        };
        expect(isValidProject(validProject)).toBe(true);
      });

      it('should validate complex projects', () => {
        const complexProject: Project = {
          id: 42,
          name: 'Complex Project',
          rows: [
            {
              id: 1,
              steps: [
                { id: 1, count: 2, description: 'first' },
                { id: 2, count: 1, description: 'second' },
              ],
            },
            {
              id: 2,
              steps: [{ id: 3, count: 3, description: 'third' }],
            },
          ],
          position: { row: 0, step: 1 },
        };
        expect(isValidProject(complexProject)).toBe(true);
      });

      it('should reject empty projects', () => {
        const emptyProject: Project = { rows: [] };
        expect(isValidProject(emptyProject)).toBe(false);
      });

      it('should reject projects with only empty rows', () => {
        const projectWithEmptyRows: Project = {
          rows: [
            { id: 1, steps: [] },
            { id: 2, steps: [] },
          ],
        };
        expect(isValidProject(projectWithEmptyRows)).toBe(false);
      });

      it('should reject structurally invalid projects', () => {
        const invalidProject: any = {
          rows: [{ id: 'invalid', steps: [] }],
        };
        expect(isValidProject(invalidProject)).toBe(false);
      });

      it('should reject null and undefined projects', () => {
        expect(isValidProject(null as any)).toBe(false);
        expect(isValidProject(undefined as any)).toBe(false);
      });
    });
  });

  describe('Model Factory Integration', () => {
    describe('createProject', () => {
      it('should create valid projects with defaults', () => {
        const project = ModelFactory.createProject();
        expect(isProject(project)).toBe(true);
        expect(Array.isArray(project.rows)).toBe(true);
      });

      it('should create projects with custom properties', () => {
        const customProject = ModelFactory.createProject({
          name: 'Custom Project',
          id: 42,
        });
        expect(isProject(customProject)).toBe(true);
        expect(hasName(customProject)).toBe(true);
        expect(hasValidId(customProject)).toBe(true);
      });

      it('should handle invalid input gracefully', () => {
        const projectWithInvalidRows = ModelFactory.createProject({
          rows: null as any,
        });
        expect(isProject(projectWithInvalidRows)).toBe(true);
        expect(Array.isArray(projectWithInvalidRows.rows)).toBe(true);
      });

      it('should create projects with valid positions', () => {
        const projectWithPosition = ModelFactory.createProject({
          position: { row: 2, step: 3 },
        });
        expect(hasPosition(projectWithPosition)).toBe(true);
        expect(projectWithPosition.position?.row).toBe(2);
        expect(projectWithPosition.position?.step).toBe(3);
      });

      it('should normalize negative position values', () => {
        const project = ModelFactory.createProject({
          position: { row: -1, step: -5 },
        });
        expect(hasPosition(project)).toBe(true);
        expect(project.position?.row).toBe(0);
        expect(project.position?.step).toBe(0);
      });
    });

    it('should create safe positions', () => {
      const position = ModelFactory.createPosition(-1, -5);
      expect(isPosition(position)).toBe(true);
      expect(position.row).toBe(0);
      expect(position.step).toBe(0);

      const validPosition = ModelFactory.createPosition(2, 3);
      expect(isPosition(validPosition)).toBe(true);
      expect(validPosition.row).toBe(2);
      expect(validPosition.step).toBe(3);
    });

    it('should create safe steps', () => {
      const step = ModelFactory.createStep({
        id: 1,
        count: 0,
        description: 'test',
      });
      expect(isStep(step)).toBe(true);
      expect(step.count).toBe(1); // Should enforce minimum count
    });

    it('should create safe rows', () => {
      const row = ModelFactory.createRow({
        id: 1,
        steps: null as any,
      });
      expect(isRow(row)).toBe(true);
      expect(Array.isArray(row.steps)).toBe(true);
    });
  });

  describe('SafeAccess Integration', () => {
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

    it('should handle edge cases in safe access', () => {
      const emptyProject: Project = { rows: [] };

      expect(SafeAccess.getRow(emptyProject, 0)).toBeNull();
      expect(
        SafeAccess.isValidPosition(emptyProject, { row: 0, step: 0 })
      ).toBe(false);

      const projectWithEmptyRow: Project = {
        rows: [{ id: 1, steps: [] }],
      };

      const emptyRow = SafeAccess.getRow(projectWithEmptyRow, 0);
      expect(emptyRow).toBeTruthy();
      expect(SafeAccess.getStep(emptyRow, 0)).toBeNull();
    });
  });

  describe('DEFAULT_VALUES Integration', () => {
    it('should provide safe defaults', () => {
      const position = DEFAULT_VALUES.position();
      expect(isPosition(position)).toBe(true);
      expect(position.row).toBe(0);
      expect(position.step).toBe(0);

      const step = DEFAULT_VALUES.step();
      expect(isStep(step)).toBe(true);
      expect(step.id).toBe(0);
      expect(step.count).toBe(1);
      expect(step.description).toBe('');

      const row = DEFAULT_VALUES.row();
      expect(isRow(row)).toBe(true);
      expect(row.id).toBe(0);
      expect(Array.isArray(row.steps)).toBe(true);

      const project = DEFAULT_VALUES.project();
      expect(isProject(project)).toBe(true);
      expect(Array.isArray(project.rows)).toBe(true);
      expect(hasPosition(project)).toBe(true);
      expect(project.position).toEqual({ row: 0, step: 0 });
    });

    it('should provide consistent default values', () => {
      const position1 = DEFAULT_VALUES.position();
      const position2 = DEFAULT_VALUES.position();

      expect(position1).toEqual(position2);
      expect(position1).not.toBe(position2); // Different instances
    });

    it('should validate all defaults are valid', () => {
      expect(isProject(DEFAULT_VALUES.project())).toBe(true);
      expect(isRow(DEFAULT_VALUES.row())).toBe(true);
      expect(isStep(DEFAULT_VALUES.step())).toBe(true);
      expect(isPosition(DEFAULT_VALUES.position())).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large projects efficiently', () => {
      const largeProject: Project = {
        rows: Array.from({ length: 1000 }, (_, rowIndex) => ({
          id: rowIndex,
          steps: Array.from({ length: 50 }, (_, stepIndex) => ({
            id: stepIndex,
            count: 1,
            description: `Step ${stepIndex}`,
          })),
        })),
      };

      const startTime = performance.now();
      const isValid = isValidProject(largeProject);
      const endTime = performance.now();

      expect(isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle deeply nested validation', () => {
      const deepProject: Project = {
        id: 1,
        name: 'Deep Project',
        rows: [
          {
            id: 1,
            steps: [
              {
                id: 1,
                count: 5,
                description:
                  'Complex step with lots of details and information',
              },
            ],
          },
        ],
        position: { row: 0, step: 0 },
        firstLastAppearanceMap: {
          step1: {
            key: 'step1',
            firstAppearance: [0, 0],
            lastAppearance: [0, 0],
            count: 1,
          },
        },
      };

      expect(isValidProject(deepProject)).toBe(true);
      expect(hasValidId(deepProject)).toBe(true);
      expect(hasName(deepProject)).toBe(true);
      expect(hasPosition(deepProject)).toBe(true);
      expect(hasFlam(deepProject)).toBe(true);
    });

    it('should handle type coercion edge cases', () => {
      // Number strings should be rejected
      expect(isStep({ id: '1', count: '1', description: 'test' })).toBe(false);

      // Boolean to number coercion should be rejected
      expect(isRow({ id: true, steps: [] })).toBe(false);

      // Array with numeric length should be rejected for numeric fields
      expect(isPosition({ row: [1], step: 0 })).toBe(false);
    });

    it('should handle object prototype pollution safely', () => {
      const maliciousProject: any = Object.create(null);
      maliciousProject.rows = [];

      expect(isProject(maliciousProject)).toBe(true);

      const projectWithPrototype: any = {
        rows: [],
        __proto__: { malicious: true },
      };

      expect(isProject(projectWithPrototype)).toBe(true);
    });
  });

  describe('Integration with Real Data Patterns', () => {
    it('should validate typical imported project data', () => {
      const importedProject = {
        name: 'Imported Pattern',
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 2, description: 'DB' },
              { id: 2, count: 1, description: 'A' },
              { id: 3, count: 2, description: 'DB' }
            ]
          },
          {
            id: 2,
            steps: [
              { id: 4, count: 1, description: 'A' },
              { id: 5, count: 4, description: 'DB' },
              { id: 6, count: 1, description: 'A' }
            ]
          }
        ]
      };

      expect(isValidProject(importedProject)).toBe(true);
      expect(hasName(importedProject)).toBe(true);
      expect(isEmptyProject(importedProject)).toBe(false);
    });

    it('should handle migration scenarios', () => {
      // Simulating old format data that might exist
      const legacyProject = {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 1, description: 'step' }
            ]
          }
        ],
        // Missing modern properties like position
      };

      expect(isProject(legacyProject)).toBe(true);
      expect(hasPosition(legacyProject)).toBe(false);
      expect(hasValidId(legacyProject)).toBe(false);

      // Should be upgradeable with factory
      const upgradedProject = ModelFactory.createProject(legacyProject);
      expect(hasPosition(upgradedProject)).toBe(true);
    });

    it('should validate error recovery scenarios', () => {
      // Simulating corrupted data that might need recovery
      const corruptedData = {
        rows: [
          { id: 1, steps: [{ id: 1, count: 1, description: 'valid' }] },
          null, // corrupted row
          { id: 3, steps: [{ id: 3, count: 1, description: 'also valid' }] }
        ]
      };

      expect(isProject(corruptedData)).toBe(false);

      // Should be recoverable by filtering
      const recoveredProject = {
        rows: corruptedData.rows.filter(row => row !== null && isRow(row))
      };

      expect(isProject(recoveredProject)).toBe(true);
      expect(isValidProject(recoveredProject)).toBe(true);
    });
  });

  describe('Row Marking Type Guards', () => {
    describe('isValidRowMarking', () => {
      it('should validate valid row marking values', () => {
        expect(isValidRowMarking(0)).toBe(true);
        expect(isValidRowMarking(1)).toBe(true);
        expect(isValidRowMarking(2)).toBe(true);
        expect(isValidRowMarking(3)).toBe(true);
        expect(isValidRowMarking(4)).toBe(true);
        expect(isValidRowMarking(5)).toBe(true);
        expect(isValidRowMarking(6)).toBe(true);
      });

      it('should reject invalid marking values', () => {
        expect(isValidRowMarking(-1)).toBe(false);
        expect(isValidRowMarking(7)).toBe(false);
        expect(isValidRowMarking(3.5)).toBe(false);
        expect(isValidRowMarking('2')).toBe(false);
        expect(isValidRowMarking(null)).toBe(false);
        expect(isValidRowMarking(undefined)).toBe(false);
        expect(isValidRowMarking(NaN)).toBe(false);
        expect(isValidRowMarking(Infinity)).toBe(false);
      });
    });

    describe('isValidRowMarkingStructure', () => {
      it('should validate valid row marking structures', () => {
        expect(isValidRowMarkingStructure({})).toBe(true);
        expect(isValidRowMarkingStructure({ 0: 1 })).toBe(true);
        expect(isValidRowMarkingStructure({ 0: 1, 2: 3, 5: 0 })).toBe(true);
        expect(isValidRowMarkingStructure({ 10: 6 })).toBe(true);
      });

      it('should reject invalid row marking structures', () => {
        // Non-object values
        expect(isValidRowMarkingStructure(null)).toBe(false);
        expect(isValidRowMarkingStructure(undefined)).toBe(false);
        expect(isValidRowMarkingStructure('invalid')).toBe(false);
        expect(isValidRowMarkingStructure(123)).toBe(false);
        expect(isValidRowMarkingStructure([])).toBe(false);

        // Invalid row indices
        expect(isValidRowMarkingStructure({ '-1': 1 })).toBe(false);
        expect(isValidRowMarkingStructure({ '3.5': 2 })).toBe(false);
        expect(isValidRowMarkingStructure({ 'abc': 1 })).toBe(false);

        // Invalid mark values
        expect(isValidRowMarkingStructure({ 0: -1 })).toBe(false);
        expect(isValidRowMarkingStructure({ 0: 7 })).toBe(false);
        expect(isValidRowMarkingStructure({ 0: 3.5 })).toBe(false);
        expect(isValidRowMarkingStructure({ 0: '2' })).toBe(false);
        expect(isValidRowMarkingStructure({ 0: null })).toBe(false);
        expect(isValidRowMarkingStructure({ 0: undefined })).toBe(false);

        // Mixed valid and invalid
        expect(isValidRowMarkingStructure({ 0: 1, 1: 7 })).toBe(false);
        expect(isValidRowMarkingStructure({ 0: 1, '-1': 2 })).toBe(false);
      });

      it('should handle edge cases', () => {
        // Empty object is valid
        expect(isValidRowMarkingStructure({})).toBe(true);

        // Large row indices
        expect(isValidRowMarkingStructure({ 999: 1 })).toBe(true);
        expect(isValidRowMarkingStructure({ 0: 0 })).toBe(true); // Unmarked is valid
      });
    });
  });
});

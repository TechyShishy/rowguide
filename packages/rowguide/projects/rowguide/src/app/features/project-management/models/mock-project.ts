import { Row } from '../../../core/models/row';

/**
 * MockProject - Testing Utility for Mock Data Generation
 *
 * Provides standardized mock data for testing and development scenarios. This module
 * contains predefined pattern data in both string and structured formats, enabling
 * consistent testing across components and services.
 *
 * ## Mock Data Structure
 *
 * - **PROJECTSTRING**: Raw pattern string format for testing pattern parsing
 * - **PROJECT**: Structured Row array data for testing UI components
 * - **Pattern Format**: Uses count(color) notation (e.g., "1(D) 4(A) 2(B)")
 * - **Test Coverage**: Covers various pattern scenarios and edge cases
 *
 * ## Usage Patterns
 *
 * - **Unit Testing**: Provides consistent test data for component and service tests
 * - **Development**: Enables rapid prototyping with realistic pattern data
 * - **Integration Testing**: Supports end-to-end testing with known data sets
 * - **Debugging**: Offers predictable data for troubleshooting pattern issues
 *
 * ## Pattern Details
 *
 * The mock pattern represents a bead pattern with:
 * - **Row 1**: 1 D bead, 4 A beads, 2 B beads
 * - **Row 2**: Alternating B and A beads (2B, 1A, 2B, 1A, 2B, 1A)
 * - **Row 3**: Repeated pattern (1D, 4A, 2B, 1D, 4A, 2B)
 * - **Row 4**: Simple pattern (2B, 1A)
 *
 * @example
 * ```typescript
 * // Unit test usage
 * describe('ProjectComponent', () => {
 *   it('should render project rows', () => {
 *     const component = new ProjectComponent();
 *     component.project = { id: 1, rows: PROJECT };
 *
 *     expect(component.project.rows.length).toBe(4);
 *     expect(component.project.rows[0].steps.length).toBe(3);
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Service testing
 * describe('PeyoteShorthandService', () => {
 *   it('should parse pattern string correctly', () => {
 *     const service = new PeyoteShorthandService();
 *     const result = service.toProject(PROJECTSTRING);
 *
 *     expect(result.rows).toEqual(PROJECT);
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Development usage
 * class PatternDevelopmentService {
 *   getTestPattern(): Project {
 *     return {
 *       id: 1,
 *       name: 'Test Pattern',
 *       rows: PROJECT,
 *       position: { row: 0, step: 0 }
 *     };
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Integration testing
 * class PatternIntegrationTest {
 *   async testFullWorkflow() {
 *     // Import pattern string
 *     const imported = await this.importService.importPattern(PROJECTSTRING);
 *
 *     // Verify structure matches expected
 *     expect(imported.rows).toEqual(PROJECT);
 *
 *     // Test navigation
 *     const navigator = new PatternNavigator(imported);
 *     expect(navigator.getCurrentStep()).toBeDefined();
 *   }
 * }
 * ```
 *
 * @module MockProject
 * @since 1.0.0
 */

/**
 * Mock pattern string format
 *
 * Raw pattern string in count(color) notation format used for testing pattern
 * parsing functionality. Represents a complete bead pattern with multiple rows
 * and various color combinations.
 *
 * ## Pattern Structure
 * - **Row 1**: `1(D) 4(A) 2(B)` - Mixed colors with different counts
 * - **Row 2**: `2(B) 1(A) 2(B) 1(A) 2(B) 1(A)` - Alternating pattern
 * - **Row 3**: `1(D) 4(A) 2(B) 1(D) 4(A) 2(B)` - Repeated sequence
 * - **Row 4**: `2(B) 1(A)` - Simple ending pattern
 *
 * @constant {string} PROJECTSTRING
 *
 * @example
 * ```typescript
 * // Test pattern parsing
 * const parser = new PeyoteShorthandService();
 * const project = parser.toProject(PROJECTSTRING);
 * expect(project.rows.length).toBe(4);
 * ```
 *
 * @example
 * ```typescript
 * // Validate pattern format
 * const validator = new PatternValidator();
 * const isValid = validator.validatePatternString(PROJECTSTRING);
 * expect(isValid).toBe(true);
 * ```
 */
export const PROJECTSTRING: string = `1(D) 4(A) 2(B)
2(B) 1(A) 2(B) 1(A) 2(B) 1(A)
1(D) 4(A) 2(B) 1(D) 4(A) 2(B)
2(B) 1(A)`;

/**
 * Mock row array structure with test data
 *
 * Structured representation of the mock pattern as an array of Row objects
 * with complete step data. Used for testing UI components and services that
 * work with structured pattern data.
 *
 * ## Data Structure
 * - **4 Rows**: Complete pattern with varying complexity
 * - **Step Details**: Each step includes id, count, and description
 * - **Color Codes**: Uses single-letter codes (A, B, D) for testing
 * - **Realistic Counts**: Represents typical bead pattern counts
 *
 * @constant {Row[]} PROJECT
 *
 * @example
 * ```typescript
 * // Component testing
 * const component = new RowComponent();
 * component.row = PROJECT[0];
 * expect(component.row.steps.length).toBe(3);
 * ```
 *
 * @example
 * ```typescript
 * // Service testing
 * const service = new ProjectService();
 * const project = service.createProject(PROJECT);
 * expect(project.rows).toEqual(PROJECT);
 * ```
 *
 * @example
 * ```typescript
 * // FLAM testing
 * const flamService = new FlamService();
 * const flam = flamService.generateFLAM({ rows: PROJECT });
 * expect(flam['A']).toBeDefined();
 * expect(flam['B']).toBeDefined();
 * expect(flam['D']).toBeDefined();
 * ```
 */
export const PROJECT: Row[] = [
  {
    id: 1,
    steps: [
      {
        id: 1,
        count: 1,
        description: 'D',
      },
      {
        id: 2,
        count: 4,
        description: 'A',
      },
      {
        id: 3,
        count: 2,
        description: 'B',
      },
    ],
  },
  {
    id: 2,
    steps: [
      {
        id: 1,
        count: 2,
        description: 'B',
      },
      {
        id: 2,
        count: 1,
        description: 'A',
      },
      {
        id: 1,
        count: 2,
        description: 'B',
      },
      {
        id: 2,
        count: 1,
        description: 'A',
      },
      {
        id: 1,
        count: 2,
        description: 'B',
      },
      {
        id: 2,
        count: 1,
        description: 'A',
      },
    ],
  },
  {
    id: 3,
    steps: [
      {
        id: 1,
        count: 1,
        description: 'D',
      },
      {
        id: 2,
        count: 4,
        description: 'A',
      },
      {
        id: 3,
        count: 2,
        description: 'B',
      },
      {
        id: 1,
        count: 1,
        description: 'D',
      },
      {
        id: 2,
        count: 4,
        description: 'A',
      },
      {
        id: 3,
        count: 2,
        description: 'B',
      },
    ],
  },
  {
    id: 4,
    steps: [
      {
        id: 1,
        count: 2,
        description: 'B',
      },
      {
        id: 2,
        count: 1,
        description: 'A',
      },
    ],
  },
];

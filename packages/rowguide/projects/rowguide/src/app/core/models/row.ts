import { Step } from './step';

/**
 * Row - Pattern Row Interface
 *
 * Represents a single row in a beading pattern containing an ordered sequence
 * of steps that define the pattern structure. Rows are the primary organizational
 * unit for pattern execution and navigation within projects.
 *
 * @example
 * ```typescript
 * // Creating a new pattern row
 * import { ModelFactory } from './model-factory';
 *
 * const newRow: Row = ModelFactory.createRow({
 *   id: 1,
 *   steps: [
 *     ModelFactory.createStep({ id: 1, count: 3, description: 'A' }),
 *     ModelFactory.createStep({ id: 2, count: 2, description: 'B' }),
 *     ModelFactory.createStep({ id: 3, count: 1, description: 'C' })
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Row manipulation and analysis
 * class RowProcessor {
 *   getRowLength(row: Row): number {
 *     return row.steps.reduce((total, step) => total + step.count, 0);
 *   }
 *
 *   addStep(row: Row, newStep: Step): Row {
 *     return {
 *       ...row,
 *       steps: [...row.steps, newStep]
 *     };
 *   }
 *
 *   validateRowStructure(row: Row): boolean {
 *     return row.steps.every(step =>
 *       typeof step.id === 'number' &&
 *       typeof step.count === 'number' &&
 *       step.count > 0
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Row navigation and progress tracking
 * class RowNavigator {
 *   findStepAtPosition(row: Row, stepIndex: number): Step | null {
 *     return row.steps[stepIndex] || null;
 *   }
 *
 *   getStepRange(row: Row, startIndex: number, endIndex: number): Step[] {
 *     return row.steps.slice(startIndex, endIndex + 1);
 *   }
 *
 *   calculateRowProgress(row: Row, currentStepIndex: number): ProgressInfo {
 *     const totalSteps = row.steps.length;
 *     const completedSteps = currentStepIndex + 1;
 *
 *     return {
 *       percent: (completedSteps / totalSteps) * 100,
 *       currentStep: completedSteps,
 *       totalSteps: totalSteps
 *     };
 *   }
 * }
 * ```
 *
 * **Data Structure:**
 *
 * **Organization:**
 * - **Sequential Steps**: Ordered array representing pattern execution sequence
 * - **Hierarchical Position**: Part of Project → Row → Step hierarchy
 * - **Unique Identification**: Distinct ID for database and reference operations
 * - **Step Management**: Container for step definitions and counts
 *
 * **Pattern Integration:**
 * - **Project Relationship**: Belongs to a specific project pattern
 * - **Navigation Support**: Enables row-level navigation and bookmarking
 * - **Progress Tracking**: Supports step-by-step progress within rows
 * - **FLAM Analysis**: Contributes to First/Last Appearance Map generation
 *
 * **Performance Characteristics:**
 * - **Memory Efficient**: Optimized for large patterns with many steps
 * - **Rendering Support**: Compatible with virtual scrolling implementations
 * - **Validation Ready**: Structure supports comprehensive validation
 * - **Transformation Safe**: Immutable update patterns recommended
 *
 * @see {@link Step} For step structure details
 * @see {@link Project} For parent project context
 * @since 1.0.0
 */
export interface Row {
  /**
   * Unique Row Identifier
   *
   * Required unique identifier for the row within the project context.
   * Used for navigation, progress tracking, and database operations.
   * Must be unique within the containing project's row array.
   *
   * @example
   * ```typescript
   * // Row identification and lookup
   * class RowManager {
   *   findRowById(project: Project, rowId: number): Row | null {
   *     return project.rows.find(row => row.id === rowId) || null;
   *   }
   *
   *   getRowIndex(project: Project, rowId: number): number {
   *     return project.rows.findIndex(row => row.id === rowId);
   *   }
   *
   *   validateRowId(rowId: number): boolean {
   *     return Number.isInteger(rowId) && rowId > 0;
   *   }
   * }
   * ```
   *
   * **ID Requirements:**
   * - **Uniqueness**: Must be unique within the project's row collection
   * - **Type**: Positive integer value
   * - **Immutability**: Should not change after row creation
   * - **Validation**: Checked during row creation and updates
   *
   * **Usage Contexts:**
   * - **Navigation**: Used to identify current row in position tracking
   * - **Database**: Primary key for row-level database operations
   * - **References**: Used in FLAM and other analysis structures
   * - **UI Display**: May be used for row numbering in interfaces
   */
  id: number;

  /**
   * Pattern Step Sequence
   *
   * Required array containing the ordered sequence of steps that define
   * the pattern instructions for this row. Steps are executed in array
   * order during pattern creation and define the specific bead counts
   * and color descriptions for the row.
   *
   * @example
   * ```typescript
   * // Step sequence management
   * class StepSequenceManager {
   *   getTotalBeadCount(row: Row): number {
   *     return row.steps.reduce((total, step) => total + step.count, 0);
   *   }
   *
   *   insertStep(row: Row, stepIndex: number, newStep: Step): Row {
   *     const updatedSteps = [...row.steps];
   *     updatedSteps.splice(stepIndex, 0, newStep);
   *     return { ...row, steps: updatedSteps };
   *   }
   *
   *   removeStep(row: Row, stepIndex: number): Row {
   *     const updatedSteps = row.steps.filter((_, index) => index !== stepIndex);
   *     return { ...row, steps: updatedSteps };
   *   }
   *
   *   reorderSteps(row: Row, fromIndex: number, toIndex: number): Row {
   *     const updatedSteps = [...row.steps];
   *     const [movedStep] = updatedSteps.splice(fromIndex, 1);
   *     updatedSteps.splice(toIndex, 0, movedStep);
   *     return { ...row, steps: updatedSteps };
   *   }
   * }
   * ```
   *
   * **Array Structure:**
   * - **Ordering**: Sequential execution order (index 0 = first step)
   * - **Completeness**: May be empty for placeholder rows
   * - **Mutability**: Can be modified during pattern editing
   * - **Validation**: Each step must conform to Step interface
   *
   * **Step Relationships:**
   * - **Parent-Child**: Row contains steps with execution order
   * - **Color Mapping**: Step descriptions link to project color mapping
   * - **Count Accumulation**: Step counts contribute to row totals
   * - **Progress Tracking**: Current step position within row
   *
   * **Pattern Processing:**
   * - **Execution Flow**: Steps executed in array sequence
   * - **Color Analysis**: Used for FLAM generation and color planning
   * - **Validation Rules**: Each step validated for consistency
   * - **Export Support**: Included in pattern file exports
   */
  steps: Array<Step>;
}

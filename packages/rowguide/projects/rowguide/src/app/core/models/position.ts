/**
 * Position - Pattern Progress Position Class
 *
 * Represents a specific coordinate position within a beading pattern,
 * tracking the current row and step indices for progress monitoring
 * and navigation. Used throughout the application for position tracking,
 * session restoration, and navigation operations.
 *
 * @example
 * ```typescript
 * // Creating and using position objects
 * import { ModelFactory } from './model-factory';
 *
 * // Create new position
 * const startPosition = ModelFactory.createPosition(0, 0);
 * const currentPosition = ModelFactory.createPosition(5, 12);
 *
 * // Validate position against pattern
 * const isValid = this.positionValidator.isValidPosition(project, currentPosition);
 * ```
 *
 * @example
 * ```typescript
 * // Position manipulation and navigation
 * class PositionNavigator {
 *   moveToNextStep(project: Project, currentPosition: Position): Position | null {
 *     const currentRow = SafeAccess.getRowAtIndex(project, currentPosition.row);
 *     if (!currentRow) return null;
 *
 *     if (currentPosition.step < currentRow.steps.length - 1) {
 *       // Move to next step in current row
 *       return ModelFactory.createPosition(currentPosition.row, currentPosition.step + 1);
 *     } else if (currentPosition.row < project.rows.length - 1) {
 *       // Move to first step of next row
 *       return ModelFactory.createPosition(currentPosition.row + 1, 0);
 *     }
 *
 *     return null; // Already at end of pattern
 *   }
 *
 *   moveToPreviousStep(project: Project, currentPosition: Position): Position | null {
 *     if (currentPosition.step > 0) {
 *       // Move to previous step in current row
 *       return ModelFactory.createPosition(currentPosition.row, currentPosition.step - 1);
 *     } else if (currentPosition.row > 0) {
 *       // Move to last step of previous row
 *       const prevRow = SafeAccess.getRowAtIndex(project, currentPosition.row - 1);
 *       if (prevRow && prevRow.steps.length > 0) {
 *         return ModelFactory.createPosition(currentPosition.row - 1, prevRow.steps.length - 1);
 *       }
 *     }
 *
 *     return null; // Already at beginning of pattern
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Position validation and boundaries
 * class PositionValidator {
 *   validatePosition(project: Project, position: Position): ValidationResult {
 *     const errors: string[] = [];
 *
 *     // Validate row index
 *     if (position.row < 0 || position.row >= project.rows.length) {
 *       errors.push(`Row index ${position.row} is out of bounds`);
 *     } else {
 *       // Validate step index within row
 *       const row = project.rows[position.row];
 *       if (position.step < 0 || position.step >= row.steps.length) {
 *         errors.push(`Step index ${position.step} is out of bounds for row ${position.row}`);
 *       }
 *     }
 *
 *     return {
 *       isValid: errors.length === 0,
 *       errors
 *     };
 *   }
 *
 *   clampPosition(project: Project, position: Position): Position {
 *     const clampedRow = Math.max(0, Math.min(position.row, project.rows.length - 1));
 *     const row = project.rows[clampedRow];
 *     const clampedStep = Math.max(0, Math.min(position.step, row.steps.length - 1));
 *
 *     return ModelFactory.createPosition(clampedRow, clampedStep);
 *   }
 * }
 * ```
 *
 * **Coordinate System:**
 *
 * **Zero-Based Indexing:**
 * - **Row Index**: 0-based index into project.rows array
 * - **Step Index**: 0-based index into row.steps array
 * - **Origin**: Position(0, 0) represents first step of first row
 * - **Bounds**: Coordinates must be within pattern dimensions
 *
 * **Navigation Model:**
 * - **Linear Progression**: Steps progress sequentially through rows
 * - **Row Boundaries**: Moving past last step advances to next row
 * - **Pattern Boundaries**: Clear start and end positions
 * - **Validation**: Coordinates validated against pattern structure
 *
 * **Usage Contexts:**
 * - **Progress Tracking**: Current user position in pattern
 * - **Session Restoration**: Restore user's place after app restart
 * - **Navigation**: Support forward/backward movement through pattern
 * - **Bookmarking**: Allow users to save and return to specific positions
 *
 * @see {@link Project} For pattern structure context
 * @see {@link Row} For row-level navigation
 * @see {@link Step} For step-level operations
 * @since 1.0.0
 */
export class Position {
  /**
   * Row Index Coordinate
   *
   * Zero-based index indicating the current row within the project's
   * row array. Must be within the bounds of the project.rows array
   * for the position to be considered valid.
   *
   * @example
   * ```typescript
   * // Row-based navigation operations
   * class RowNavigation {
   *   moveToRow(project: Project, targetRowIndex: number): Position | null {
   *     if (targetRowIndex < 0 || targetRowIndex >= project.rows.length) {
   *       return null; // Invalid row index
   *     }
   *
   *     // Move to first step of target row
   *     return ModelFactory.createPosition(targetRowIndex, 0);
   *   }
   *
   *   getCurrentRow(project: Project, position: Position): Row | null {
   *     return SafeAccess.getRowAtIndex(project, position.row);
   *   }
   *
   *   getRowProgress(project: Project, position: Position): RowProgress {
   *     const row = this.getCurrentRow(project, position);
   *     if (!row) return { percent: 0, description: 'Invalid position' };
   *
   *     return {
   *       percent: ((position.step + 1) / row.steps.length) * 100,
   *       currentStep: position.step + 1,
   *       totalSteps: row.steps.length
   *     };
   *   }
   * }
   * ```
   *
   * **Row Coordinate Properties:**
   * - **Range**: 0 to (project.rows.length - 1)
   * - **Type**: Non-negative integer
   * - **Validation**: Must reference existing row in project
   * - **Navigation**: Used for row-level navigation operations
   *
   * **Integration Points:**
   * - **Project Structure**: Index into project.rows array
   * - **Progress Calculation**: Used for overall pattern progress
   * - **Display**: May be shown as "Row N" in user interfaces
   * - **Persistence**: Saved with project for session restoration
   */
  row!: number;

  /**
   * Step Index Coordinate
   *
   * Zero-based index indicating the current step within the current row's
   * step array. Must be within the bounds of the row.steps array for the
   * position to be considered valid.
   *
   * @example
   * ```typescript
   * // Step-based navigation operations
   * class StepNavigation {
   *   moveToStep(project: Project, position: Position, targetStepIndex: number): Position | null {
   *     const row = SafeAccess.getRowAtIndex(project, position.row);
   *     if (!row) return null;
   *
   *     if (targetStepIndex < 0 || targetStepIndex >= row.steps.length) {
   *       return null; // Invalid step index
   *     }
   *
   *     return ModelFactory.createPosition(position.row, targetStepIndex);
   *   }
   *
   *   getCurrentStep(project: Project, position: Position): Step | null {
   *     const row = SafeAccess.getRowAtIndex(project, position.row);
   *     if (!row) return null;
   *
   *     return row.steps[position.step] || null;
   *   }
   *
   *   getStepProgress(project: Project, position: Position): StepProgress {
   *     const step = this.getCurrentStep(project, position);
   *     if (!step) return { description: 'Invalid position' };
   *
   *     return {
   *       stepId: step.id,
   *       count: step.count,
   *       description: step.description,
   *       positionInRow: position.step + 1
   *     };
   *   }
   * }
   * ```
   *
   * **Step Coordinate Properties:**
   * - **Range**: 0 to (row.steps.length - 1) for current row
   * - **Type**: Non-negative integer
   * - **Validation**: Must reference existing step in current row
   * - **Navigation**: Used for step-level navigation operations
   *
   * **Usage Scenarios:**
   * - **Bead Placement**: Indicates exactly which bead to place next
   * - **Progress Tracking**: Shows completion within current row
   * - **Step Details**: Identifies current step for count and color info
   * - **Navigation**: Enables precise movement through pattern steps
   *
   * **Relationship to Pattern:**
   * - **Row Context**: Interpreted within context of current row
   * - **Step Reference**: Direct index into row.steps array
   * - **Color Information**: Used to lookup step description and color
   * - **Count Information**: Used to determine bead quantity for step
   */
  step!: number;
}

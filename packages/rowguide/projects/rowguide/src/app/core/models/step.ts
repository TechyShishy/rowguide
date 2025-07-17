/**
 * Step - Pattern Step Interface
 *
 * Represents an individual step within a beading pattern row, containing
 * the specific bead count and color/type description. Steps are the fundamental
 * building blocks of patterns and define the exact sequence of beads to place.
 *
 * @example
 * ```typescript
 * // Creating pattern steps
 * import { ModelFactory } from './model-factory';
 *
 * const colorStep: Step = ModelFactory.createStep({
 *   id: 1,
 *   count: 5,
 *   description: 'Blue'
 * });
 *
 * const complexStep: Step = ModelFactory.createStep({
 *   id: 2,
 *   count: 3,
 *   description: 'Silver-lined Crystal'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Step processing and validation
 * class StepProcessor {
 *   validateStep(step: Step): ValidationResult {
 *     const errors: string[] = [];
 *
 *     if (!Number.isInteger(step.id) || step.id <= 0) {
 *       errors.push('ID must be a positive integer');
 *     }
 *
 *     if (!Number.isInteger(step.count) || step.count <= 0) {
 *       errors.push('Count must be a positive integer');
 *     }
 *
 *     if (!step.description.trim()) {
 *       errors.push('Description cannot be empty');
 *     }
 *
 *     return {
 *       isValid: errors.length === 0,
 *       errors
 *     };
 *   }
 *
 *   calculateStepLength(step: Step): number {
 *     return step.count; // Each count represents one bead
 *   }
 *
 *   combineSteps(step1: Step, step2: Step): Step | null {
 *     // Only combine if descriptions match
 *     if (step1.description !== step2.description) {
 *       return null;
 *     }
 *
 *     return ModelFactory.createStep({
 *       id: Math.max(step1.id, step2.id), // Use higher ID
 *       count: step1.count + step2.count,
 *       description: step1.description
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Step analysis and color mapping
 * class StepAnalyzer {
 *   getUniqueDescriptions(steps: Step[]): string[] {
 *     const descriptions = new Set(steps.map(step => step.description));
 *     return Array.from(descriptions);
 *   }
 *
 *   calculateUsageStatistics(steps: Step[]): UsageStats {
 *     const stats: { [description: string]: { count: number; totalBeads: number } } = {};
 *
 *     steps.forEach(step => {
 *       if (!stats[step.description]) {
 *         stats[step.description] = { count: 0, totalBeads: 0 };
 *       }
 *       stats[step.description].count++;
 *       stats[step.description].totalBeads += step.count;
 *     });
 *
 *     return stats;
 *   }
 *
 *   findStepsByDescription(steps: Step[], description: string): Step[] {
 *     return steps.filter(step => step.description === description);
 *   }
 * }
 * ```
 *
 * **Data Structure:**
 *
 * **Core Components:**
 * - **Identification**: Unique ID for step tracking and references
 * - **Quantity**: Bead count for this step's execution
 * - **Classification**: Description for color, type, or pattern designation
 *
 * **Pattern Integration:**
 * - **Row Membership**: Belongs to a specific row within a project
 * - **Color Mapping**: Description links to project color mappings
 * - **FLAM Analysis**: Contributes to First/Last Appearance Map
 * - **Progress Tracking**: Individual step completion tracking
 *
 * **Validation Rules:**
 * - **ID Constraints**: Must be positive integer, unique within row
 * - **Count Constraints**: Must be positive integer representing bead count
 * - **Description Constraints**: Non-empty string for identification
 *
 * **Processing Characteristics:**
 * - **Atomic Unit**: Smallest executable pattern element
 * - **Combinable**: Steps with same description can be merged
 * - **Trackable**: Individual step completion can be monitored
 * - **Analyzable**: Used for pattern complexity and material analysis
 *
 * @see {@link Row} For parent row context
 * @see {@link Project} For color mapping integration
 * @since 1.0.0
 */
export interface Step {
  /**
   * Unique Step Identifier
   *
   * Required unique identifier for the step within the containing row.
   * Used for navigation, progress tracking, and step-specific operations.
   * Must be unique within the row's step array.
   *
   * @example
   * ```typescript
   * // Step identification and lookup
   * class StepManager {
   *   findStepById(row: Row, stepId: number): Step | null {
   *     return row.steps.find(step => step.id === stepId) || null;
   *   }
   *
   *   getStepIndex(row: Row, stepId: number): number {
   *     return row.steps.findIndex(step => step.id === stepId);
   *   }
   *
   *   generateNextStepId(row: Row): number {
   *     const maxId = Math.max(...row.steps.map(s => s.id), 0);
   *     return maxId + 1;
   *   }
   *
   *   validateStepId(stepId: number): boolean {
   *     return Number.isInteger(stepId) && stepId > 0;
   *   }
   * }
   * ```
   *
   * **ID Requirements:**
   * - **Uniqueness**: Must be unique within the containing row
   * - **Type**: Positive integer value
   * - **Immutability**: Should not change after step creation
   * - **Validation**: Verified during step creation and updates
   *
   * **Usage Contexts:**
   * - **Navigation**: Used to identify current step in position tracking
   * - **Database**: Primary key for step-level operations
   * - **References**: Used in progress tracking and FLAM analysis
   * - **Editing**: Enables step-specific modification operations
   */
  id: number;

  /**
   * Bead Count Quantity
   *
   * Required positive integer representing the number of beads to place
   * for this step. Defines the quantity of identical beads (same color/type)
   * to be used in sequence during pattern execution.
   *
   * @example
   * ```typescript
   * // Count-based operations
   * class CountManager {
   *   calculateMaterialRequirements(steps: Step[]): MaterialRequirements {
   *     const requirements: { [description: string]: number } = {};
   *
   *     steps.forEach(step => {
   *       requirements[step.description] =
   *         (requirements[step.description] || 0) + step.count;
   *     });
   *
   *     return requirements;
   *   }
   *
   *   validateCount(count: number): boolean {
   *     return Number.isInteger(count) && count > 0;
   *   }
   *
   *   splitStep(step: Step, splitCount: number): [Step, Step] | null {
   *     if (splitCount >= step.count || splitCount <= 0) {
   *       return null;
   *     }
   *
   *     const firstStep = ModelFactory.createStep({
   *       id: step.id,
   *       count: splitCount,
   *       description: step.description
   *     });
   *
   *     const secondStep = ModelFactory.createStep({
   *       id: step.id + 1000, // Temporary ID strategy
   *       count: step.count - splitCount,
   *       description: step.description
   *     });
   *
   *     return [firstStep, secondStep];
   *   }
   * }
   * ```
   *
   * **Count Constraints:**
   * - **Range**: Must be positive integer (≥ 1)
   * - **Type**: Integer values only, no fractional beads
   * - **Validation**: Checked during step creation and modification
   * - **Practicality**: Should represent realistic bead quantities
   *
   * **Usage Scenarios:**
   * - **Material Planning**: Calculate total bead requirements
   * - **Progress Tracking**: Track individual bead placement
   * - **Pattern Analysis**: Analyze step complexity and density
   * - **Export Operations**: Include quantities in exported patterns
   */
  count: number;

  /**
   * Bead Description Identifier
   *
   * Required string describing the bead color, type, or pattern designation.
   * Used for color mapping, material identification, and pattern visualization.
   * Serves as the key for linking steps to color definitions and material lists.
   *
   * @example
   * ```typescript
   * // Description-based operations
   * class DescriptionManager {
   *   normalizeDescription(description: string): string {
   *     return description.trim().toLowerCase();
   *   }
   *
   *   validateDescription(description: string): boolean {
   *     return description.trim().length > 0 && description.length <= 100;
   *   }
   *
   *   findStepsByColor(steps: Step[], colorDescription: string): Step[] {
   *     const normalized = this.normalizeDescription(colorDescription);
   *     return steps.filter(step =>
   *       this.normalizeDescription(step.description) === normalized
   *     );
   *   }
   *
   *   generateColorPalette(steps: Step[]): ColorPalette {
   *     const uniqueDescriptions = new Set(steps.map(s => s.description));
   *     return Array.from(uniqueDescriptions).map(description => ({
   *       description,
   *       totalUsage: steps
   *         .filter(s => s.description === description)
   *         .reduce((sum, s) => sum + s.count, 0)
   *     }));
   *   }
   * }
   * ```
   *
   * **Description Standards:**
   * - **Format**: Non-empty string with reasonable length limits
   * - **Content**: Color names, bead types, or pattern designations
   * - **Consistency**: Same descriptions should represent same materials
   * - **Validation**: Checked for non-empty and length constraints
   *
   * **Integration Points:**
   * - **Color Mapping**: Used as key in project colorMapping dictionary
   * - **FLAM Analysis**: Tracked for first/last appearance calculations
   * - **Material Lists**: Grouped for material requirement calculations
   * - **Export Formats**: Included in pattern file exports
   *
   * **Common Patterns:**
   * - **Simple Colors**: 'Red', 'Blue', 'Gold'
   * - **Complex Types**: 'Metallic Silver', 'Matte Black', 'AB Crystal'
   * - **Pattern Codes**: 'A', 'B', 'C' for coded patterns
   * - **Mixed Formats**: Support for various naming conventions
   */
  description: string;
}

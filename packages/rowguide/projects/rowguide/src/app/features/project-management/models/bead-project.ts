import { Project } from '../../../core/models/project';
import { Row } from '../../../core/models/row';
import { Position } from '../../../core/models/position';
import { FLAM } from '../../../core/models/flam';

/**
 * BeadProject - Bead-Specific Project Implementation
 *
 * Concrete implementation of the Project interface specifically designed for bead pattern
 * projects. This class provides the data structure and behavior for managing bead patterns,
 * including color mapping, position tracking, and FLAM (First/Last Appearance Map) integration.
 *
 * ## Core Features
 *
 * - **Bead Pattern Management**: Stores and manages bead patterns with row-based structure
 * - **Color System Integration**: Supports color mapping for bead visualization
 * - **Position Tracking**: Maintains current position within the pattern
 * - **FLAM Integration**: Supports First/Last Appearance Map for pattern analysis
 * - **Image Storage**: Handles project image data as ArrayBuffer
 *
 * ## Data Structure
 *
 * - **Rows**: Array of Row objects containing bead pattern steps
 * - **Position**: Current working position with row and step coordinates
 * - **Color Mapping**: Dictionary mapping color codes to human-readable names
 * - **FLAM**: First/Last appearance analysis for pattern optimization
 * - **Image**: Optional project image stored as ArrayBuffer
 *
 * ## Integration Points
 *
 * - **Database Storage**: Persisted to IndexedDB via ProjectDbService
 * - **Pattern Analysis**: Integrates with FlamService for pattern analysis
 * - **UI Components**: Used by ProjectComponent, StepComponent, and RowComponent
 * - **File Import**: Created by pattern import services (PeyoteShorthandService, etc.)
 *
 * @example
 * ```typescript
 * // Creating a new bead project
 * const project = new BeadProject();
 * project.id = 1;
 * project.name = 'Peyote Bracelet Pattern';
 * project.rows = [
 *   { id: 1, steps: [{ id: 1, count: 3, description: 'A' }] },
 *   { id: 2, steps: [{ id: 2, count: 2, description: 'B' }] }
 * ];
 * project.position = { row: 0, step: 0 };
 * ```
 *
 * @example
 * ```typescript
 * // Project with color mapping
 * const project = new BeadProject();
 * project.colorMapping = {
 *   'A': 'Red',
 *   'B': 'Blue',
 *   'C': 'Green'
 * };
 *
 * // Access color name
 * const colorName = project.colorMapping?.['A']; // 'Red'
 * ```
 *
 * @example
 * ```typescript
 * // Project with FLAM integration
 * const project = new BeadProject();
 * project.firstLastAppearanceMap = {
 *   'A': {
 *     key: 'A',
 *     firstAppearance: { row: 0, step: 0 },
 *     lastAppearance: { row: 2, step: 1 },
 *     count: 5,
 *     color: 'Red',
 *     hexColor: '#FF0000'
 *   }
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Service integration
 * class ProjectService {
 *   createBeadProject(patternData: string): BeadProject {
 *     const project = new BeadProject();
 *     project.id = this.generateId();
 *     project.name = 'Imported Pattern';
 *     project.rows = this.parsePatternData(patternData);
 *     project.position = { row: 0, step: 0 };
 *     return project;
 *   }
 * }
 * ```
 *
 * @class BeadProject
 * @implements {Project}
 * @since 1.0.0
 */
export class BeadProject implements Project {
  /**
   * Project identification and storage
   *
   * Unique identifier for the project, used for database storage and retrieval.
   * Required for all project instances and must be unique within the application.
   *
   * @type {number}
   * @required
   */
  id!: number;

  /**
   * Optional project naming
   *
   * Human-readable name for the project. Optional field that can be set by users
   * to identify their projects. If not provided, UI components should show default names.
   *
   * @type {string}
   * @optional
   */
  name?: string;

  /**
   * Bead pattern row array structure
   *
   * Core data structure containing the bead pattern organized as rows of steps.
   * Each row contains an array of steps representing the bead pattern sequence.
   * Required for all valid bead projects.
   *
   * @type {Row[]}
   * @required
   */
  rows!: Row[];

  /**
   * FLAM integration for beads
   *
   * First/Last Appearance Map providing pattern analysis data. Contains information
   * about when each bead color first and last appears in the pattern, along with
   * usage statistics and color mapping.
   *
   * @type {FLAM}
   * @optional
   */
  firstLastAppearanceMap?: FLAM;

  /**
   * Bead color assignment system
   *
   * Dictionary mapping bead color codes to human-readable color names.
   * Enables user-friendly color identification and pattern visualization.
   *
   * @type {Object.<string, string>}
   * @optional
   *
   * @example
   * ```typescript
   * // Color mapping example
   * project.colorMapping = {
   *   'A': 'Matte Red',
   *   'B': 'Shiny Blue',
   *   'C': 'Metallic Gold'
   * };
   * ```
   */
  colorMapping?: { [key: string]: string };

  /**
   * Project image storage as ArrayBuffer
   *
   * Optional image data associated with the project, stored as ArrayBuffer for
   * efficient storage and retrieval. Used for pattern reference images or
   * project inspiration photos.
   *
   * @type {ArrayBuffer}
   * @optional
   */
  image?: ArrayBuffer;

  /**
   * Current bead tracking position
   *
   * Tracks the user's current position within the bead pattern with row and step
   * coordinates. Used for navigation, progress tracking, and resuming work.
   *
   * @type {Position}
   * @optional
   */
  position?: Position;
}

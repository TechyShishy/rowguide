import { FLAM } from './flam';
import { Position } from './position';
import { Row } from './row';

/**
 * Project - Core Domain Model Interface
 *
 * Represents a complete beading project with all associated data including
 * pattern rows, color mappings, progress tracking, and visual analysis.
 * This interface serves as the primary data structure for pattern management
 * and user interaction throughout the application.
 *
 * @example
 * ```typescript
 * // Creating a new project with validation
 * import { ModelFactory } from './model-factory';
 *
 * const newProject: Project = ModelFactory.createProject({
 *   name: 'Sunset Bracelet',
 *   rows: [
 *     ModelFactory.createRow({
 *       id: 1,
 *       steps: [
 *         ModelFactory.createStep({ id: 1, count: 3, description: 'A' }),
 *         ModelFactory.createStep({ id: 2, count: 2, description: 'B' })
 *       ]
 *     })
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Working with existing project data
 * class ProjectManager {
 *   updateProjectProgress(project: Project, newPosition: Position): Project {
 *     return {
 *       ...project,
 *       position: newPosition,
 *       // Trigger FLAM regeneration if needed
 *       firstLastAppearanceMap: this.flamService.generateFLAM(project.rows)
 *     };
 *   }
 *
 *   addColorMapping(project: Project, stepDescription: string, hexColor: string): Project {
 *     return {
 *       ...project,
 *       colorMapping: {
 *         ...project.colorMapping,
 *         [stepDescription]: hexColor
 *       }
 *     };
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Project validation and type checking
 * import { isValidProject, SafeAccess } from './type-guards';
 *
 * class ProjectValidator {
 *   validateAndProcess(projectData: unknown): Project | null {
 *     if (!isValidProject(projectData)) {
 *       console.error('Invalid project data structure');
 *       return null;
 *     }
 *
 *     // Safe access to properties
 *     const projectName = SafeAccess.getProjectName(projectData);
 *     const projectRows = SafeAccess.getProjectRows(projectData);
 *
 *     console.log(`Processing project "${projectName}" with ${projectRows.length} rows`);
 *     return projectData;
 *   }
 * }
 * ```
 *
 * **Data Structure Overview:**
 *
 * **Core Properties:**
 * - **Identification**: Unique ID for database persistence
 * - **Metadata**: Name and descriptive information
 * - **Pattern Data**: Hierarchical row and step structure
 * - **Progress Tracking**: Current position and completion state
 *
 * **Analysis Features:**
 * - **FLAM Integration**: First/Last Appearance Map for pattern analysis
 * - **Color Management**: Mapping from step descriptions to visual colors
 * - **Visual Assets**: Project images and reference materials
 *
 * **Persistence Model:**
 * - **Database Storage**: IndexedDB with automatic ID generation
 * - **Import/Export**: Multiple format support (JSON, pattern files)
 * - **Version Control**: Change tracking and history management
 *
 * @see {@link Row} For row structure details
 * @see {@link FLAM} For pattern analysis integration
 * @see {@link Position} For progress tracking
 * @since 1.0.0
 */
export interface Project {
  /**
   * Unique Project Identifier
   *
   * Optional unique identifier assigned by the database system for persistent
   * storage and retrieval. Auto-generated during project creation and used
   * for all subsequent database operations and cross-references.
   *
   * @example
   * ```typescript
   * // Database operations with project ID
   * class ProjectService {
   *   async saveProject(project: Project): Promise<number> {
   *     if (project.id) {
   *       // Update existing project
   *       await this.db.updateProject(project);
   *       return project.id;
   *     } else {
   *       // Create new project
   *       const newId = await this.db.addProject(project);
   *       project.id = newId;
   *       return newId;
   *     }
   *   }
   * }
   * ```
   *
   * **ID Management:**
   * - **Auto-Generation**: Database assigns unique positive integers
   * - **Immutability**: Once assigned, ID should not change
   * - **Reference Integrity**: Used for foreign key relationships
   * - **Validation**: Must be positive integer when present
   *
   * **Lifecycle:**
   * - **Creation**: undefined for new projects
   * - **Persistence**: assigned during first database save
   * - **Updates**: preserved across all update operations
   * - **Deletion**: used to identify project for removal
   */
  id?: number;

  /**
   * Project Display Name
   *
   * Optional human-readable name for the project, used in user interfaces,
   * project lists, and file exports. Supports internationalization and
   * custom naming conventions for pattern organization.
   *
   * @example
   * ```typescript
   * // Project naming and validation
   * class ProjectNaming {
   *   validateName(name: string): boolean {
   *     return this.dataIntegrityService.validateProjectName(name);
   *   }
   *
   *   generateDefaultName(patternType: string): string {
   *     const timestamp = new Date().toISOString().split('T')[0];
   *     return `${patternType} Pattern ${timestamp}`;
   *   }
   * }
   * ```
   *
   * **Naming Guidelines:**
   * - **Length**: Reasonable length for UI display (suggested 1-100 characters)
   * - **Characters**: Support for international characters and symbols
   * - **Uniqueness**: Not required to be unique across projects
   * - **Validation**: Should pass DataIntegrityService validation
   *
   * **Display Contexts:**
   * - **Project Lists**: Primary identifier in selection interfaces
   * - **Browser Titles**: Used in page titles and bookmarks
   * - **File Exports**: Incorporated into exported filenames
   * - **Breadcrumbs**: Navigation path display
   */
  name?: string;

  /**
   * Pattern Row Array Structure
   *
   * Required array containing the complete pattern structure organized as
   * hierarchical rows. Each row contains steps that define the pattern
   * sequence, colors, and bead counts for the project.
   *
   * @example
   * ```typescript
   * // Working with project rows
   * class PatternProcessor {
   *   getTotalSteps(project: Project): number {
   *     return project.rows.reduce((total, row) =>
   *       total + row.steps.length, 0
   *     );
   *   }
   *
   *   findRowByIndex(project: Project, rowIndex: number): Row | null {
   *     return project.rows[rowIndex] || null;
   *   }
   *
   *   addRow(project: Project, newRow: Row): Project {
   *     return {
   *       ...project,
   *       rows: [...project.rows, newRow]
   *     };
   *   }
   * }
   * ```
   *
   * **Array Structure:**
   * - **Ordering**: Sequential pattern execution order (index 0 = first row)
   * - **Completeness**: Must contain at least one row for valid pattern
   * - **Mutability**: Can be modified during pattern editing
   * - **Validation**: Each row must conform to Row interface structure
   *
   * **Relationships:**
   * - **Parent-Child**: Project contains rows, rows contain steps
   * - **FLAM Integration**: Used to generate First/Last Appearance Map
   * - **Position Tracking**: Current position references row by index
   * - **Navigation**: Enables hierarchical pattern navigation
   *
   * **Performance Considerations:**
   * - **Large Patterns**: Efficient handling of patterns with many rows
   * - **Memory Usage**: Optimized for patterns with thousands of steps
   * - **Rendering**: Virtual scrolling for large pattern display
   */
  rows: Array<Row>;

  /**
   * First/Last Appearance Map (FLAM) Integration
   *
   * Optional analysis data structure containing the first and last appearance
   * coordinates for each unique step description in the pattern. Generated
   * by FlamService and used for pattern analysis and color optimization.
   *
   * @example
   * ```typescript
   * // FLAM generation and usage
   * class FlamManager {
   *   generateFLAM(project: Project): Project {
   *     const flam = this.flamService.generateFLAM(project.rows);
   *     return {
   *       ...project,
   *       firstLastAppearanceMap: flam
   *     };
   *   }
   *
   *   analyzePatternComplexity(project: Project): AnalysisResult {
   *     if (!project.firstLastAppearanceMap) {
   *       return { error: 'FLAM not generated' };
   *     }
   *
   *     const uniqueSteps = Object.keys(project.firstLastAppearanceMap);
   *     return {
   *       uniqueStepCount: uniqueSteps.length,
   *       complexity: uniqueSteps.length > 10 ? 'high' : 'low'
   *     };
   *   }
   * }
   * ```
   *
   * **FLAM Features:**
   * - **Pattern Analysis**: Understand step distribution and frequency
   * - **Color Planning**: Optimize color choices based on usage patterns
   * - **Complexity Assessment**: Evaluate pattern difficulty and requirements
   * - **Visual Representation**: Support for pattern visualization tools
   *
   * **Lifecycle:**
   * - **Generation**: Created by FlamService when needed
   * - **Caching**: Stored with project to avoid regeneration
   * - **Invalidation**: Regenerated when pattern rows change
   * - **Persistence**: Saved with project for performance
   */
  firstLastAppearanceMap?: FLAM;

  /**
   * Color Mapping System
   *
   * Optional dictionary mapping step descriptions to hex color codes for
   * visual representation and pattern planning. Enables consistent color
   * display across different views and export formats.
   *
   * @example
   * ```typescript
   * // Color mapping management
   * class ColorManager {
   *   setStepColor(project: Project, stepDescription: string, hexColor: string): Project {
   *     return {
   *       ...project,
   *       colorMapping: {
   *         ...project.colorMapping,
   *         [stepDescription]: hexColor
   *       }
   *     };
   *   }
   *
   *   getStepColor(project: Project, stepDescription: string): string {
   *     return project.colorMapping?.[stepDescription] || '#cccccc';
   *   }
   *
   *   exportColorPalette(project: Project): ColorPalette {
   *     const colors = project.colorMapping || {};
   *     return Object.entries(colors).map(([step, color]) => ({
   *       stepDescription: step,
   *       hexColor: color,
   *       usage: this.calculateStepUsage(project, step)
   *     }));
   *   }
   * }
   * ```
   *
   * **Color System:**
   * - **Format**: Hex color codes (#RRGGBB or #RGB format)
   * - **Validation**: Colors validated for proper hex format
   * - **Persistence**: Stored with project for consistency
   * - **Import/Export**: Included in pattern file exports
   *
   * **Integration Points:**
   * - **FLAM Service**: Coordinates with pattern analysis
   * - **UI Components**: Used for step visualization
   * - **Export Services**: Included in exported patterns
   * - **Import Services**: Preserved during pattern imports
   */
  colorMapping?: { [key: string]: string };

  /**
   * Project Image Storage
   *
   * Optional binary image data stored as ArrayBuffer for project reference
   * images, inspiration photos, or pattern diagrams. Supports various image
   * formats and provides visual context for pattern creation.
   *
   * @example
   * ```typescript
   * // Image handling and display
   * class ImageManager {
   *   async loadImage(project: Project): Promise<string | null> {
   *     if (!project.image) return null;
   *
   *     const blob = new Blob([project.image]);
   *     return new Promise((resolve) => {
   *       const reader = new FileReader();
   *       reader.onload = () => resolve(reader.result as string);
   *       reader.readAsDataURL(blob);
   *     });
   *   }
   *
   *   async setImageFromFile(project: Project, file: File): Promise<Project> {
   *     const arrayBuffer = await file.arrayBuffer();
   *     return {
   *       ...project,
   *       image: arrayBuffer
   *     };
   *   }
   * }
   * ```
   *
   * **Image Storage:**
   * - **Format**: ArrayBuffer for binary data storage
   * - **Size Limits**: Reasonable size limits for database storage
   * - **Type Support**: Common image formats (JPEG, PNG, GIF, WebP)
   * - **Compression**: Consider compression for large images
   *
   * **Use Cases:**
   * - **Reference Images**: Photos of desired final product
   * - **Pattern Diagrams**: Visual pattern representations
   * - **Inspiration**: Design inspiration and color references
   * - **Documentation**: Progress photos and technique notes
   */
  image?: ArrayBuffer;

  /**
   * Current Progress Position
   *
   * Optional position tracking coordinates indicating the user's current
   * progress through the pattern. Enables session restoration and progress
   * tracking across application sessions.
   *
   * @example
   * ```typescript
   * // Position tracking and management
   * class ProgressTracker {
   *   updatePosition(project: Project, row: number, step: number): Project {
   *     const newPosition = ModelFactory.createPosition(row, step);
   *     return {
   *       ...project,
   *       position: newPosition
   *     };
   *   }
   *
   *   calculateProgress(project: Project): ProgressInfo {
   *     if (!project.position) {
   *       return { percent: 0, description: 'Not started' };
   *     }
   *
   *     const totalSteps = this.getTotalSteps(project);
   *     const completedSteps = this.getCompletedSteps(project);
   *
   *     return {
   *       percent: (completedSteps / totalSteps) * 100,
   *       description: `${completedSteps} of ${totalSteps} steps complete`
   *     };
   *   }
   * }
   * ```
   *
   * **Position Tracking:**
   * - **Coordinates**: Zero-based row and step indices
   * - **Validation**: Coordinates validated against pattern structure
   * - **Persistence**: Automatically saved with project updates
   * - **Restoration**: Used to restore user's place in pattern
   *
   * **Integration:**
   * - **Navigation**: Supports pattern navigation components
   * - **Progress Display**: Enables progress visualization
   * - **Session Management**: Maintains state across sessions
   * - **Bookmarking**: Allows users to bookmark specific positions
   */
  position?: Position;

  /**
   * Marked Steps State
   *
   * Optional mapping of marked steps for pattern progress tracking and bead marking.
   * Stores which specific steps have been marked with which mark mode values,
   * enabling persistent step marking across sessions and project navigation.
   *
   * @example
   * ```typescript
   * // Marked steps management
   * class MarkedStepsManager {
   *   markStep(project: Project, rowIndex: number, stepIndex: number, markMode: number): Project {
   *     const stepKey = `${rowIndex}-${stepIndex}`;
   *     return {
   *       ...project,
   *       markedSteps: {
   *         ...project.markedSteps,
   *         [stepKey]: markMode
   *       }
   *     };
   *   }
   *
   *   unmarkStep(project: Project, rowIndex: number, stepIndex: number): Project {
   *     const stepKey = `${rowIndex}-${stepIndex}`;
   *     const { [stepKey]: removed, ...remainingSteps } = project.markedSteps || {};
   *     return {
   *       ...project,
   *       markedSteps: remainingSteps
   *     };
   *   }
   *
   *   getStepMark(project: Project, rowIndex: number, stepIndex: number): number {
   *     const stepKey = `${rowIndex}-${stepIndex}`;
   *     return project.markedSteps?.[stepKey] ?? 0; // Default to unmarked
   *   }
   * }
   * ```
   *
   * **Key Format**: "rowIndex-stepIndex" (e.g., "0-3" for row 0, step 3)
   * **Mark Mode Values:**
   * - **0**: Unmarked (not stored in the map)
   * - **1**: First mark state (typically for starting beads)
   * - **2**: Second mark state (progress tracking)
   * - **3+**: Additional marking states as needed
   *
   * **Project-Specific Benefits:**
   * - **Step-Level Persistence**: Individual step markings persist with project data
   * - **Progress Tracking**: Visual indication of completed or marked steps
   * - **Cross-Session Continuity**: Marked steps restored when project loads
   * - **Data Portability**: Marked steps travel with exported projects
   * - **Pattern Analysis**: Enables analysis of marking patterns and completion
   */
  markedSteps?: { [stepKey: string]: number };
}

import { Project } from '../../../core/models/project';
import { Row } from '../../../core/models/row';
import { Position } from '../../../core/models/position';
import { DEFAULT_VALUES } from '../../../core/models/model-factory';

/**
 * NullProject - Null Object Pattern Implementation for Project
 *
 * Provides a safe default implementation of the Project interface using the Null Object pattern.
 * This class eliminates the need for null checks throughout the application by providing
 * sensible default values and behaviors when no actual project is available.
 *
 * ## Null Object Pattern Benefits
 *
 * - **Eliminates null checks**: Provides safe default behavior without null reference exceptions
 * - **Consistent interface**: Implements full Project interface with safe defaults
 * - **Predictable behavior**: Always returns safe values for all project properties
 * - **Error prevention**: Prevents runtime errors from null/undefined project references
 *
 * ## Usage Patterns
 *
 * - **Default project state**: Used when no project is selected or loaded
 * - **Error recovery**: Fallback when project loading fails
 * - **Safe initialization**: Prevents null reference errors during app startup
 * - **Testing scenarios**: Provides predictable test data for unit tests
 *
 * ## Integration Features
 *
 * - **ModelFactory integration**: Uses DEFAULT_VALUES for consistent defaults
 * - **State management**: Safe to use in Redux store without null checks
 * - **Component safety**: Components can safely render without null guards
 * - **Service operations**: Services can operate safely without defensive programming
 *
 * @example
 * ```typescript
 * // Safe project initialization
 * class ProjectService {
 *   private currentProject: Project = new NullProject();
 *
 *   loadProject(id: number): void {
 *     if (id === 0) {
 *       this.currentProject = new NullProject();
 *     } else {
 *       this.currentProject = this.loadFromDatabase(id);
 *     }
 *   }
 *
 *   // Always safe to call without null checks
 *   getProjectName(): string {
 *     return this.currentProject.name; // Returns '' for NullProject
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Component usage without null guards
 * class ProjectComponent {
 *   @Input() project: Project = new NullProject();
 *
 *   // Safe to use without null checks
 *   get displayName(): string {
 *     return this.project.name || 'Untitled Project';
 *   }
 *
 *   get rowCount(): number {
 *     return this.project.rows.length; // Returns 0 for NullProject
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // State management integration
 * const initialState = {
 *   currentProject: new NullProject(), // Safe default
 *   projects: []
 * };
 *
 * function projectReducer(state = initialState, action: any) {
 *   switch (action.type) {
 *     case 'LOAD_PROJECT_SUCCESS':
 *       return { ...state, currentProject: action.payload };
 *     case 'CLEAR_PROJECT':
 *       return { ...state, currentProject: new NullProject() };
 *     default:
 *       return state;
 *   }
 * }
 * ```
 *
 * @class NullProject
 * @implements {Project}
 * @since 1.0.0
 */
export class NullProject implements Project {
  /**
   * Project identifier - always 0 for null project
   * @readonly
   */
  public readonly id: number = 0;

  /**
   * Project name - always empty string for null project
   * @readonly
   */
  public readonly name: string = '';

  /**
   * Project rows - always empty array for null project
   * @readonly
   */
  public readonly rows: Row[] = [];

  /**
   * Current position - uses safe default position
   * @readonly
   */
  public readonly position: Position = DEFAULT_VALUES.position();

  /**
   * First/Last appearance map - always undefined for null project
   * @readonly
   */
  public readonly firstLastAppearanceMap = undefined;

  /**
   * Color mapping - always undefined for null project
   * @readonly
   */
  public readonly colorMapping = undefined;

  /**
   * Project image - always undefined for null project
   * @readonly
   */
  public readonly image = undefined;

  /**
   * Identify null project instance
   *
   * Returns true to indicate this is a null project instance. This method
   * allows code to distinguish between actual projects and null objects
   * when needed for specific logic paths.
   *
   * @returns {boolean} Always returns true for NullProject instances
   *
   * @example
   * ```typescript
   * // Check if project is null before performing operations
   * if (project.isNull && project.isNull()) {
   *   console.log('No project selected');
   * } else {
   *   console.log(`Working with project: ${project.name}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Conditional rendering based on null status
   * class ProjectDisplayComponent {
   *   shouldShowProject(): boolean {
   *     return !(this.project.isNull && this.project.isNull());
   *   }
   * }
   * ```
   */
  public isNull(): boolean {
    return true;
  }

  /**
   * String representation for debugging
   *
   * Returns a string identifier for debugging and logging purposes.
   * Useful for identifying null projects in console output and error messages.
   *
   * @returns {string} Always returns 'NullProject'
   *
   * @example
   * ```typescript
   * // Debugging project state
   * console.log(`Current project: ${project.toString()}`);
   * // Output: "Current project: NullProject"
   * ```
   *
   * @example
   * ```typescript
   * // Error logging with project context
   * this.logger.error(`Operation failed for project: ${project.toString()}`);
   * ```
   */
  public toString(): string {
    return 'NullProject';
  }
}

/**
 * Project Management Feature Module - CRUD Operations and Pattern Management
 *
 * This module provides comprehensive project management functionality including
 * project creation, editing, deletion, and organization. It handles the core
 * business logic for managing beading patterns and their associated metadata.
 *
 * @fileoverview
 * Complete project management feature including UI components, business services,
 * and domain models. Supports multiple pattern formats, import/export operations,
 * and project organization with robust error handling and validation.
 *
 * **Feature Architecture:**
 * ```
 * Project Management
 * ├── Components (UI Layer)
 * │   ├── ProjectSelectorComponent
 * │   ├── ProjectSummaryComponent
 * │   └── ProjectInspectorComponent
 * ├── Services (Business Logic)
 * │   ├── ProjectService
 * │   └── ZipperService
 * └── Models (Domain Layer)
 *     ├── BeadProject
 *     ├── NullProject
 *     └── MockProject
 * ```
 *
 * **Core Capabilities:**
 * - **Project Creation**: Create new projects from patterns or templates
 * - **Import/Export**: Support for multiple pattern formats (PDF, RGS, etc.)
 * - **Pattern Analysis**: First/Last Appearance Map (FLAM) generation
 * - **Project Organization**: Sorting, filtering, and search capabilities
 * - **Data Validation**: Comprehensive input validation and error handling
 *
 * @example
 * ```typescript
 * // Project creation and management
 * import { ProjectService, BeadProject } from '@features/project-management';
 *
 * @Component({})
 * export class ProjectManagerComponent {
 *   constructor(private projectService: ProjectService) {}
 *
 *   async createProject(patternData: string): Promise<void> {
 *     try {
 *       const project = await this.projectService.createFromPattern(patternData);
 *       await this.projectService.saveProject(project);
 *     } catch (error) {
 *       // Handle project creation errors
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Pattern import and analysis
 * import { ProjectInspectorComponent } from '@features/project-management';
 *
 * // Use in template
 * <app-project-inspector
 *   [project]="currentProject"
 *   [flamData]="flamAnalysis"
 *   (projectUpdated)="onProjectUpdated($event)">
 * </app-project-inspector>
 * ```
 *
 * **State Management Integration:**
 * - Integrates with ReactiveStateStore for centralized state management
 * - Supports optimistic updates and error recovery
 * - Maintains project history and undo capabilities
 * - Provides real-time collaboration features
 *
 * **Performance Considerations:**
 * - Lazy loading of project data and components
 * - Virtual scrolling for large project lists
 * - Efficient pattern parsing and validation
 * - Memory management for large pattern files
 *
 * @since 1.0.0
 */

// Project management feature exports
export * from './components';
export * from './services';
export * from './models';

import { Routes } from '@angular/router';

import { ProjectComponent } from './features/pattern-tracking/components/project/project.component';
import { ProjectInspectorComponent } from './features/project-management/components/project-inspector/project-inspector.component';
import { ProjectSelectorComponent } from './features/project-management/components/project-selector/project-selector.component';
import { FlamAnalysisComponent } from './features/project-management/pages/flam-analysis/flam-analysis.component';
import { SettingsComponent } from './features/settings/components/settings/settings.component';

/**
 * Application routing configuration for the Rowguide pattern tracking application.
 *
 * This configuration defines the client-side navigation structure using Angular Router,
 * enabling seamless navigation between different application features while maintaining
 * a single-page application experience.
 *
 * @remarks
 * The routing structure follows a feature-based organization pattern, where each route
 * corresponds to a specific domain feature (pattern tracking, project management, settings).
 * All routes use standalone components with lazy loading capabilities for optimal performance.
 *
 * @example
 * ```typescript
 * // Navigation example in components
 * constructor(private router: Router) {}
 *
 * navigateToProject(projectId: number): void {
 *   this.router.navigate(['/project', projectId]);
 * }
 *
 * navigateToSettings(): void {
 *   this.router.navigate(['/settings']);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Route parameter access
 * constructor(private activatedRoute: ActivatedRoute) {}
 *
 * ngOnInit(): void {
 *   this.activatedRoute.params.subscribe(params => {
 *     const projectId = params['id'];
 *     // Handle project ID parameter
 *   });
 * }
 * ```
 *
 * @see {@link https://angular.io/guide/router | Angular Router Guide}
 * @see {@link https://angular.io/api/router/Routes | Routes Interface}
 */
export const routes: Routes = [
  /**
   * Project pattern tracking route (without ID parameter).
   *
   * Displays the main project component for pattern tracking functionality.
   * When accessed without a project ID, the component will load the most
   * recently accessed project or prompt for project selection.
   *
   * @route `/project`
   * @component {@link ProjectComponent}
   * @feature Pattern tracking, step navigation, progress marking
   *
   * @example
   * ```typescript
   * // Navigate to project view
   * this.router.navigate(['/project']);
   * ```
   */
  { path: 'project', component: ProjectComponent },

  /**
   * Project pattern tracking route with ID parameter.
   *
   * Displays the project component for a specific project identified by its ID.
   * The ID parameter is used to load the project data and initialize the
   * pattern tracking interface with the correct project context.
   *
   * @route `/project/:id`
   * @component {@link ProjectComponent}
   * @param id - The unique identifier of the project to display
   * @feature Pattern tracking, step navigation, progress marking
   *
   * @example
   * ```typescript
   * // Navigate to specific project
   * this.router.navigate(['/project', 123]);
   *
   * // Access route parameter in component
   * this.activatedRoute.params.subscribe(params => {
   *   const projectId = Number(params['id']);
   *   this.loadProject(projectId);
   * });
   * ```
   */
  { path: 'project/:id', component: ProjectComponent },

  /**
   * Project selection route.
   *
   * Displays the project selector component allowing users to choose from
   * available projects or create new projects. This route provides the
   * main entry point for project management workflows.
   *
   * @route `/project-selector`
   * @component {@link ProjectSelectorComponent}
   * @feature Project listing, project creation, project search
   *
   * @example
   * ```typescript
   * // Navigate to project selector
   * this.router.navigate(['/project-selector']);
   * ```
   */
  { path: 'project-selector', component: ProjectSelectorComponent },

  /**
   * Project inspection and management route.
   *
   * Displays the project inspector component for detailed project management
   * operations including editing project properties, managing project data,
   * and performing administrative tasks.
   *
   * @route `/project-inspector`
   * @component {@link ProjectInspectorComponent}
   * @feature Project editing, metadata management, project administration
   *
   * @example
   * ```typescript
   * // Navigate to project inspector
   * this.router.navigate(['/project-inspector']);
   *
   * // Navigate with query parameters
   * this.router.navigate(['/project-inspector'], {
   *   queryParams: { projectId: 123 }
   * });
   * ```
   */
  { path: 'project-inspector', component: ProjectInspectorComponent },

  /**
   * Project inspection and management route with ID parameter.
   *
   * Displays the project inspector component for a specific project identified by its ID.
   * The ID parameter is used to load the project data directly without relying on
   * localStorage state, providing direct access to project management features.
   *
   * @route `/project-inspector/:id`
   * @component {@link ProjectInspectorComponent}
   * @param id - The unique identifier of the project to inspect
   * @feature Project editing, metadata management, project administration
   *
   * @example
   * ```typescript
   * // Navigate to specific project inspector
   * this.router.navigate(['/project-inspector', 123]);
   *
   * // Access route parameter in component
   * this.activatedRoute.params.subscribe(params => {
   *   const projectId = Number(params['id']);
   *   this.loadProjectForInspection(projectId);
   * });
   * ```
   */
  { path: 'project-inspector/:id', component: ProjectInspectorComponent },

  /**
   * Application settings route.
   *
   * Displays the settings component for configuring application preferences,
   * customizing user interface options, and managing application behavior.
   *
   * @route `/settings`
   * @component {@link SettingsComponent}
   * @feature User preferences, application configuration, theme settings
   *
   * @example
   * ```typescript
   * // Navigate to settings
   * this.router.navigate(['/settings']);
   * ```
   */
  { path: 'settings', component: SettingsComponent },

  /**
   * FLAM Analysis route.
   *
   * Displays the FLAM (First/Last Appearance Map) analysis component for
   * detailed pattern analysis, color management, and visualization.
   * Extracted from the project inspector for improved UX and maintainability.
   *
   * @route `/flam-analysis`
   * @component {@link FlamAnalysisComponent}
   * @feature FLAM data visualization, color mapping, pattern analysis
   *
   * @example
   * ```typescript
   * // Navigate to FLAM analysis
   * this.router.navigate(['/flam-analysis']);
   * ```
   */
  { path: 'flam-analysis', component: FlamAnalysisComponent },

  /**
   * FLAM Analysis route with ID parameter.
   *
   * Displays the FLAM (First/Last Appearance Map) analysis component for
   * a specific project identified by its ID. The ID parameter is used to
   * load the project data directly without relying on localStorage state,
   * providing direct access to pattern analysis features.
   *
   * @route `/flam-analysis/:id`
   * @component {@link FlamAnalysisComponent}
   * @param id - The unique identifier of the project to analyze
   * @feature FLAM data visualization, color mapping, pattern analysis
   *
   * @example
   * ```typescript
   * // Navigate to specific project FLAM analysis
   * this.router.navigate(['/flam-analysis', 123]);
   *
   * // Access route parameter in component
   * this.activatedRoute.params.subscribe(params => {
   *   const projectId = Number(params['id']);
   *   this.loadProjectForAnalysis(projectId);
   * });
   * ```
   */
  { path: 'flam-analysis/:id', component: FlamAnalysisComponent },

  /**
   * Default route redirect.
   *
   * Redirects the root path to the project route, ensuring users are
   * directed to the main application functionality when accessing the
   * application root. The `pathMatch: 'full'` ensures this redirect
   * only applies to the exact empty path.
   *
   * @route `/`
   * @redirectTo `/project`
   * @pathMatch `full`
   *
   * @example
   * ```typescript
   * // When user navigates to "/"
   * // They will be redirected to "/project"
   * ```
   */
  { path: '', redirectTo: '/project', pathMatch: 'full' },
];

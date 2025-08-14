/**
 * Project Management Components - UI Components for Project Operations
 *
 * This module provides comprehensive UI components for project management
 * operations including project selection, inspection, and summary views.
 * All components follow Angular best practices with reactive patterns.
 *
 * @fileoverview
 * Complete set of UI components for project management functionality including
 * project selection, detailed inspection, and summary views. Components are
 * designed for reusability and optimal user experience.
 *
 * **Component Architecture:**
 * ```
 * Project Management Components
 * ├── ProjectSelectorComponent
 * │   ├── File import handling
 * │   ├── Project creation wizard
 * │   └── Format detection and validation
 * ├── ProjectInspectorComponent
 * │   ├── FLAM data visualization
 * │   ├── Pattern analysis tools
 * │   └── Color management interface
 * └── ProjectSummaryComponent
 *     ├── Project metadata display
 *     ├── Quick actions and controls
 *     └── Project statistics and info
 * ```
 *
 * **Component Features:**
 * - **Reactive Design**: Components use OnPush change detection
 * - **Error Handling**: Integrated error boundaries and recovery
 * - **Accessibility**: Full ARIA support and keyboard navigation
 * - **Performance**: Optimized for large pattern files
 * - **Responsive**: Mobile-friendly responsive design
 *
 * **Usage Guidelines:**
 * - Use components as standalone or in combination
 * - Leverage Input/Output properties for data flow
 * - Implement proper error handling for user actions
 * - Follow accessibility guidelines for inclusive design
 *
 * @example
 * ```typescript
 * // Project selection integration
 * import { ProjectSelectorComponent } from '@features/project-management/components';
 *
 * @Component({
 *   template: `
 *     <app-project-selector
 *       [allowedFormats]="['pdf', 'rgs', 'text']"
 *       [maxFileSize]="10485760"
 *       (projectCreated)="onProjectCreated($event)"
 *       (importError)="onImportError($event)">
 *     </app-project-selector>
 *   `
 * })
 * export class ProjectManagementComponent {
 *   onProjectCreated(project: Project): void {
 *     console.log('New project created:', project);
 *   }
 *
 *   onImportError(error: Error): void {
 *     console.error('Import failed:', error);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Project inspection with FLAM analysis
 * import { ProjectInspectorComponent } from '@features/project-management/components';
 *
 * @Component({
 *   template: `
 *     <app-project-inspector
 *       [project]="currentProject"
 *       [flamData]="flamAnalysis"
 *       [enableColorEditing]="true"
 *       (colorUpdated)="onColorUpdated($event)"
 *       (positionChanged)="onPositionChanged($event)">
 *     </app-project-inspector>
 *   `
 * })
 * export class PatternAnalysisComponent {
 *   currentProject: Project;
 *   flamAnalysis: FLAM;
 *
 *   onColorUpdated(colorUpdate: ColorUpdateEvent): void {
 *     // Handle color assignment changes
 *   }
 *
 *   onPositionChanged(position: Position): void {
 *     // Handle position tracking updates
 *   }
 * }
 * ```
 *
 * **Performance Optimization:**
 * - Virtual scrolling for large pattern data
 * - OnPush change detection strategy
 * - TrackBy functions for efficient list updates
 * - Lazy loading of heavy analysis features
 *
 * @since 1.0.0
 */

// Project management components
export * from './project-selector/project-selector.component';
export * from './project-inspector/project-inspector.component';
export * from './project-summary/project-summary.component';
export * from './flam-analysis/flam-analysis.component';

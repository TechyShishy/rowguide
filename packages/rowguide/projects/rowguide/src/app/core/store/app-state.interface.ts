/**
 * AppState - Root Application State Interface
 *
 * Defines the complete state tree structure for the Rowguide pattern tracking
 * application following Redux-style state management principles with domain-driven
 * design and clear separation of concerns across feature domains.
 *
 * @example
 * ```typescript
 * // Accessing state through selectors
 * import { select } from '@ngrx/store';
 * import { AppState } from './app-state.interface';
 *
 * class PatternNavigator {
 *   constructor(private store: Store<AppState>) {}
 *
 *   getCurrentProject() {
 *     return this.store.pipe(
 *       select(state => {
 *         const projectId = state.projects.currentProjectId;
 *         return projectId ? state.projects.entities[projectId] : null;
 *       })
 *     );
 *   }
 *
 *   getCurrentPosition() {
 *     return this.store.pipe(
 *       select(state => state.ui.currentPosition)
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // State updates with actions
 * import { createAction } from '@ngrx/store';
 *
 * class StateManager {
 *   updateProjectState(projectId: number, updates: Partial<Project>) {
 *     this.store.dispatch(ProjectActions.updateProject({
 *       projectId,
 *       updates
 *     }));
 *   }
 *
 *   setCurrentPosition(position: Position) {
 *     this.store.dispatch(UiActions.setCurrentPosition({ position }));
 *   }
 * }
 * ```
 *
 * **State Tree Organization:**
 *
 * **Domain Separation:**
 * - **Projects**: Core business domain for pattern management
 * - **UI**: User interface state and interaction tracking
 * - **System**: Application health and performance monitoring
 * - **Settings**: User preferences and configuration
 * - **Notifications**: User feedback and messaging system
 * - **Mark Mode**: Pattern marking and progress tracking
 *
 * **Design Principles:**
 * - **Immutability**: All state properties are readonly
 * - **Normalization**: Entities stored by ID for efficient lookups
 * - **Separation**: Clear boundaries between different domains
 * - **Composability**: State can be composed from individual slices
 *
 * **Performance Characteristics:**
 * - **Memoization**: Selectors cache computed values
 * - **Efficient Updates**: Only changed slices trigger re-renders
 * - **Memory Management**: Normalized entities prevent duplication
 * - **Time Travel**: State history enables debugging
 *
 * @see {@link ProjectState} For project domain state structure
 * @see {@link UiState} For user interface state management
 * @see {@link SystemState} For system monitoring and diagnostics
 * @since 1.0.0
 */

import { Project } from '../models/project';
import { Position } from '../models/position';
import { Row } from '../models/row';
import { NotificationState } from './reducers/notification-reducer';
import { MarkModeState } from './reducers/mark-mode-reducer';

/**
 * Root Application State Tree
 *
 * Complete state tree structure containing all application domains organized
 * by feature areas. Follows Redux principles with immutable, normalized state
 * that supports efficient updates and change detection.
 *
 * @example
 * ```typescript
 * // State initialization and setup
 * import { createInitialState } from './app-state.interface';
 * import { ReactiveStateStore } from './reactive-state-store';
 *
 * class AppInitializer {
 *   initializeState(): ReactiveStateStore<AppState> {
 *     const initialState = createInitialState();
 *     const store = new ReactiveStateStore(initialState);
 *
 *     // Add middleware for debugging
 *     store.addMiddleware((action, state) => {
 *       console.log('Action:', action.type, action.payload);
 *       console.log('State:', state);
 *     });
 *
 *     return store;
 *   }
 * }
 * ```
 *
 * **State Domain Overview:**
 * - **projects**: Entity management for patterns and tracking data
 * - **ui**: Interface state, navigation, and user interactions
 * - **system**: Performance monitoring and feature flags
 * - **settings**: User preferences and application configuration
 * - **notifications**: User feedback and messaging queue
 * - **markMode**: Pattern marking progress and mode tracking
 */
export interface AppState {
  /**
   * Project Domain State
   *
   * Manages all project-related entities, current selection, and persistence
   * state following normalized entity patterns for efficient lookups and updates.
   *
   * @see {@link ProjectState} For detailed project state structure
   */
  readonly projects: ProjectState;

  /**
   * User Interface State
   *
   * Tracks current navigation position, UI component states, visual settings,
   * and user interaction context for responsive interface management.
   *
   * @see {@link UiState} For detailed UI state management patterns
   */
  readonly ui: UiState;

  /**
   * System Monitoring State
   *
   * Contains application health metrics, performance data, storage information,
   * and feature flags for system monitoring and progressive enhancement.
   *
   * @see {@link SystemState} For system monitoring documentation
   */
  readonly system: SystemState;

  /**
   * Application Settings State
   *
   * User preferences, configuration options, and application behavior settings
   * persisted across sessions for consistent user experience.
   *
   * @see {@link SettingsState} For configuration management patterns
   */
  readonly settings: SettingsState;

  /**
   * Notification Queue State
   *
   * User feedback messages, alerts, and notification management for
   * non-blocking user communication and action prompts.
   *
   * @see {@link NotificationState} For notification lifecycle management
   */
  readonly notifications: NotificationState;

  /**
   * Mark Mode State
   *
   * Pattern marking progress, mode tracking, and step completion state
   * for pattern navigation and progress persistence.
   *
   * @see {@link MarkModeState} For mark mode state transitions
   */
  readonly markMode: MarkModeState;
}

/**
 * Project Domain State - Entity Management for Pattern Tracking
 *
 * Manages all project-related entities in normalized form for efficient lookups,
 * updates, and change detection. Follows entity-adapter patterns for CRUD
 * operations and maintains current selection state.
 *
 * @example
 * ```typescript
 * // Project state access patterns
 * import { createSelector } from '@ngrx/store';
 *
 * const selectProjects = (state: AppState) => state.projects;
 * const selectAllProjects = createSelector(
 *   selectProjects,
 *   (projectState) => Object.values(projectState.entities)
 * );
 *
 * const selectCurrentProject = createSelector(
 *   selectProjects,
 *   (projectState) => {
 *     const { currentProjectId, entities } = projectState;
 *     return currentProjectId ? entities[currentProjectId] : null;
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Project state management
 * class ProjectManager {
 *   createProject(name: string): ProjectState {
 *     const newProject = ModelFactory.createProject({ name });
 *     return {
 *       ...state.projects,
 *       entities: {
 *         ...state.projects.entities,
 *         [newProject.id]: newProject
 *       },
 *       currentProjectId: newProject.id,
 *       isDirty: true,
 *       lastSaved: null
 *     };
 *   }
 * }
 * ```
 *
 * **Entity Management Patterns:**
 * - **Normalized Storage**: Projects stored by ID in entities map
 * - **Current Selection**: Single source of truth for active project
 * - **Loading States**: Tracks async operations for responsive UI
 * - **Error Handling**: Entity-specific error state management
 * - **Dirty Tracking**: Monitors unsaved changes for persistence
 * - **Save State**: Tracks last save timestamp for data integrity
 *
 * **Performance Optimizations:**
 * - **Memoized Selectors**: Cached project derivations
 * - **Partial Updates**: Only modified properties trigger changes
 * - **Reference Equality**: Immutable updates preserve references
 *
 * @since 1.0.0
 */
export interface ProjectState {
  /**
   * Normalized Project Entities
   *
   * Projects stored by ID for O(1) lookup performance and efficient updates.
   * Each project contains complete pattern data including rows, steps, and
   * tracking information.
   *
   * @example
   * ```typescript
   * // Accessing projects by ID
   * const getProject = (state: ProjectState, id: number): Project | null => {
   *   return state.entities[id] ?? null;
   * };
   *
   * // Safe project access with validation
   * const getSafeProject = (state: ProjectState, id: number): Project | null => {
   *   const project = state.entities[id];
   *   return ModelTypeGuards.isValidProject(project) ? project : null;
   * };
   * ```
   */
  readonly entities: { [id: number]: Project };

  /**
   * Current Project Selection
   *
   * ID of the currently active project for navigation and editing operations.
   * Null when no project is selected or available.
   *
   * @example
   * ```typescript
   * // Current project access pattern
   * const getCurrentProject = (state: ProjectState): Project | null => {
   *   if (!state.currentProjectId) return null;
   *   return state.entities[state.currentProjectId] ?? null;
   * };
   * ```
   */
  readonly currentProjectId: number | null;

  /**
   * Loading State Indicator
   *
   * Tracks async operations for responsive UI feedback and operation management.
   * Prevents duplicate operations and provides loading state context.
   */
  readonly loading: boolean;

  /**
   * Error State Information
   *
   * Contains error details from failed operations for user feedback
   * and recovery action presentation.
   *
   * @example
   * ```typescript
   * // Error handling pattern
   * const handleProjectError = (state: ProjectState): string | null => {
   *   if (state.error) {
   *     return `Project operation failed: ${state.error}`;
   *   }
   *   return null;
   * };
   * ```
   */
  readonly error: string | null;

  /**
   * Last Save Timestamp
   *
   * Records when the project was last successfully persisted to storage.
   * Used for data integrity checks and automatic save scheduling.
   *
   * @example
   * ```typescript
   * // Check if save is needed
   * const needsSave = (state: ProjectState): boolean => {
   *   return state.isDirty && (
   *     !state.lastSaved ||
   *     Date.now() - state.lastSaved.getTime() > AUTO_SAVE_INTERVAL
   *   );
   * };
   * ```
   */
  readonly lastSaved: Date | null;

  /**
   * Dirty State Flag
   *
   * Indicates whether the project has unsaved changes requiring persistence.
   * Used for save prompts and automatic save scheduling.
   *
   * @example
   * ```typescript
   * // Dirty state management
   * const markDirty = (state: ProjectState): ProjectState => ({
   *   ...state,
   *   isDirty: true
   * });
   *
   * const markClean = (state: ProjectState): ProjectState => ({
   *   ...state,
   *   isDirty: false,
   *   lastSaved: new Date()
   * });
   * ```
   */
  readonly isDirty: boolean;
}

/**
 * User Interface State - Navigation and Interaction Management
 *
 * Manages all user interface-related state including current navigation position,
 * component visibility settings, user preferences, and transient UI notifications.
 * Optimized for responsive interface updates and user experience consistency.
 *
 * @example
 * ```typescript
 * // UI state access patterns
 * import { createSelector } from '@ngrx/store';
 *
 * const selectUi = (state: AppState) => state.ui;
 * const selectCurrentStep = createSelector(
 *   selectUi,
 *   (uiState) => {
 *     const { currentPosition } = uiState;
 *     return currentPosition ? {
 *       row: currentPosition.row,
 *       step: currentPosition.step
 *     } : null;
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // UI state management
 * class UiManager {
 *   navigateToStep(position: Position): UiState {
 *     return {
 *       ...currentUiState,
 *       currentPosition: position,
 *       selectedStepId: null // Clear selection when navigating
 *     };
 *   }
 *
 *   toggleSidebar(): UiState {
 *     return {
 *       ...currentUiState,
 *       sidebarOpen: !currentUiState.sidebarOpen
 *     };
 *   }
 * }
 * ```
 *
 * **UI State Management Patterns:**
 * - **Position Tracking**: Current navigation position in pattern
 * - **Component State**: Visibility and configuration of UI elements
 * - **User Preferences**: Visual settings and interface preferences
 * - **Transient Notifications**: Short-lived user feedback messages
 * - **Responsive Design**: Zoom and layout adaptation state
 *
 * **Performance Considerations:**
 * - **Selective Updates**: Only changed UI properties trigger re-renders
 * - **Notification Cleanup**: Automatic removal of expired notifications
 * - **State Persistence**: User preferences saved across sessions
 *
 * @since 1.0.0
 */
export interface UiState {
  /**
   * Current Pattern Navigation Position
   *
   * Tracks the user's current position within the active pattern for
   * navigation, progress tracking, and state restoration.
   *
   * @example
   * ```typescript
   * // Position-based navigation
   * const navigateToPosition = (position: Position): void => {
   *   if (ModelTypeGuards.isValidPosition(position)) {
   *     store.dispatch(UiActions.setCurrentPosition({ position }));
   *   }
   * };
   *
   * // Position validation
   * const isValidPosition = (state: UiState, project: Project): boolean => {
   *   const pos = state.currentPosition;
   *   if (!pos) return false;
   *
   *   const row = SafeAccess.getRowAtIndex(project, pos.row);
   *   return row !== null && pos.step < row.steps.length;
   * };
   * ```
   */
  readonly currentPosition: Position | null;

  /**
   * Selected Step Identifier
   *
   * ID of the currently selected step for editing or detailed viewing.
   * Independent of navigation position to allow selection without movement.
   *
   * @example
   * ```typescript
   * // Step selection management
   * const selectStep = (stepId: number): void => {
   *   store.dispatch(UiActions.selectStep({ stepId }));
   * };
   *
   * const clearSelection = (): void => {
   *   store.dispatch(UiActions.selectStep({ stepId: null }));
   * };
   * ```
   */
  readonly selectedStepId: number | null;

  /**
   * Interface Zoom Level
   *
   * Zoom factor for pattern display, affecting text size and element scaling.
   * Supports accessibility and detailed viewing requirements.
   *
   * @example
   * ```typescript
   * // Zoom level management
   * const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
   * const MIN_ZOOM = 0.5;
   * const MAX_ZOOM = 2.0;
   *
   * const adjustZoom = (delta: number, currentZoom: number): number => {
   *   const newZoom = Math.round((currentZoom + delta) * 100) / 100;
   *   return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
   * };
   * ```
   */
  readonly zoomLevel: number;

  /**
   * Sidebar Visibility State
   *
   * Controls whether the navigation sidebar is open or collapsed.
   * Affects layout and available screen space for pattern display.
   */
  readonly sidebarOpen: boolean;

  /**
   * Bead Count Display Toggle
   *
   * Controls visibility of bead count information in pattern steps.
   * User preference for interface complexity and information density.
   */
  readonly beadCountVisible: boolean;

  /**
   * Dark Mode Theme Setting
   *
   * User preference for dark or light interface theme.
   * Affects all UI components and pattern display styling.
   *
   * @example
   * ```typescript
   * // Theme management
   * const applyTheme = (darkMode: boolean): void => {
   *   document.body.classList.toggle('dark-theme', darkMode);
   *   localStorage.setItem('darkMode', darkMode.toString());
   * };
   * ```
   */
  readonly darkMode: boolean;

  /**
   * Transient UI Notifications
   *
   * Array of temporary user feedback messages with automatic cleanup.
   * Used for success confirmations, warnings, and error messages.
   *
   * @example
   * ```typescript
   * // Notification management
   * const addNotification = (
   *   message: string,
   *   type: 'success' | 'warning' | 'error',
   *   duration = 5000
   * ): UiNotification => ({
   *   id: Date.now(),
   *   message,
   *   type,
   *   timestamp: new Date(),
   *   duration
   * });
   *
   * const removeExpiredNotifications = (
   *   notifications: UiNotification[]
   * ): UiNotification[] => {
   *   const now = Date.now();
   *   return notifications.filter(n =>
   *     now - n.timestamp.getTime() < n.duration
   *   );
   * };
   * ```
   */
  readonly notifications: UiNotification[];
}

/**
 * System state for performance and diagnostics
 */
/**
 * System Monitoring State - Application Health and Performance
 *
 * Tracks application health metrics, system capabilities, performance data,
 * and feature flag configuration for progressive enhancement and monitoring.
 * Enables responsive feature delivery and system diagnostics.
 *
 * @example
 * ```typescript
 * // System monitoring patterns
 * import { createSelector } from '@ngrx/store';
 *
 * const selectSystem = (state: AppState) => state.system;
 * const selectSystemHealth = createSelector(
 *   selectSystem,
 *   (systemState) => ({
 *     online: systemState.isOnline,
 *     storage: systemState.storageQuota?.percentage ?? 0,
 *     performance: systemState.performanceMetrics.renderTime,
 *     errors: systemState.performanceMetrics.errorCount
 *   })
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Feature flag management
 * class FeatureManager {
 *   isFeatureEnabled(feature: keyof FeatureFlags): boolean {
 *     const flags = this.store.select(state => state.system.featureFlags);
 *     return flags[feature] ?? false;
 *   }
 *
 *   updateFeature(feature: keyof FeatureFlags, enabled: boolean): void {
 *     this.store.dispatch(SystemActions.updateFeatureFlag({
 *       feature,
 *       enabled
 *     }));
 *   }
 * }
 * ```
 *
 * **System State Management:**
 * - **Online Status**: Network connectivity monitoring
 * - **Storage Tracking**: Quota usage and availability monitoring
 * - **Performance Metrics**: Render time and memory usage tracking
 * - **Feature Flags**: Progressive enhancement and A/B testing
 * - **Error Monitoring**: Application health and stability tracking
 *
 * **Performance Optimization:**
 * - **Selective Monitoring**: Only essential metrics tracked
 * - **Throttled Updates**: Performance data updated at intervals
 * - **Feature Gating**: Performance-intensive features conditionally enabled
 *
 * @since 1.0.0
 */
export interface SystemState {
  /**
   * Network Connectivity Status
   *
   * Tracks whether the application has network connectivity for
   * sync operations, online features, and offline mode handling.
   *
   * @example
   * ```typescript
   * // Online status handling
   * const handleOnlineStatus = (isOnline: boolean): void => {
   *   if (isOnline) {
   *     // Sync pending changes
   *     syncService.syncPendingChanges();
   *   } else {
   *     // Switch to offline mode
   *     notificationService.showOfflineWarning();
   *   }
   * };
   * ```
   */
  readonly isOnline: boolean;

  /**
   * Storage Quota Information
   *
   * Tracks available storage space for project data, patterns, and cache.
   * Used for storage management and user warnings about space limitations.
   *
   * @example
   * ```typescript
   * // Storage monitoring
   * const checkStorageHealth = (quota: StorageQuota | null): string => {
   *   if (!quota) return 'Unknown storage status';
   *
   *   if (quota.percentage > 90) {
   *     return 'Storage critically low - clean up recommended';
   *   } else if (quota.percentage > 75) {
   *     return 'Storage getting full - consider cleanup';
   *   }
   *   return 'Storage healthy';
   * };
   * ```
   */
  readonly storageQuota: StorageQuota | null;

  /**
   * Application Performance Metrics
   *
   * Real-time performance data for monitoring application health,
   * identifying bottlenecks, and optimizing user experience.
   *
   * @see {@link PerformanceMetrics} For detailed metrics structure
   */
  readonly performanceMetrics: PerformanceMetrics;

  /**
   * Feature Flag Configuration
   *
   * Controls progressive enhancement features, experimental functionality,
   * and conditional feature delivery based on user segments or system capabilities.
   *
   * @see {@link FeatureFlags} For available feature toggles
   */
  readonly featureFlags: FeatureFlags;
}

/**
 * Application Settings State - User Preferences and Configuration
 *
 * Manages user preferences, application configuration, and behavior settings
 * that persist across sessions. Optimized for user experience customization
 * and advanced pattern tracking features.
 *
 * @example
 * ```typescript
 * // Settings management patterns
 * import { createSelector } from '@ngrx/store';
 *
 * const selectSettings = (state: AppState) => state.settings;
 * const selectPatternSettings = createSelector(
 *   selectSettings,
 *   (settings) => ({
 *     combineTwelve: settings.combine12,
 *     showLRDesignators: settings.lrdesignators,
 *     flamMarkersEnabled: settings.flammarkers,
 *     patternInspectorEnabled: settings.ppinspector
 *   })
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Settings persistence
 * class SettingsManager {
 *   saveSettings(updates: Partial<SettingsState>): void {
 *     this.store.dispatch(SettingsActions.updateSettings({ updates }));
 *     this.persistSettings(updates);
 *   }
 *
 *   private persistSettings(settings: Partial<SettingsState>): void {
 *     Object.entries(settings).forEach(([key, value]) => {
 *       localStorage.setItem(`setting_${key}`, JSON.stringify(value));
 *     });
 *   }
 * }
 * ```
 *
 * **Settings Categories:**
 * - **Pattern Display**: Visualization and formatting preferences
 * - **Navigation**: Movement and interaction behavior settings
 * - **Sorting**: Display order preferences for projects and patterns
 * - **Advanced Features**: Power user functionality toggles
 * - **Accessibility**: Interface adaptation settings
 *
 * **Persistence Strategy:**
 * - **Local Storage**: Settings persisted across browser sessions
 * - **Validation**: Settings validated on load with fallback defaults
 * - **Migration**: Settings schema versioning for upgrades
 *
 * @since 1.0.0
 */
export interface SettingsState {
  /**
   * Combine Twelve Pattern Setting
   *
   * Controls whether twelve-step patterns are combined into single display units
   * for simplified navigation and reduced visual complexity.
   *
   * @example
   * ```typescript
   * // Pattern display logic
   * const getDisplayRows = (rows: Row[], combine12: boolean): Row[] => {
   *   if (!combine12) return rows;
   *
   *   return rows.reduce((combined, row, index) => {
   *     if (index % 12 === 0) {
   *       combined.push(combineRowGroup(rows.slice(index, index + 12)));
   *     }
   *     return combined;
   *   }, []);
   * };
   * ```
   */
  readonly combine12: boolean;

  /**
   * Left/Right Designator Display
   *
   * Shows directional indicators for patterns that have left/right orientation
   * requirements, improving pattern accuracy and user guidance.
   */
  readonly lrdesignators: boolean;

  /**
   * FLAM Marker Visibility
   *
   * Controls display of FLAM (First Last And Middle) markers for complex
   * pattern navigation and section identification.
   *
   * @example
   * ```typescript
   * // FLAM marker rendering
   * const shouldShowFlamMarker = (
   *   row: Row,
   *   position: number,
   *   flamEnabled: boolean
   * ): boolean => {
   *   return flamEnabled && isFlamPosition(row, position);
   * };
   * ```
   */
  readonly flammarkers: boolean;

  /**
   * Pattern Progress Inspector
   *
   * Enables advanced pattern analysis tools including progress tracking,
   * statistics, and detailed pattern information display.
   */
  readonly ppinspector: boolean;

  /**
   * Zoom Feature Enable
   *
   * Controls availability of zoom functionality for detailed pattern viewing
   * and accessibility support.
   */
  readonly zoom: boolean;

  /**
   * Scroll Offset Configuration
   *
   * Pixel offset for scroll positioning when navigating to pattern elements.
   * Negative values indicate automatic calculation.
   *
   * @example
   * ```typescript
   * // Scroll positioning
   * const scrollToPosition = (element: HTMLElement, offset: number): void => {
   *   const finalOffset = offset >= 0 ? offset : calculateOptimalOffset(element);
   *   element.scrollIntoView({
   *     behavior: 'smooth',
   *     block: 'center',
   *     inline: 'nearest'
   *   });
   * };
   * ```
   */
  readonly scrolloffset: number;

  /**
   * Multi-Advance Step Count
   *
   * Number of steps to advance when using multi-step navigation commands.
   * Supports power user workflows and rapid pattern traversal.
   *
   * @example
   * ```typescript
   * // Multi-step navigation
   * const advanceMultipleSteps = (
   *   currentPos: Position,
   *   stepCount: number
   * ): Position => {
   *   return {
   *     ...currentPos,
   *     step: Math.min(currentPos.step + stepCount, maxSteps)
   *   };
   * };
   * ```
   */
  readonly multiadvance: number;

  /**
   * FLAM List Sorting Order
   *
   * Sorting preference for FLAM marker lists. Supports various sorting
   * strategies for different user workflows and pattern types.
   *
   * **Supported Values:**
   * - `'keyAsc'`: Sort by key ascending
   * - `'keyDesc'`: Sort by key descending
   * - `'positionAsc'`: Sort by position ascending
   * - `'positionDesc'`: Sort by position descending
   */
  readonly flamsort: string;

  /**
   * Project List Sorting Order
   *
   * Default sorting preference for project list display across the application.
   * Affects project selection interfaces and navigation menus.
   *
   * **Supported Values:**
   * - `'dateAsc'`: Sort by date ascending (oldest first)
   * - `'dateDesc'`: Sort by date descending (newest first)
   * - `'nameAsc'`: Sort alphabetically A-Z
   * - `'nameDesc'`: Sort alphabetically Z-A
   * - `'sizeAsc'`: Sort by size ascending
   * - `'sizeDesc'`: Sort by size descending
   */
  readonly projectsort: string;

  /**
   * Application Ready State
   *
   * Indicates whether the application has completed initialization and
   * all settings have been loaded and validated.
   *
   * @example
   * ```typescript
   * // Initialization check
   * const waitForReady = (state: AppState): Promise<void> => {
   *   if (state.settings.ready) return Promise.resolve();
   *
   *   return new Promise(resolve => {
   *     const subscription = state$.subscribe(currentState => {
   *       if (currentState.settings.ready) {
   *         subscription.unsubscribe();
   *         resolve();
   *       }
   *     });
   *   });
   * };
   * ```
   */
  readonly ready: boolean;
}

/**
 * UI Notification - User Feedback Message Interface
 *
 * Represents transient user feedback messages with automatic lifecycle management.
 * Supports rich content, action buttons, and duration-based cleanup for
 * non-blocking user communication.
 *
 * @example
 * ```typescript
 * // Creating notifications
 * const createSuccessNotification = (message: string): UiNotification => ({
 *   id: `notification_${Date.now()}_${Math.random()}`,
 *   message,
 *   type: 'success',
 *   duration: 5000,
 *   timestamp: new Date(),
 *   actions: [
 *     {
 *       label: 'Dismiss',
 *       action: 'dismiss',
 *       primary: true
 *     }
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Notification lifecycle management
 * class NotificationManager {
 *   addNotification(notification: UiNotification): void {
 *     this.store.dispatch(UiActions.addNotification({ notification }));
 *
 *     // Auto-remove after duration
 *     if (notification.duration) {
 *       setTimeout(() => {
 *         this.removeNotification(notification.id);
 *       }, notification.duration);
 *     }
 *   }
 * }
 * ```
 *
 * **Notification Types:**
 * - **info**: General information messages
 * - **success**: Positive confirmation messages
 * - **warning**: Cautionary messages requiring attention
 * - **error**: Error messages requiring user action
 *
 * @since 1.0.0
 */
export interface UiNotification {
  /**
   * Unique Notification Identifier
   *
   * Unique string identifier for notification tracking, removal, and
   * duplicate prevention across the notification system.
   */
  readonly id: string;

  /**
   * Notification Message Content
   *
   * User-visible message text. Should be clear, concise, and actionable.
   * Supports basic HTML formatting for emphasis and links.
   */
  readonly message: string;

  /**
   * Notification Type Classification
   *
   * Determines visual styling, icon, and default behavior for the notification.
   * Affects user attention priority and interface treatment.
   */
  readonly type: 'info' | 'success' | 'warning' | 'error';

  /**
   * Auto-Dismiss Duration
   *
   * Time in milliseconds before automatic notification removal.
   * Undefined means manual dismissal required. Error notifications
   * typically have longer durations or require manual dismissal.
   */
  readonly duration?: number;

  /**
   * Notification Action Buttons
   *
   * Optional array of user actions available within the notification.
   * Supports confirmation actions, navigation links, and quick operations.
   */
  readonly actions?: NotificationAction[];

  /**
   * Creation Timestamp
   *
   * When the notification was created for ordering, lifecycle management,
   * and debugging purposes.
   */
  readonly timestamp: Date;
}

/**
 * Notification Action Button - Interactive Notification Element
 *
 * Represents user-actionable buttons within notifications for quick operations,
 * confirmations, and navigation without leaving the current context.
 *
 * @example
 * ```typescript
 * // Action button configurations
 * const createUndoAction = (): NotificationAction => ({
 *   label: 'Undo',
 *   action: 'undo_last_action',
 *   primary: true
 * });
 *
 * const createNavigateAction = (target: string): NotificationAction => ({
 *   label: 'View Details',
 *   action: `navigate_to_${target}`,
 *   primary: false
 * });
 * ```
 *
 * **Action Types:**
 * - **dismiss**: Close notification
 * - **undo**: Reverse last operation
 * - **navigate**: Move to specific location
 * - **retry**: Attempt failed operation again
 * - **confirm**: Confirm pending action
 *
 * @since 1.0.0
 */
export interface NotificationAction {
  /**
   * Action Button Label
   *
   * User-visible text for the action button. Should be clear and concise,
   * typically using action verbs like "Undo", "View", "Retry".
   */
  readonly label: string;

  /**
   * Action Identifier
   *
   * Unique string identifying the action to perform when clicked.
   * Used for action dispatching and event handling.
   */
  readonly action: string;

  /**
   * Primary Action Flag
   *
   * Indicates whether this is the primary/default action for the notification.
   * Primary actions receive visual emphasis and may be triggered by keyboard.
   */
  readonly primary?: boolean;
}

/**
 * Storage Quota Information - Browser Storage Management
 *
 * Tracks browser storage usage and availability for application data management.
 * Enables proactive storage cleanup and user notifications about space limitations.
 *
 * @example
 * ```typescript
 * // Storage monitoring and management
 * class StorageManager {
 *   checkStorageHealth(quota: StorageQuota): StorageStatus {
 *     if (quota.percentage > 95) {
 *       return { level: 'critical', message: 'Storage critically low' };
 *     } else if (quota.percentage > 85) {
 *       return { level: 'warning', message: 'Storage getting full' };
 *     }
 *     return { level: 'healthy', message: 'Storage available' };
 *   }
 *
 *   formatStorageInfo(quota: StorageQuota): string {
 *     const usedMB = Math.round(quota.used / 1024 / 1024);
 *     const totalMB = Math.round(quota.total / 1024 / 1024);
 *     return `${usedMB}MB of ${totalMB}MB used (${quota.percentage}%)`;
 *   }
 * }
 * ```
 *
 * **Storage Management Features:**
 * - **Usage Tracking**: Real-time storage consumption monitoring
 * - **Threshold Alerts**: Proactive warnings before storage full
 * - **Cleanup Suggestions**: Automatic identification of cleanup opportunities
 * - **Quota Visualization**: User-friendly storage usage display
 *
 * @since 1.0.0
 */
export interface StorageQuota {
  /**
   * Used Storage Space
   *
   * Amount of storage currently used by the application in bytes.
   * Includes project data, cached patterns, and application state.
   */
  readonly used: number;

  /**
   * Available Storage Space
   *
   * Amount of storage available for new data in bytes.
   * Calculated as total minus used storage.
   */
  readonly available: number;

  /**
   * Total Storage Capacity
   *
   * Total storage capacity allocated to the application in bytes.
   * May vary based on browser, device, and user settings.
   */
  readonly total: number;

  /**
   * Storage Usage Percentage
   *
   * Percentage of total storage currently used (0-100).
   * Pre-calculated for efficient UI updates and threshold checking.
   */
  readonly percentage: number;
}

/**
 * Performance Metrics - Application Health Monitoring
 *
 * Tracks key performance indicators for application health monitoring,
 * optimization identification, and user experience quality assurance.
 *
 * @example
 * ```typescript
 * // Performance monitoring and alerting
 * class PerformanceMonitor {
 *   updateMetrics(renderTime: number, memoryUsage: number): PerformanceMetrics {
 *     return {
 *       renderTime: Math.round(renderTime * 100) / 100, // Round to 2 decimals
 *       memoryUsage: Math.round(memoryUsage / 1024 / 1024), // Convert to MB
 *       errorCount: this.currentMetrics.errorCount,
 *       lastUpdate: new Date()
 *     };
 *   }
 *
 *   checkPerformanceHealth(metrics: PerformanceMetrics): HealthStatus {
 *     if (metrics.renderTime > 100 || metrics.memoryUsage > 100) {
 *       return { level: 'warning', issues: ['High render time', 'Memory usage elevated'] };
 *     }
 *     return { level: 'healthy', issues: [] };
 *   }
 * }
 * ```
 *
 * **Performance Targets:**
 * - **Render Time**: < 16ms for 60fps performance
 * - **Memory Usage**: < 50MB for efficient operation
 * - **Error Count**: Minimize and track error frequency
 * - **Update Frequency**: Metrics updated every 5 seconds
 *
 * @since 1.0.0
 */
export interface PerformanceMetrics {
  /**
   * Component Render Time
   *
   * Average time in milliseconds for component render cycles.
   * Critical for maintaining 60fps performance and responsive UI.
   *
   * **Performance Thresholds:**
   * - **Excellent**: < 8ms
   * - **Good**: 8-16ms
   * - **Warning**: 16-50ms
   * - **Critical**: > 50ms
   */
  readonly renderTime: number;

  /**
   * Memory Usage
   *
   * Current memory consumption in megabytes.
   * Monitors for memory leaks and optimization opportunities.
   *
   * **Memory Thresholds:**
   * - **Optimal**: < 25MB
   * - **Good**: 25-50MB
   * - **Warning**: 50-100MB
   * - **Critical**: > 100MB
   */
  readonly memoryUsage: number;

  /**
   * Error Count
   *
   * Total number of errors recorded since last reset.
   * Tracks application stability and user experience quality.
   */
  readonly errorCount: number;

  /**
   * Last Update Timestamp
   *
   * When these metrics were last updated for freshness validation
   * and monitoring system health.
   */
  readonly lastUpdate: Date;
}

/**
 * Feature Flags - Progressive Enhancement Configuration
 *
 * Controls experimental features, performance optimizations, and conditional
 * functionality delivery based on user segments, device capabilities, or A/B testing.
 *
 * @example
 * ```typescript
 * // Feature flag management
 * class FeatureService {
 *   isFeatureEnabled(feature: keyof FeatureFlags): boolean {
 *     const flags = this.store.selectSnapshot(state => state.system.featureFlags);
 *     return flags[feature] ?? false;
 *   }
 *
 *   enableFeatureForUser(feature: keyof FeatureFlags, userId: string): void {
 *     if (this.isUserEligible(userId, feature)) {
 *       this.store.dispatch(SystemActions.enableFeature({ feature }));
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Conditional feature rendering
 * @Component({
 *   template: `
 *     <app-virtual-list
 *       *ngIf="virtualScrollingEnabled$ | async; else regularList"
 *       [items]="items">
 *     </app-virtual-list>
 *     <ng-template #regularList>
 *       <app-regular-list [items]="items"></app-regular-list>
 *     </ng-template>
 *   `
 * })
 * class PatternListComponent {
 *   virtualScrollingEnabled$ = this.store.select(
 *     state => state.system.featureFlags.virtualScrolling
 *   );
 * }
 * ```
 *
 * **Feature Categories:**
 * - **Performance**: Optimizations that may affect compatibility
 * - **Experimental**: New features in testing phase
 * - **Premium**: Advanced features for specific user tiers
 * - **Beta**: Features available to beta users
 *
 * @since 1.0.0
 */
export interface FeatureFlags {
  /**
   * Virtual Scrolling Performance Optimization
   *
   * Enables virtual scrolling for large pattern lists to improve performance
   * and memory usage. Requires modern browser support for optimal experience.
   *
   * **Benefits:**
   * - Handles thousands of patterns efficiently
   * - Reduces memory usage for large datasets
   * - Maintains smooth scrolling performance
   *
   * **Requirements:**
   * - Modern browser with Intersection Observer support
   * - Minimum screen height for effective virtualization
   */
  readonly virtualScrolling: boolean;

  /**
   * Advanced Pattern Features
   *
   * Unlocks sophisticated pattern analysis, complex navigation features,
   * and power-user functionality for experienced pattern trackers.
   *
   * **Features Included:**
   * - Multi-pattern comparison tools
   * - Advanced FLAM analysis
   * - Pattern complexity metrics
   * - Batch editing operations
   */
  readonly advancedPatterns: boolean;

  /**
   * Export and Sharing Features
   *
   * Enables pattern export functionality, sharing capabilities, and
   * integration with external pattern tools and services.
   *
   * **Export Formats:**
   * - PDF pattern printouts
   * - JSON pattern data
   * - Image pattern snapshots
   * - Pattern sharing links
   */
  readonly exportFeatures: boolean;

  /**
   * Beta Feature Access
   *
   * Provides access to beta features and experimental functionality
   * for testing and early feedback from opted-in users.
   *
   * **Beta Features:**
   * - New UI components
   * - Experimental navigation modes
   * - Performance optimizations
   * - Integration previews
   */
  readonly betaFeatures: boolean;
}

/**
 * Initial State Factory - Application State Initialization
 *
 * Creates the default application state with safe, consistent initial values
 * for all state domains. Provides a clean starting point for application
 * bootstrap and state reset operations.
 *
 * @example
 * ```typescript
 * // Application initialization
 * import { createInitialState } from './app-state.interface';
 * import { Store } from '@ngrx/store';
 *
 * class AppInitializer {
 *   initializeApplication(): void {
 *     const initialState = createInitialState();
 *     const store = new Store(initialState);
 *
 *     // Load persisted settings
 *     this.settingsService.loadSettings().then(settings => {
 *       store.dispatch(SettingsActions.loadSettings({ settings }));
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // State reset functionality
 * class StateManager {
 *   resetApplicationState(): void {
 *     const freshState = createInitialState();
 *     this.store.dispatch(AppActions.resetState({ state: freshState }));
 *   }
 *
 *   resetDomain<K extends keyof AppState>(domain: K): void {
 *     const initialState = createInitialState();
 *     this.store.dispatch(AppActions.resetDomain({
 *       domain,
 *       state: initialState[domain]
 *     }));
 *   }
 * }
 * ```
 *
 * **Initialization Strategy:**
 * - **Safe Defaults**: All values are safe, non-null defaults
 * - **Empty Collections**: Arrays and maps start empty for clean slate
 * - **System Detection**: Online status and capabilities detected automatically
 * - **Feature Flags**: Conservative defaults with progressive enhancement
 * - **Performance**: Metrics initialized with baseline values
 *
 * **State Domains Initialized:**
 * - **Projects**: Empty project collection with no selection
 * - **UI**: Default interface state with standard zoom and preferences
 * - **System**: Live system status with default performance metrics
 * - **Settings**: Conservative settings optimized for compatibility
 * - **Notifications**: Empty notification queue ready for messages
 * - **Mark Mode**: Initial mark mode state for pattern tracking
 *
 * @returns Complete initial application state tree
 * @since 1.0.0
 */
export const createInitialState = (): AppState => ({
  projects: {
    entities: {},
    currentProjectId: null,
    loading: false,
    error: null,
    lastSaved: null,
    isDirty: false,
  },
  ui: {
    currentPosition: null,
    selectedStepId: null,
    zoomLevel: 1.0,
    sidebarOpen: true,
    beadCountVisible: false,
    darkMode: false,
    notifications: [],
  },
  system: {
    isOnline: navigator.onLine,
    storageQuota: null,
    performanceMetrics: {
      renderTime: 0,
      memoryUsage: 0,
      errorCount: 0,
      lastUpdate: new Date(),
    },
    featureFlags: {
      virtualScrolling: true,
      advancedPatterns: false,
      exportFeatures: true,
      betaFeatures: false,
    },
  },
  settings: {
    combine12: false,
    lrdesignators: false,
    flammarkers: false,
    ppinspector: false,
    zoom: false,
    scrolloffset: -1,
    multiadvance: 3,
    flamsort: 'keyAsc',
    projectsort: 'dateAsc',
    ready: false,
  },
  notifications: {
    current: null,
    queue: [],
    lastId: 0,
  },
  markMode: {
    currentMode: 0,
    previousMode: undefined,
    history: [],
    lastUpdated: Date.now(),
    changeCount: 0,
  },
});

/**
 * Settings Selectors - Memoized State Access Patterns
 *
 * Provides optimized, memoized selectors for settings state access replacing
 * direct BehaviorSubject patterns with performance-optimized selector functions.
 * Enables efficient reactive component updates and computed state derivations.
 *
 * @example
 * ```typescript
 * // Component usage with reactive selectors
 * import { selectCombine12, selectZoom, selectAllSettings } from './selectors';
 *
 * @Component({
 *   template: `
 *     <app-pattern-view
 *       [combine12]="combine12$ | async"
 *       [zoomEnabled]="zoomEnabled$ | async"
 *       [settings]="allSettings$ | async">
 *     </app-pattern-view>
 *   `
 * })
 * class PatternComponent {
 *   combine12$ = this.store.select(selectCombine12);
 *   zoomEnabled$ = this.store.select(selectZoom);
 *   allSettings$ = this.store.select(selectAllSettings);
 *
 *   constructor(private store: ReactiveStateStore<AppState>) {}
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Service usage with selector composition
 * class PatternDisplayService {
 *   getDisplaySettings() {
 *     return this.store.select(state => ({
 *       combine12: selectCombine12(state),
 *       flamMarkers: selectFlamMarkers(state),
 *       zoom: selectZoom(state)
 *     }));
 *   }
 *
 *   applyDisplaySettings(settings: DisplaySettings): void {
 *     // Apply settings to pattern display
 *   }
 * }
 * ```
 *
 * **Selector Architecture:**
 * - **Atomic Selectors**: Individual setting access for granular updates
 * - **Computed Selectors**: Derived state combinations for complex logic
 * - **Memoization**: Automatic caching prevents unnecessary recalculations
 * - **Type Safety**: Full TypeScript support with return type inference
 *
 * **Performance Benefits:**
 * - **Reference Equality**: Unchanged state returns same reference
 * - **Selective Updates**: Components only re-render when used settings change
 * - **Computation Caching**: Complex derivations cached until dependencies change
 * - **Memory Efficiency**: Garbage collection friendly with weak references
 *
 * **Migration from BehaviorSubjects:**
 * - Replace `settingsService.combine12$` with `store.select(selectCombine12)`
 * - Replace direct state access with memoized selector functions
 * - Maintain reactive patterns while gaining performance optimizations
 *
 * @since 1.0.0
 */

import { AppState, SettingsState } from '../app-state.interface';
import { COLOR_MODEL_PREFIXES } from '../../../shared/models/color-model.enum';

/**
 * Memoized Selector Factory
 *
 * Simple memoization utility for creating performant selectors that cache
 * their results and only recompute when dependencies change.
 */
const createSelector = <T, R>(
  dependency: (state: AppState) => T,
  transform: (dep: T) => R
) => {
  let lastDependency: T;
  let lastResult: R;
  let hasComputed = false;

  return (state: AppState): R => {
    const currentDependency = dependency(state);
    
    if (!hasComputed || currentDependency !== lastDependency) {
      lastDependency = currentDependency;
      lastResult = transform(currentDependency);
      hasComputed = true;
    }
    
    return lastResult;
  };
};

/**
 * Base Settings State Selector
 *
 * Root selector for accessing the complete settings state slice.
 * Foundation for all other settings selectors and computed state derivations.
 *
 * @param state - Complete application state tree
 * @returns Complete settings state object
 * @example
 * ```typescript
 * const settings = store.selectSnapshot(selectSettingsState);
 * console.log('All settings:', settings);
 * ```
 */
export const selectSettingsState = (state: AppState): SettingsState => state.settings;

/**
 * Individual Setting Selectors - Atomic State Access
 *
 * Granular selectors for individual settings providing efficient component updates
 * and precise change detection. These replace BehaviorSubject patterns with
 * memoized selector functions for optimal performance.
 */

/**
 * Combine Twelve Pattern Setting Selector
 *
 * Selects whether twelve-step patterns should be combined into single display units.
 * Affects pattern layout and navigation behavior.
 *
 * @param state - Application state tree
 * @returns Boolean indicating if combine12 is enabled
 */
export const selectCombine12 = (state: AppState): boolean => state.settings.combine12;

/**
 * Left/Right Designator Display Selector
 *
 * Selects visibility setting for directional pattern indicators.
 * Controls display of left/right orientation markers in patterns.
 *
 * @param state - Application state tree
 * @returns Boolean indicating if LR designators are shown
 */
export const selectLRDesignators = (state: AppState): boolean => state.settings.lrdesignators;

/**
 * FLAM Marker Visibility Selector
 *
 * Selects display setting for FLAM (First Last And Middle) pattern markers.
 * Controls visibility of section navigation aids in complex patterns.
 *
 * @param state - Application state tree
 * @returns Boolean indicating if FLAM markers are visible
 */
export const selectFlamMarkers = (state: AppState): boolean => state.settings.flammarkers;

/**
 * Pattern Progress Inspector Selector
 *
 * Selects enablement of advanced pattern analysis and progress tracking tools.
 * Controls availability of detailed pattern statistics and inspection features.
 *
 * @param state - Application state tree
 * @returns Boolean indicating if pattern inspector is enabled
 */
export const selectPPInspector = (state: AppState): boolean => state.settings.ppinspector;

/**
 * Zoom Feature Availability Selector
 *
 * Selects whether zoom functionality is available for pattern viewing.
 * Controls interface zoom controls and accessibility features.
 *
 * @param state - Application state tree
 * @returns Boolean indicating if zoom is enabled
 */
export const selectZoom = (state: AppState): boolean => state.settings.zoom;

/**
 * Scroll Offset Configuration Selector
 *
 * Selects pixel offset for scroll positioning during pattern navigation.
 * Controls automatic scroll behavior and element positioning.
 *
 * @param state - Application state tree
 * @returns Number representing scroll offset in pixels (-1 for auto)
 */
export const selectScrollOffset = (state: AppState): number => state.settings.scrolloffset;

/**
 * Multi-Advance Step Count Selector
 *
 * Selects number of steps to advance during multi-step navigation commands.
 * Supports power user workflows and rapid pattern traversal.
 *
 * @param state - Application state tree
 * @returns Number of steps for multi-advance operations
 */
export const selectMultiAdvance = (state: AppState): number => state.settings.multiadvance;

/**
 * FLAM Sort Order Selector
 *
 * Selects sorting preference for FLAM marker lists and displays.
 * Controls organization of complex pattern navigation elements.
 *
 * @param state - Application state tree
 * @returns String representing sort order (e.g., 'keyAsc', 'positionDesc')
 */
export const selectFlamSort = (state: AppState): string => state.settings.flamsort;

/**
 * Project Sort Order Selector
 *
 * Selects default sorting preference for project lists throughout the application.
 * Affects project selection interfaces and navigation menus.
 *
 * @param state - Application state tree
 * @returns String representing sort order (e.g., 'dateAsc', 'nameDesc')
 */
export const selectProjectSort = (state: AppState): string => state.settings.projectsort;

/**
 * Settings Ready State Selector
 *
 * Selects whether settings have been fully loaded and validated.
 * Used for initialization checks and loading state management.
 *
 * @param state - Application state tree
 * @returns Boolean indicating if settings are ready for use
 */
export const selectSettingsReady = (state: AppState): boolean => state.settings.ready;

/**
 * Color Model Auto-Prefix Setting Selector
 *
 * Selects the current color model setting for automatic prefix application.
 * Controls whether empty color inputs receive automatic prefixes on focus.
 *
 * @param state - Application state tree
 * @returns Color model setting ('MIYUKI_DELICA' | 'NONE')
 * @example
 * ```typescript
 * // Component subscription
 * this.colorModel$ = this.store.select(selectColorModel);
 * 
 * // Usage in component
 * this.colorModel$.subscribe(model => {
 *   this.autoPrefix = model !== 'NONE';
 * });
 * ```
 */
export const selectColorModel = (state: AppState): 'MIYUKI_DELICA' | 'NONE' => 
  state.settings.colorModel;

/**
 * Delica Color Model Check Selector
 *
 * Efficiently determines if the current color model is set to Miyuki Delica.
 * Useful for conditional logic in components and services.
 * Memoized for performance optimization.
 *
 * @param state - Application state tree
 * @returns Boolean indicating if Delica model is active
 * @example
 * ```typescript
 * // Conditional UI rendering
 * isDelicaModel$ = this.store.select(selectIsDelicaColorModel);
 * ```
 */
export const selectIsDelicaColorModel = createSelector(
  selectColorModel,
  (colorModel: 'MIYUKI_DELICA' | 'NONE'): boolean => colorModel === 'MIYUKI_DELICA'
);

/**
 * Color Model Prefix Selector
 *
 * Computes the appropriate color prefix string based on the selected color model.
 * Uses centralized mapping for maintainability and consistency.
 * Memoized for performance optimization.
 *
 * @param state - Application state tree
 * @returns String prefix for the current color model
 * @example
 * ```typescript
 * // Component usage for input prefixing
 * class ColorComponent {
 *   onInputFocus() {
 *     const prefix = this.store.selectSnapshot(selectColorModelPrefix);
 *     if (prefix && this.input.value === '') {
 *       this.input.value = prefix;
 *     }
 *   }
 * }
 * ```
 */
export const selectColorModelPrefix = createSelector(
  selectColorModel,
  (colorModel: 'MIYUKI_DELICA' | 'NONE'): string => COLOR_MODEL_PREFIXES[colorModel]
);

/**
 * Computed Selectors - Derived State Combinations
 *
 * Complex selectors that combine multiple settings into computed objects
 * for efficient component consumption and reduced subscription overhead.
 */

/**
 * All Settings Composite Selector
 *
 * Combines all user-configurable settings into a single object for components
 * that need comprehensive settings access. Excludes internal state like 'ready'.
 *
 * @param state - Application state tree
 * @returns Object containing all user settings
 * @example
 * ```typescript
 * // Component receiving all settings
 * @Component({
 *   template: `<app-settings-panel [settings]="settings$ | async"></app-settings-panel>`
 * })
 * class SettingsComponent {
 *   settings$ = this.store.select(selectAllSettings);
 * }
 * ```
 */
/**
 * All Settings Composite Selector
 *
 * Combines all user-configurable settings into a single object for components
 * that need comprehensive settings access. Includes all persistable settings.
 *
 * @param state - Application state tree
 * @returns Object containing all user settings including colorModel
 * @example
 * ```typescript
 * // Component receiving all settings
 * @Component({
 *   template: `<app-settings-panel [settings]="settings$ | async"></app-settings-panel>`
 * })
 * class SettingsComponent {
 *   settings$ = this.store.select(selectAllSettings);
 * }
 * ```
 */
export const selectAllSettings = (state: AppState) => ({
  combine12: state.settings.combine12,
  lrdesignators: state.settings.lrdesignators,
  flammarkers: state.settings.flammarkers,
  ppinspector: state.settings.ppinspector,
  zoom: state.settings.zoom,
  scrolloffset: state.settings.scrolloffset,
  multiadvance: state.settings.multiadvance,
  flamsort: state.settings.flamsort,
  projectsort: state.settings.projectsort,
  colorModel: state.settings.colorModel,
});

/**
 * Settings Persistence Selector
 *
 * Alias for selectAllSettings - all settings are persistable.
 * Maintains API compatibility for automatic persistence functionality.
 *
 * @param state - Application state tree
 * @returns Complete settings object for persistence (same as selectAllSettings)
 */
export const selectSettingsForPersistence = selectAllSettings;

/**
 * Settings Count Selector
 *
 * Counts the number of user-configurable settings excluding internal state.
 * Useful for settings validation and completeness checking.
 *
 * @param state - Application state tree
 * @returns Number of configurable settings
 */
export const selectSettingsCount = (state: AppState): number => {
  const settings = state.settings;
  return Object.keys(settings).filter(key => key !== 'ready').length;
};

/**
 * Settings Validation Selectors
 *
 * Validates settings state integrity and type safety for error detection
 * and application health monitoring.
 */

/**
 * Settings Validity Selector
 *
 * Validates that all settings have correct types and values within acceptable ranges.
 * Used for application health checks and data integrity validation.
 *
 * @param state - Application state tree
 * @returns Boolean indicating if all settings are valid
 * @example
 * ```typescript
 * // Health check service
 * class HealthService {
 *   checkSettingsHealth(): Observable<boolean> {
 *     return this.store.select(selectHasValidSettings).pipe(
 *       tap(isValid => {
 *         if (!isValid) {
 *           this.logger.warn('Invalid settings detected');
 *           this.resetToDefaults();
 *         }
 *       })
 *     );
 *   }
 * }
 * ```
 */
export const selectHasValidSettings = (state: AppState): boolean => {
  const settings = state.settings;
  return (
    typeof settings.combine12 === 'boolean' &&
    typeof settings.lrdesignators === 'boolean' &&
    typeof settings.flammarkers === 'boolean' &&
    typeof settings.ppinspector === 'boolean' &&
    typeof settings.zoom === 'boolean' &&
    typeof settings.scrolloffset === 'number' &&
    typeof settings.multiadvance === 'number' &&
    typeof settings.flamsort === 'string' &&
    typeof settings.projectsort === 'string' &&
    typeof settings.colorModel === 'string' &&
    settings.scrolloffset >= -1 &&
    settings.multiadvance >= 1 &&
    ['keyAsc', 'keyDesc', 'nameAsc', 'nameDesc', 'dateAsc', 'dateDesc'].includes(settings.flamsort) &&
    ['keyAsc', 'keyDesc', 'nameAsc', 'nameDesc', 'dateAsc', 'dateDesc'].includes(settings.projectsort) &&
    ['MIYUKI_DELICA', 'NONE'].includes(settings.colorModel)
  );
};

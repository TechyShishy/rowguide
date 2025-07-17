import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NGXLogger } from 'ngx-logger';

import { ErrorHandlerService } from './error-handler.service';
import { ReactiveStateStore } from '../store/reactive-state-store';
import { SettingsActions } from '../store/actions/settings-actions';
import {
  selectCombine12,
  selectLRDesignators,
  selectFlamMarkers,
  selectPPInspector,
  selectZoom,
  selectScrollOffset,
  selectMultiAdvance,
  selectFlamSort,
  selectProjectSort,
  selectSettingsReady,
} from '../store/selectors/settings-selectors';

/**
 * Service for managing application settings with persistent storage and reactive state.
 * Handles configuration loading, saving, validation, and provides observables for
 * real-time settings updates throughout the application.
 *
 * Features:
 * - Persistent localStorage settings storage
 * - Reactive settings streams for UI components
 * - Default value fallbacks for missing settings
 * - Error handling for storage failures
 * - Settings validation and sanitization
 * - Integration with global state management
 *
 * Settings Categories:
 * - Display: combine12, lrdesignators, flammarkers, zoom
 * - Analysis: ppinspector, flamsort, projectsort
 * - Navigation: scrolloffset, multiadvance
 *
 * @example
 * ```typescript
 * // Basic service usage
 * constructor(private settingsService: SettingsService) {}
 *
 * // Wait for settings to load
 * this.settingsService.ready$.subscribe(ready => {
 *   if (ready) {
 *     this.initializeUI();
 *   }
 * });
 *
 * // React to specific setting changes
 * this.settingsService.zoom$.subscribe(zoomEnabled => {
 *   this.toggleZoomFeature(zoomEnabled);
 * });
 *
 * // Save settings
 * const newSettings = new Settings();
 * newSettings.zoom = true;
 * newSettings.combine12 = false;
 * this.settingsService.saveSettings(newSettings);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  /**
   * Observable indicating whether settings have been loaded and are ready for use.
   * Subscribe to this before accessing other settings to ensure proper initialization.
   */
  ready$: Observable<boolean> = this.store.select(selectSettingsReady);

  /**
   * Observable for the combine12 setting - whether to combine rows 1 and 2 in display.
   * Used for pattern layout optimization and improved readability.
   */
  public combine12$ = this.store.select(selectCombine12);

  /**
   * Observable for left/right designators display setting.
   * Controls whether directional indicators are shown for pattern navigation.
   */
  public lrdesignators$ = this.store.select(selectLRDesignators);

  /**
   * Observable for FLAM (First/Last Appearance Map) markers display setting.
   * Controls visibility of first and last appearance indicators for pattern elements.
   */
  public flammarkers$ = this.store.select(selectFlamMarkers);

  /**
   * Observable for pattern preview inspector setting.
   * Enables/disables the detailed pattern analysis inspector panel.
   */
  public ppinspector$ = this.store.select(selectPPInspector);

  /**
   * Observable for zoom functionality setting.
   * Controls whether zoom features are enabled for detailed pattern viewing.
   */
  public zoom$ = this.store.select(selectZoom);

  /**
   * Observable for scroll offset setting (-1 for auto, positive numbers for fixed offset).
   * Controls automatic scrolling behavior during pattern navigation.
   */
  public scrolloffset$ = this.store.select(selectScrollOffset);

  /**
   * Observable for multi-advance setting (default: 3).
   * Controls how many steps to advance during bulk navigation operations.
   */
  public multiadvance$ = this.store.select(selectMultiAdvance);

  /**
   * Observable for FLAM sorting preference ('keyAsc', 'keyDesc', 'countAsc', 'countDesc').
   * Determines default sort order for First/Last Appearance Map displays.
   */
  public flamsort$ = this.store.select(selectFlamSort);

  /**
   * Observable for project sorting preference ('dateAsc', 'dateDesc', 'nameAsc', 'nameDesc').
   * Determines default sort order for project listings.
   */
  public projectsort$ = this.store.select(selectProjectSort);

  /**
   * Legacy property for backward compatibility - now uses store observable.
   * @deprecated Use ready$ observable directly for reactive patterns
   */
  get ready(): Observable<boolean> {
    return this.ready$;
  }

  /**
   * Creates an instance of SettingsService and initiates settings loading.
   *
   * @param logger - NGX logger for debugging and error tracking
   * @param errorHandler - Service for handling and reporting errors
   * @param store - Reactive state store for settings management
   */
  constructor(
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService,
    private store: ReactiveStateStore
  ) {
    this.loadSettings();
  }
  /**
   * Persists settings to localStorage and updates the global state.
   * Handles serialization, storage errors, and state synchronization.
   * Provides error handling with user feedback for storage failures.
   *
   * @param settings - Complete settings object to save
   *
   * @example
   * ```typescript
   * // Save updated settings
   * const settings = new Settings();
   * settings.zoom = true;
   * settings.combine12 = false;
   * settings.scrolloffset = 5;
   * this.settingsService.saveSettings(settings);
   *
   * // Save with form data
   * onFormSubmit(formValue: any) {
   *   const settings = new Settings();
   *   Object.assign(settings, formValue);
   *   this.settingsService.saveSettings(settings);
   * }
   * ```
   */
  saveSettings(settings: Settings) {
    try {
      localStorage.setItem('settings', JSON.stringify(settings));
      // Use the settings object directly instead of manual mapping
      this.store.dispatch(SettingsActions.setSettings(settings));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveSettings',
          details: 'Failed to save settings to localStorage',
          settingsKeys: Object.keys(settings),
          settingsCount: Object.keys(settings).length,
          storageType: 'localStorage',
          settings: settings, // Restore: useful for debugging, minimal risk in local app
        },
        'Unable to save your settings. They may not persist after refreshing.',
        'medium'
      );
      this.store.dispatch(SettingsActions.setSettingsReady(true)); // Still emit ready even if save failed
    }
  }

  /**
   * Loads settings from localStorage with defaults and validation.
   * Automatically called during service initialization. Handles missing storage,
   * invalid JSON, and provides fallback to default values with error reporting.
   *
   * Storage Recovery:
   * - Missing settings: Uses default values and marks ready
   * - Invalid JSON: Reports error, uses defaults
   * - Partial settings: Merges with defaults for missing properties
   *
   * @example
   * ```typescript
   * // Manual reload (rarely needed - automatic on init)
   * onResetToDefaults() {
   *   localStorage.removeItem('settings');
   *   this.settingsService.loadSettings();
   * }
   *
   * // Force reload after external changes
   * onStorageChange() {
   *   this.settingsService.loadSettings();
   * }
   * ```
   */
  loadSettings() {
    try {
      let settings = localStorage.getItem('settings');
      if (settings) {
        let s = JSON.parse(settings);

        // Handle null or invalid parsed objects
        if (s && typeof s === 'object') {
          // Create settings object with proper defaults
          const settingsData = {
            combine12: s.combine12 ?? false,
            lrdesignators: s.lrdesignators ?? false,
            flammarkers: s.flammarkers ?? false,
            ppinspector: s.ppinspector ?? false,
            zoom: s.zoom ?? false,
            scrolloffset: s.scrolloffset ?? -1,
            multiadvance: s.multiadvance ?? 3,
            flamsort: s.flamsort ?? 'keyAsc',
            projectsort: s.projectsort ?? 'dateAsc',
          };
          this.store.dispatch(
            SettingsActions.loadSettingsSuccess(settingsData)
          );
        }
      } else {
        // No settings found, set ready to true with defaults
        this.store.dispatch(SettingsActions.setSettingsReady(true));
      }
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadSettings',
          details: 'Failed to load settings from localStorage',
          storageType: 'localStorage',
          storageKey: 'settings',
        },
        'Unable to load your saved settings. Default settings will be used.',
        'medium'
      );
      this.store.dispatch(
        SettingsActions.loadSettingsFailure(
          error instanceof Error
            ? error.message
            : 'Unknown error loading settings'
        )
      );
      // Service will maintain default values when errors occur
    }
  }
}

/**
 * Settings data model class defining all configurable application preferences.
 * Provides default values and type safety for application configuration.
 *
 * Property Categories:
 * - Display Settings: Visual layout and presentation options
 * - Analysis Settings: Pattern analysis and sorting preferences
 * - Navigation Settings: Movement and scrolling behavior
 *
 * All properties have sensible defaults suitable for typical usage patterns.
 *
 * @example
 * ```typescript
 * // Create with defaults
 * const settings = new Settings();
 *
 * // Customize specific values
 * settings.zoom = true;
 * settings.scrolloffset = 10;
 * settings.flamsort = 'countDesc';
 *
 * // Use with forms
 * const formGroup = this.fb.group({
 *   combine12: [settings.combine12],
 *   zoom: [settings.zoom],
 *   multiadvance: [settings.multiadvance, [Validators.min(1), Validators.max(10)]]
 * });
 * ```
 */
export class Settings {
  /**
   * Whether to combine the first two rows in pattern display.
   * Useful for patterns where rows 1-2 form a logical unit.
   * Default: false (show rows separately)
   */
  combine12: boolean = false;

  /**
   * Whether to show left/right directional designators.
   * Helps with pattern orientation and navigation cues.
   * Default: false (no directional indicators)
   */
  lrdesignators: boolean = false;

  /**
   * Whether to display FLAM (First/Last Appearance Map) markers.
   * Shows visual indicators for first and last appearances of pattern elements.
   * Default: false (no FLAM markers)
   */
  flammarkers: boolean = false;

  /**
   * Whether to enable the pattern preview inspector.
   * Provides detailed analysis and preview capabilities.
   * Default: false (inspector disabled)
   */
  ppinspector: boolean = false;

  /**
   * Whether zoom functionality is enabled.
   * Allows detailed viewing of pattern elements and steps.
   * Default: false (zoom disabled)
   */
  zoom: boolean = false;

  /**
   * Scroll offset for automatic navigation (-1 for auto, 0+ for fixed pixels).
   * Controls how much to scroll when navigating between pattern elements.
   * - -1: Automatic offset calculation based on viewport
   * - 0: No scrolling offset
   * - Positive: Fixed pixel offset from top
   * Default: -1 (automatic calculation)
   */
  scrolloffset: number = -1;

  /**
   * Number of steps to advance during multi-step navigation.
   * Used for bulk advancement through pattern steps.
   * Valid range: 1-10 steps (enforced by UI validation)
   * Default: 3 steps
   */
  multiadvance: number = 3;

  /**
   * Sort order for FLAM (First/Last Appearance Map) displays.
   * Determines default ordering in pattern analysis views.
   *
   * Valid values:
   * - 'keyAsc': Sort by pattern key (A-Z)
   * - 'keyDesc': Sort by pattern key (Z-A)
   * - 'countAsc': Sort by occurrence count (low to high)
   * - 'countDesc': Sort by occurrence count (high to low)
   *
   * Default: 'keyAsc' (alphabetical by pattern key)
   */
  flamsort: string = 'keyAsc';

  /**
   * Sort order for project listings and selection.
   * Controls default project display order in UI.
   *
   * Valid values:
   * - 'dateAsc': Sort by creation date (oldest first)
   * - 'dateDesc': Sort by creation date (newest first)
   * - 'nameAsc': Sort by name (A-Z)
   * - 'nameDesc': Sort by name (Z-A)
   *
   * Default: 'dateAsc' (oldest projects first)
   */
  projectsort: string = 'dateAsc';
}

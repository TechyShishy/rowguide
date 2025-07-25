import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { NGXLogger } from 'ngx-logger';
import { firstValueFrom } from 'rxjs';

import {
  FlamService,
  Settings,
  SettingsService,
} from '../../../../core/services';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { SettingsActions } from '../../../../core/store/actions/settings-actions';
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
  selectColorModel
} from '../../../../core/store/selectors/settings-selectors';
import { ProjectService } from '../../../project-management/services';
import { ErrorBoundaryComponent } from '../../../../shared/components/error-boundary/error-boundary.component';
import { ColorModel } from '../../../../shared/models/color-model.enum';

/**
 * Settings component for comprehensive application configuration management
 *
 * This component provides a reactive forms-based interface for managing application
 * settings with real-time persistence and state synchronization. It integrates with
 * the ReactiveStateStore and SettingsService to provide immediate setting updates
 * across the application while maintaining localStorage persistence.
 *
 * @example
 * ```typescript
 * // Basic usage in template
 * <app-settings></app-settings>
 *
 * // Component automatically:
 * // 1. Loads current settings from store
 * // 2. Provides reactive form controls
 * // 3. Persists changes to localStorage
 * // 4. Updates global application state
 *
 * // Settings are immediately available throughout the app:
 * constructor(private store: ReactiveStateStore) {
 *   this.store.select(selectZoom).subscribe(zoomEnabled => {
 *     console.log('Zoom setting changed:', zoomEnabled);
 *   });
 * }
 * ```
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-settings',
  imports: [
    FormsModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatCardModule,
    MatSliderModule,
    MatSelectModule,
    MatFormFieldModule,
    CommonModule,
    ErrorBoundaryComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  /**
   * Make ColorModel enum available to template
   */
  readonly ColorModel = ColorModel;

  /**
   * Controls whether rows 1 and 2 are combined in pattern display.
   * Used with Material slide toggle for visual pattern optimization.
   */
  combine12Control = new FormControl(false);

  /**
   * Controls whether Left/Right designators are shown in pattern display.
   * Helps with directional pattern navigation and clarity.
   */
  lrdesignatorsControl = new FormControl(false);

  /**
   * Controls whether FLAM (First/Last Appearance Map) markers are displayed.
   * Essential for color-coding and pattern analysis visualization.
   */
  flammarkersControl = new FormControl(false);

  /**
   * Controls whether the Pretty Print Inspector tab is enabled.
   * Provides enhanced formatting for pattern data inspection.
   */
  ppinspectorControl = new FormControl(false);

  /**
   * Controls whether the current step is zoomed/highlighted.
   * Improves focus and visibility during pattern tracking.
   */
  zoomControl = new FormControl(false);

  /**
   * Controls scroll offset for pattern navigation.
   * Range: -4 to 1, affects positioning during automatic scrolling.
   */
  scrolloffsetControl = new FormControl(-1);

  /**
   * Controls multi-advance step count for bulk navigation.
   * Range: 1 to 25, determines steps advanced in multi-step operations.
   */
  multiadvanceControl = new FormControl(3);

  /**
   * Controls automatic color prefix based on selected color model.
   * Enables automatic prefixing of empty color inputs (e.g., "DB" for Miyuki Delica).
   */
  colorModelControl = new FormControl(ColorModel.NONE);

  /**
   * Reactive form group containing all user-configurable settings.
   *
   * Provides centralized form state management with automatic validation
   * and change detection. All form controls are bound to their respective
   * Material Design components for consistent user interaction.
   *
   * @example
   * ```typescript
   * // Accessing form values
   * const currentSettings = this.settings.value;
   * console.log('Zoom enabled:', currentSettings.zoom);
   *
   * // Subscribing to changes
   * this.settings.valueChanges.subscribe(changes => {
   *   console.log('Settings changed:', changes);
   * });
   * ```
   */
  settings = this.formBuilder.group({
    combine12: this.combine12Control,
    lrdesignators: this.lrdesignatorsControl,
    flammarkers: this.flammarkersControl,
    ppinspector: this.ppinspectorControl,
    zoom: this.zoomControl,
    scrolloffset: this.scrolloffsetControl,
    multiadvance: this.multiadvanceControl,
    colorModel: this.colorModelControl,
  });

  /**
   * Creates an instance of SettingsComponent.
   *
   * Establishes comprehensive dependency injection for settings management,
   * including reactive forms, state management, and persistence services.
   * Immediately initializes form controls with current store values and
   * sets up reactive value change subscription for real-time persistence.
   *
   * @param formBuilder - Angular service for creating reactive form structures
   * @param settingsService - Service for settings persistence and store integration
   * @param projectService - Service for project management operations
   * @param logger - NGX Logger service for debugging and monitoring
   * @param flamService - Service for FLAM analysis and color mapping
   * @param store - Reactive state store for application state management
   *
   * @example
   * ```typescript
   * // Component automatically initializes with current settings
   * constructor(dependencies...) {
   *   // Form controls loaded from store
   *   // Value changes automatically persist
   *   // Real-time state synchronization enabled
   * }
   *
   * // Settings changes are immediately available app-wide:
   * this.store.select(selectZoom).subscribe(enabled => {
   *   // Updates immediately when user toggles zoom setting
   * });
   * ```
   *
   * @since 1.0.0
   */
  constructor(
    private formBuilder: FormBuilder,
    private settingsService: SettingsService,
    private projectService: ProjectService,
    private logger: NGXLogger,
    private flamService: FlamService,
    private store: ReactiveStateStore
  ) {
    // Initialize form controls with current store values
    this.initializeFormControls();

    /**
     * Reactive value change subscription for real-time settings persistence.
     *
     * Automatically saves form changes to localStorage and updates the global
     * application state through SettingsService. Preserves non-form settings
     * (flamsort, projectsort) by retrieving current values from store.
     *
     * @example
     * ```typescript
     * // User toggles zoom setting in UI
     * // → valueChanges emits new form state
     * // → Current non-form settings retrieved from store
     * // → Complete settings object saved via SettingsService
     * // → Store dispatches update to all subscribers
     * // → Other components immediately see the change
     * ```
     */
    this.settings.valueChanges.subscribe(async (value) => {
      // Get current flamsort and projectsort from store since they're not in the form
      const currentFlamsort = await firstValueFrom(
        this.store.select(selectFlamSort)
      );
      const currentProjectsort = await firstValueFrom(
        this.store.select(selectProjectSort)
      );

      // Only use SettingsService to save to localStorage and dispatch to store
      // The service will handle store updates, so we don't need to dispatch twice
      this.settingsService.saveSettings(<Settings>{
        combine12: value.combine12,
        lrdesignators: value.lrdesignators,
        flammarkers: value.flammarkers,
        ppinspector: value.ppinspector,
        zoom: value.zoom,
        scrolloffset: value.scrolloffset,
        multiadvance: value.multiadvance,
        flamsort: currentFlamsort, // Preserve current value
        projectsort: currentProjectsort, // Preserve current value
        colorModel: value.colorModel, // Use form value directly
      });
    });
  }

  /**
   * Initializes form controls with current values from the reactive state store.
   *
   * Retrieves current setting values using memoized selectors and populates
   * form controls to ensure UI reflects the current application state.
   * This method handles the initial synchronization between persisted
   * settings and the reactive form interface.
   *
   * @private
   *
   * @example
   * ```typescript
   * // Called automatically during component initialization
   * await this.initializeFormControls();
   *
   * // Form controls now reflect current store state:
   * console.log(this.zoomControl.value); // Current zoom setting
   * console.log(this.multiadvanceControl.value); // Current multi-advance count
   * ```
   *
   * @since 1.0.0
   */
  private async initializeFormControls() {
    // Get current values from store and initialize form controls
    const combine12 = await firstValueFrom(this.store.select(selectCombine12));
    const lrdesignators = await firstValueFrom(
      this.store.select(selectLRDesignators)
    );
    const flammarkers = await firstValueFrom(
      this.store.select(selectFlamMarkers)
    );
    const ppinspector = await firstValueFrom(
      this.store.select(selectPPInspector)
    );
    const zoom = await firstValueFrom(this.store.select(selectZoom));
    const scrolloffset = await firstValueFrom(
      this.store.select(selectScrollOffset)
    );
    const multiadvance = await firstValueFrom(
      this.store.select(selectMultiAdvance)
    );
    const colorModel = await firstValueFrom(
      this.store.select(selectColorModel)
    );

    this.combine12Control.setValue(combine12);
    this.lrdesignatorsControl.setValue(lrdesignators);
    this.flammarkersControl.setValue(flammarkers);
    this.ppinspectorControl.setValue(ppinspector);
    this.zoomControl.setValue(zoom);
    this.scrolloffsetControl.setValue(scrolloffset);
    this.multiadvanceControl.setValue(multiadvance);
    this.colorModelControl.setValue(colorModel as ColorModel);
  }

  /**
   * Handles error recovery by re-initializing form controls.
   *
   * Called by the ErrorBoundaryComponent when a retry is requested,
   * this method reloads current settings from the store to restore
   * the form to a consistent state after an error condition.
   *
   * @example
   * ```typescript
   * // Called automatically by error boundary on retry
   * onRetry(): void {
   *   // Form controls reset to current store values
   *   // Any corrupted form state is cleared
   *   // User can continue with valid settings
   * }
   *
   * // In template:
   * <app-error-boundary (retryRequested)="onRetry()">
   *   <!-- settings form -->
   * </app-error-boundary>
   * ```
   *
   * @since 1.0.0
   */
  onRetry(): void {
    // Re-initialize form controls when retrying after an error
    this.initializeFormControls();
  }

  /**
   * Handles color model selection changes and dispatches update action.
   *
   * Called by Material Select component when user changes the color model setting.
   * Immediately updates the application state to enable/disable auto-prefix functionality.
   *
   * @param value - Selected color model value
   * @example
   * ```html
   * <mat-select (selectionChange)="onColorModelChange($event.value)">
   * ```
   */
  onColorModelChange(value: ColorModel): void {
    this.store.dispatch(SettingsActions.updateColorModel(value));
  }
}

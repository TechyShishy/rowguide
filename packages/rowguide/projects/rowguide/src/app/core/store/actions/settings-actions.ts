/**
 * Settings Actions for ReactiveStateStore
 *
 * This module defines all actions related to settings state management in the Redux-style
 * state store. Settings control application behavior, UI preferences, and feature flags.
 *
 * ## Action Categories
 *
 * - **Configuration Actions**: SET_SETTINGS, UPDATE_SETTING for bulk and individual setting changes
 * - **Lifecycle Actions**: LOAD_SETTINGS_SUCCESS, LOAD_SETTINGS_FAILURE for persistence lifecycle
 * - **Reset Actions**: RESET_SETTINGS for returning to default configuration
 * - **Readiness Actions**: SET_SETTINGS_READY for application initialization tracking
 *
 * ## Settings Properties
 *
 * - `combine12`: Boolean - Whether to combine first and second rows in pattern display
 * - `lrdesignators`: Boolean - Whether to show left/right designators in pattern navigation
 * - `flammarkers`: Boolean - Whether to show First/Last Appearance Map markers
 * - `ppinspector`: Boolean - Whether to enable pattern inspector functionality
 * - `zoom`: Boolean - Whether to enable pattern zoom functionality
 * - `scrolloffset`: Number - Scroll offset for pattern navigation (pixels)
 * - `multiadvance`: Number - Number of steps to advance in multi-step navigation
 * - `flamsort`: String - Sorting method for FLAM display ('alphabetical', 'frequency', 'appearance')
 * - `projectsort`: String - Sorting method for project list ('name', 'modified', 'created')
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Update a single setting
 * const action = SettingsActions.updateSetting('zoom', true);
 * store.dispatch(action);
 *
 * // Load settings from persistence
 * const settings = await settingsService.loadSettings();
 * store.dispatch(SettingsActions.loadSettingsSuccess(settings));
 *
 * // Reset to defaults
 * store.dispatch(SettingsActions.resetSettings());
 * ```
 *
 * @module SettingsActions
 * @since 2.0.0
 */

import { StateAction } from '../reactive-state-store';

/**
 * Settings domain action types
 *
 * String constants for Redux action types following the pattern:
 * '[Domain] Action Description'
 *
 * @enum {string}
 */
export enum SettingsActionTypes {
  /** Set complete settings configuration object */
  SET_SETTINGS = '[Settings] Set Settings',
  /** Update a single setting by key-value pair */
  UPDATE_SETTING = '[Settings] Update Setting',
  /** Settings loaded successfully from persistence */
  LOAD_SETTINGS_SUCCESS = '[Settings] Load Settings Success',
  /** Settings loading failed with error */
  LOAD_SETTINGS_FAILURE = '[Settings] Load Settings Failure',
  /** Reset settings to default values */
  RESET_SETTINGS = '[Settings] Reset Settings',
  /** Set settings readiness state for application initialization */
  SET_SETTINGS_READY = '[Settings] Set Settings Ready',
}

/**
 * Settings configuration object interface
 *
 * Defines the complete settings state structure with all configuration options.
 * This interface ensures type safety for settings operations.
 *
 * @interface SettingsConfiguration
 */
export interface SettingsConfiguration {
  /** Whether to combine first and second rows in pattern display */
  readonly combine12: boolean;
  /** Whether to show left/right designators in pattern navigation */
  readonly lrdesignators: boolean;
  /** Whether to show First/Last Appearance Map markers */
  readonly flammarkers: boolean;
  /** Whether to enable pattern inspector functionality */
  readonly ppinspector: boolean;
  /** Whether to enable pattern zoom functionality */
  readonly zoom: boolean;
  /** Scroll offset for pattern navigation (pixels) */
  readonly scrolloffset: number;
  /** Number of steps to advance in multi-step navigation */
  readonly multiadvance: number;
  /** Sorting method for FLAM display ('alphabetical', 'frequency', 'appearance') */
  readonly flamsort: string;
  /** Sorting method for project list ('name', 'modified', 'created') */
  readonly projectsort: string;
}

/**
 * Settings action interfaces
 *
 * Type-safe action interfaces for all settings operations.
 * Each action extends StateAction and includes strongly-typed payload.
 */

/**
 * Action to set complete settings configuration
 *
 * Used for bulk settings updates, typically during application initialization
 * or when loading settings from persistence.
 *
 * @interface SetSettingsAction
 * @extends StateAction
 */
export interface SetSettingsAction extends StateAction {
  readonly type: SettingsActionTypes.SET_SETTINGS;
  readonly payload: {
    readonly settings: SettingsConfiguration;
  };
}

/**
 * Action to update a single setting by key-value pair
 *
 * Used for individual setting changes from UI components.
 * Supports type-safe updates with generic value type.
 *
 * @interface UpdateSettingAction
 * @extends StateAction
 */
export interface UpdateSettingAction extends StateAction {
  readonly type: SettingsActionTypes.UPDATE_SETTING;
  readonly payload: {
    /** The settings property key to update */
    readonly key: string;
    /** The new value for the setting */
    readonly value: boolean | number | string;
  };
}

/**
 * Action for successful settings loading from persistence
 *
 * Dispatched when settings are successfully loaded from localStorage
 * or other persistence mechanisms.
 *
 * @interface LoadSettingsSuccessAction
 * @extends StateAction
 */
export interface LoadSettingsSuccessAction extends StateAction {
  readonly type: SettingsActionTypes.LOAD_SETTINGS_SUCCESS;
  readonly payload: {
    readonly settings: SettingsConfiguration;
  };
}

/**
 * Action for failed settings loading
 *
 * Dispatched when settings loading fails, typically due to
 * persistence errors or data corruption.
 *
 * @interface LoadSettingsFailureAction
 * @extends StateAction
 */
export interface LoadSettingsFailureAction extends StateAction {
  readonly type: SettingsActionTypes.LOAD_SETTINGS_FAILURE;
  readonly payload: {
    /** Error message describing the failure */
    readonly error: string;
  };
}

/**
 * Action to reset settings to default values
 *
 * Used for settings reset functionality or error recovery.
 * Typically followed by persistence to save the reset state.
 *
 * @interface ResetSettingsAction
 * @extends StateAction
 */
export interface ResetSettingsAction extends StateAction {
  readonly type: SettingsActionTypes.RESET_SETTINGS;
}

/**
 * Action to set settings readiness state
 *
 * Used during application initialization to track when settings
 * are loaded and ready for use by components.
 *
 * @interface SetSettingsReadyAction
 * @extends StateAction
 */
export interface SetSettingsReadyAction extends StateAction {
  readonly type: SettingsActionTypes.SET_SETTINGS_READY;
  readonly payload: {
    /** Whether settings are ready for use */
    readonly ready: boolean;
  };
}

/**
 * Union type for all settings actions
 *
 * Type-safe union for Redux reducer and middleware processing.
 * Ensures exhaustive handling of all settings actions.
 *
 * @type {SettingsAction}
 */
export type SettingsAction =
  | SetSettingsAction
  | UpdateSettingAction
  | LoadSettingsSuccessAction
  | LoadSettingsFailureAction
  | ResetSettingsAction
  | SetSettingsReadyAction;

/**
 * Settings action creators
 *
 * Factory functions for creating type-safe settings actions.
 * These functions ensure consistent action structure and type safety.
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Set complete settings configuration
 * const settings = { combine12: true, lrdesignators: false, ... };
 * store.dispatch(SettingsActions.setSettings(settings));
 *
 * // Update individual setting
 * store.dispatch(SettingsActions.updateSetting('zoom', true));
 *
 * // Handle successful settings load
 * const loadedSettings = await settingsService.loadSettings();
 * store.dispatch(SettingsActions.loadSettingsSuccess(loadedSettings));
 *
 * // Handle settings load failure
 * try {
 *   const settings = await settingsService.loadSettings();
 * } catch (error) {
 *   store.dispatch(SettingsActions.loadSettingsFailure(error.message));
 * }
 *
 * // Reset settings to defaults
 * store.dispatch(SettingsActions.resetSettings());
 *
 * // Set settings readiness during initialization
 * store.dispatch(SettingsActions.setSettingsReady(true));
 * ```
 *
 * @namespace SettingsActions
 */
export const SettingsActions = {
  /**
   * Create action to set complete settings configuration
   *
   * @param {SettingsConfiguration} settings - Complete settings object
   * @returns {SetSettingsAction} Action to set settings
   *
   * @example
   * ```typescript
   * const settings = {
   *   combine12: true,
   *   lrdesignators: false,
   *   flammarkers: true,
   *   ppinspector: true,
   *   zoom: false,
   *   scrolloffset: 10,
   *   multiadvance: 1,
   *   flamsort: 'alphabetical',
   *   projectsort: 'name'
   * };
   * const action = SettingsActions.setSettings(settings);
   * ```
   */
  setSettings: (settings: SettingsConfiguration): SetSettingsAction => ({
    type: SettingsActionTypes.SET_SETTINGS,
    payload: { settings },
  }),

  /**
   * Create action to update a single setting
   *
   * @param {string} key - The setting key to update
   * @param {boolean | number | string} value - The new value
   * @returns {UpdateSettingAction} Action to update setting
   *
   * @example
   * ```typescript
   * // Update boolean setting
   * const action = SettingsActions.updateSetting('zoom', true);
   *
   * // Update number setting
   * const action = SettingsActions.updateSetting('scrolloffset', 15);
   *
   * // Update string setting
   * const action = SettingsActions.updateSetting('flamsort', 'frequency');
   * ```
   */
  updateSetting: (key: string, value: boolean | number | string): UpdateSettingAction => ({
    type: SettingsActionTypes.UPDATE_SETTING,
    payload: { key, value },
  }),

  /**
   * Create action for successful settings loading
   *
   * @param {SettingsConfiguration} settings - Successfully loaded settings
   * @returns {LoadSettingsSuccessAction} Action for successful load
   *
   * @example
   * ```typescript
   * async function loadSettings() {
   *   try {
   *     const settings = await settingsService.loadSettings();
   *     store.dispatch(SettingsActions.loadSettingsSuccess(settings));
   *   } catch (error) {
   *     store.dispatch(SettingsActions.loadSettingsFailure(error.message));
   *   }
   * }
   * ```
   */
  loadSettingsSuccess: (settings: SettingsConfiguration): LoadSettingsSuccessAction => ({
    type: SettingsActionTypes.LOAD_SETTINGS_SUCCESS,
    payload: { settings },
  }),

  /**
   * Create action for failed settings loading
   *
   * @param {string} error - Error message describing the failure
   * @returns {LoadSettingsFailureAction} Action for failed load
   *
   * @example
   * ```typescript
   * try {
   *   const settings = await settingsService.loadSettings();
   * } catch (error) {
   *   store.dispatch(SettingsActions.loadSettingsFailure(error.message));
   * }
   * ```
   */
  loadSettingsFailure: (error: string): LoadSettingsFailureAction => ({
    type: SettingsActionTypes.LOAD_SETTINGS_FAILURE,
    payload: { error },
  }),

  /**
   * Create action to reset settings to defaults
   *
   * @returns {ResetSettingsAction} Action to reset settings
   *
   * @example
   * ```typescript
   * // Reset settings to defaults
   * const action = SettingsActions.resetSettings();
   * store.dispatch(action);
   * ```
   */
  resetSettings: (): ResetSettingsAction => ({
    type: SettingsActionTypes.RESET_SETTINGS,
  }),

  /**
   * Create action to set settings readiness state
   *
   * @param {boolean} ready - Whether settings are ready for use
   * @returns {SetSettingsReadyAction} Action to set readiness
   *
   * @example
   * ```typescript
   * // Mark settings as ready after initialization
   * store.dispatch(SettingsActions.setSettingsReady(true));
   *
   * // Mark settings as not ready during reset
   * store.dispatch(SettingsActions.setSettingsReady(false));
   * ```
   */
  setSettingsReady: (ready: boolean): SetSettingsReadyAction => ({
    type: SettingsActionTypes.SET_SETTINGS_READY,
    payload: { ready },
  }),
};

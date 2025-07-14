/**
 * Settings actions for ReactiveStateStore
 *
 * All settings-related state changes flow through these actions
 * following Redux patterns for predictable state management.
 */

import { StateAction } from '../reactive-state-store';

/**
 * Settings domain action types
 */
export enum SettingsActionTypes {
  SET_SETTINGS = '[Settings] Set Settings',
  UPDATE_SETTING = '[Settings] Update Setting',
  LOAD_SETTINGS_SUCCESS = '[Settings] Load Settings Success',
  LOAD_SETTINGS_FAILURE = '[Settings] Load Settings Failure',
  RESET_SETTINGS = '[Settings] Reset Settings',
  SET_SETTINGS_READY = '[Settings] Set Settings Ready',
}

/**
 * Settings action interfaces
 */
export interface SetSettingsAction extends StateAction {
  readonly type: SettingsActionTypes.SET_SETTINGS;
  readonly payload: {
    readonly settings: {
      readonly combine12: boolean;
      readonly lrdesignators: boolean;
      readonly flammarkers: boolean;
      readonly ppinspector: boolean;
      readonly zoom: boolean;
      readonly scrolloffset: number;
      readonly multiadvance: number;
      readonly flamsort: string;
      readonly projectsort: string;
    };
  };
}

export interface UpdateSettingAction extends StateAction {
  readonly type: SettingsActionTypes.UPDATE_SETTING;
  readonly payload: {
    readonly key: string;
    readonly value: boolean | number | string;
  };
}

export interface LoadSettingsSuccessAction extends StateAction {
  readonly type: SettingsActionTypes.LOAD_SETTINGS_SUCCESS;
  readonly payload: {
    readonly settings: {
      readonly combine12: boolean;
      readonly lrdesignators: boolean;
      readonly flammarkers: boolean;
      readonly ppinspector: boolean;
      readonly zoom: boolean;
      readonly scrolloffset: number;
      readonly multiadvance: number;
      readonly flamsort: string;
      readonly projectsort: string;
    };
  };
}

export interface LoadSettingsFailureAction extends StateAction {
  readonly type: SettingsActionTypes.LOAD_SETTINGS_FAILURE;
  readonly payload: {
    readonly error: string;
  };
}

export interface ResetSettingsAction extends StateAction {
  readonly type: SettingsActionTypes.RESET_SETTINGS;
}

export interface SetSettingsReadyAction extends StateAction {
  readonly type: SettingsActionTypes.SET_SETTINGS_READY;
  readonly payload: {
    readonly ready: boolean;
  };
}

/**
 * Union type for all settings actions
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
 */
export const SettingsActions = {
  setSettings: (settings: {
    combine12: boolean;
    lrdesignators: boolean;
    flammarkers: boolean;
    ppinspector: boolean;
    zoom: boolean;
    scrolloffset: number;
    multiadvance: number;
    flamsort: string;
    projectsort: string;
  }): SetSettingsAction => ({
    type: SettingsActionTypes.SET_SETTINGS,
    payload: { settings },
  }),

  updateSetting: (key: string, value: boolean | number | string): UpdateSettingAction => ({
    type: SettingsActionTypes.UPDATE_SETTING,
    payload: { key, value },
  }),

  loadSettingsSuccess: (settings: {
    combine12: boolean;
    lrdesignators: boolean;
    flammarkers: boolean;
    ppinspector: boolean;
    zoom: boolean;
    scrolloffset: number;
    multiadvance: number;
    flamsort: string;
    projectsort: string;
  }): LoadSettingsSuccessAction => ({
    type: SettingsActionTypes.LOAD_SETTINGS_SUCCESS,
    payload: { settings },
  }),

  loadSettingsFailure: (error: string): LoadSettingsFailureAction => ({
    type: SettingsActionTypes.LOAD_SETTINGS_FAILURE,
    payload: { error },
  }),

  resetSettings: (): ResetSettingsAction => ({
    type: SettingsActionTypes.RESET_SETTINGS,
  }),

  setSettingsReady: (ready: boolean): SetSettingsReadyAction => ({
    type: SettingsActionTypes.SET_SETTINGS_READY,
    payload: { ready },
  }),
};

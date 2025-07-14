/**
 * Settings selectors for ReactiveStateStore
 *
 * Memoized selectors for accessing settings state with performance optimization.
 * These selectors replace direct BehaviorSubject access in SettingsService.
 */

import { AppState, SettingsState } from '../app-state.interface';

/**
 * Base settings selector
 */
export const selectSettingsState = (state: AppState): SettingsState => state.settings;

/**
 * Individual setting selectors - replace BehaviorSubjects
 */
export const selectCombine12 = (state: AppState): boolean => state.settings.combine12;

export const selectLRDesignators = (state: AppState): boolean => state.settings.lrdesignators;

export const selectFlamMarkers = (state: AppState): boolean => state.settings.flammarkers;

export const selectPPInspector = (state: AppState): boolean => state.settings.ppinspector;

export const selectZoom = (state: AppState): boolean => state.settings.zoom;

export const selectScrollOffset = (state: AppState): number => state.settings.scrolloffset;

export const selectMultiAdvance = (state: AppState): number => state.settings.multiadvance;

export const selectFlamSort = (state: AppState): string => state.settings.flamsort;

export const selectProjectSort = (state: AppState): string => state.settings.projectsort;

export const selectSettingsReady = (state: AppState): boolean => state.settings.ready;

/**
 * Computed selectors for complex derived state
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
});

export const selectSettingsCount = (state: AppState): number => {
  const settings = state.settings;
  return Object.keys(settings).filter(key => key !== 'ready').length;
};

/**
 * Validation selectors
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
    settings.scrolloffset >= -1 &&
    settings.multiadvance >= 1 &&
    ['keyAsc', 'keyDesc', 'nameAsc', 'nameDesc', 'dateAsc', 'dateDesc'].includes(settings.flamsort) &&
    ['keyAsc', 'keyDesc', 'nameAsc', 'nameDesc', 'dateAsc', 'dateDesc'].includes(settings.projectsort)
  );
};

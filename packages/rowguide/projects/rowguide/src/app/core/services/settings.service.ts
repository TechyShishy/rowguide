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

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  // Store-based observables replace BehaviorSubjects
  ready$: Observable<boolean> = this.store.select(selectSettingsReady);
  public combine12$ = this.store.select(selectCombine12);
  public lrdesignators$ = this.store.select(selectLRDesignators);
  public flammarkers$ = this.store.select(selectFlamMarkers);
  public ppinspector$ = this.store.select(selectPPInspector);
  public zoom$ = this.store.select(selectZoom);
  public scrolloffset$ = this.store.select(selectScrollOffset);
  public multiadvance$ = this.store.select(selectMultiAdvance);
  public flamsort$ = this.store.select(selectFlamSort);
  public projectsort$ = this.store.select(selectProjectSort);

  // Legacy property for backward compatibility - now uses store observable
  get ready(): Observable<boolean> {
    return this.ready$;
  }

  constructor(
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService,
    private store: ReactiveStateStore
  ) {
    this.loadSettings();
  }
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
          this.store.dispatch(SettingsActions.loadSettingsSuccess(settingsData));
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
      this.store.dispatch(SettingsActions.loadSettingsFailure(
        error instanceof Error ? error.message : 'Unknown error loading settings'
      ));
      // Service will maintain default values when errors occur
    }
  }
}

export class Settings {
  combine12: boolean = false;
  lrdesignators: boolean = false;
  flammarkers: boolean = false;
  ppinspector: boolean = false;
  zoom: boolean = false;
  scrolloffset: number = -1;
  multiadvance: number = 3;
  flamsort: string = 'keyAsc';
  projectsort: string = 'dateAsc';
}

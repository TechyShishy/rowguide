import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';

import { ErrorHandlerService } from './error-handler.service';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  ready: Subject<boolean> = new Subject<boolean>();
  public combine12$ = new BehaviorSubject<boolean>(false);
  public lrdesignators$ = new BehaviorSubject<boolean>(false);
  public flammarkers$ = new BehaviorSubject<boolean>(false);
  public ppinspector$ = new BehaviorSubject<boolean>(false);
  public zoom$ = new BehaviorSubject<boolean>(false);
  public scrolloffset$ = new BehaviorSubject<number>(-1);
  public multiadvance$ = new BehaviorSubject<number>(3);
  public flamsort$ = new BehaviorSubject<string>('keyAsc');
  public projectsort$ = new BehaviorSubject<string>('dateAsc');

  constructor(
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService
  ) {
    this.loadSettings();
  }
  saveSettings(settings: Settings) {
    try {
      localStorage.setItem('settings', JSON.stringify(settings));
      this.ready.next(true);
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
      this.ready.next(true); // Still emit ready even if save failed
    }
  }

  loadSettings() {
    try {
      let settings = localStorage.getItem('settings');
      if (settings) {
        let s = JSON.parse(settings);

        // Handle null or invalid parsed objects
        if (s && typeof s === 'object') {
          this.combine12$.next(s.combine12 ?? false);
          this.lrdesignators$.next(s.lrdesignators ?? false);
          this.flammarkers$.next(s.flammarkers ?? false);
          this.ppinspector$.next(s.ppinspector ?? false);
          this.zoom$.next(s.zoom ?? false);
          this.scrolloffset$.next(s.scrolloffset ?? -1);
          this.multiadvance$.next(s.multiadvance ?? 3);
          this.flamsort$.next(s.flamsort ?? 'keyAsc');
          this.projectsort$.next(s.projectsort ?? 'dateAsc');
        }
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

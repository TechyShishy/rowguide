import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  ready: Subject<boolean> = new Subject<boolean>();
  combine12: boolean = false;
  lrdesignators: boolean = false;

  constructor() {}
  saveSettings(settings: Settings) {
    localStorage.setItem('settings', JSON.stringify(settings));
    this.ready.next(true);
  }
  loadSettings() {
    let settings = localStorage.getItem('settings');
    if (settings) {
      let s = JSON.parse(settings);
      this.combine12 = s.combine12;
      this.lrdesignators = s.lrdesignators;
    }
  }
}

export class Settings {
  combine12: boolean = false;
  lrdesignators: boolean = false;
}

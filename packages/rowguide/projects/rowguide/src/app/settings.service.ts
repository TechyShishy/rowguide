import { Injectable, Input } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  ready: Subject<boolean> = new Subject<boolean>();
  @Input() combine12: boolean = false;
  @Input() lrdesignators: boolean = false;
  @Input() flammarkers: boolean = false;
  @Input() ppinspector: boolean = false;
  @Input() zoom: boolean = false;

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
      this.flammarkers = s.flammarkers;
      this.ppinspector = s.ppinspector;
      this.zoom = s.zoom;
    }
  }
}

export class Settings {
  combine12: boolean = false;
  lrdesignators: boolean = false;
  flammarkers: boolean = false;
  ppinspector: boolean = false;
  zoom: boolean = false;
}

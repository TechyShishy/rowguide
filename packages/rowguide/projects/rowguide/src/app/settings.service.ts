import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

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
  constructor() {
    this.loadSettings();
  }
  saveSettings(settings: Settings) {
    localStorage.setItem('settings', JSON.stringify(settings));
    this.ready.next(true);
  }
  loadSettings() {
    let settings = localStorage.getItem('settings');
    if (settings) {
      let s = JSON.parse(settings);
      this.combine12$.next(s.combine12);
      this.lrdesignators$.next(s.lrdesignators);
      this.flammarkers$.next(s.flammarkers);
      this.ppinspector$.next(s.ppinspector);
      this.zoom$.next(s.zoom);
      this.scrolloffset$.next(s.scrolloffset);
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
}

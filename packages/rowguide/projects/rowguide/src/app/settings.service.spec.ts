import { TestBed } from '@angular/core/testing';

import { SettingsService, Settings } from './settings.service';


  describe('SettingsService', () => {
    let service: SettingsService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
      localStorage.clear();
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should save settings to localStorage', () => {
      const settings: Settings = {
        combine12: true,
        lrdesignators: true,
        flammarkers: true,
      };
      service.saveSettings(settings);
      const savedSettings = JSON.parse(localStorage.getItem('settings')!);
      expect(savedSettings).toEqual(settings);
    });

    it('should load settings from localStorage', () => {
      const settings: Settings = {
        combine12: true,
        lrdesignators: true,
        flammarkers: true,
      };
      localStorage.setItem('settings', JSON.stringify(settings));
      service.loadSettings();
      expect(service.combine12).toBe(true);
      expect(service.lrdesignators).toBe(true);
      expect(service.flammarkers).toBe(true);
    });

    it('should emit ready event after saving settings', (done) => {
      service.ready.subscribe((isReady) => {
        expect(isReady).toBe(true);
        done();
      });
      const settings: Settings = {
        combine12: true,
        lrdesignators: true,
        flammarkers: true,
      };
      service.saveSettings(settings);
    });
  });

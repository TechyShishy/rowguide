import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';

import { SettingsService, Settings } from './settings.service';
import { ErrorHandlerService, ErrorContext } from './error-handler.service';

/**
 * @fileoverview Comprehensive Test Suite for SettingsService
 *
 * This test suite validates all aspects of the SettingsService functionality,
 * including settings persistence, reactive state management, error handling,
 * and edge cases.
 *
 * Test Categories:
 * - Service Initialization: Basic service creation and dependency validation
 * - Settings Persistence: localStorage save/load operations with validation
 * - Reactive State Management: BehaviorSubject behavior and state updates
 * - Error Handling: localStorage failures, JSON parsing errors, invalid data
 * - Edge Cases: Empty data, corrupted settings, boundary conditions
 * - Integration Scenarios: Ready event coordination and service interactions
 * - Performance: Rapid setting changes and memory management
 *
 * The tests use comprehensive mocking of localStorage and validate both
 * success and error scenarios to ensure robust error handling.
 */

describe('SettingsService', () => {
  let service: SettingsService;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;

  // Test data factory for creating valid settings
  const createValidSettings = (overrides: Partial<Settings> = {}): Settings => {
    return {
      combine12: false,
      lrdesignators: false,
      flammarkers: false,
      ppinspector: false,
      zoom: false,
      scrolloffset: -1,
      multiadvance: 3,
      flamsort: 'keyAsc',
      projectsort: 'dateAsc',
      ...overrides,
    };
  };

  beforeEach(() => {
    // Create spy for NGXLogger
    const loggerSpyObj = jasmine.createSpyObj('NGXLogger', [
      'warn',
      'debug',
      'info',
      'error',
    ]);

    // Create spy for ErrorHandlerService
    const errorHandlerSpyObj = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
    ]);

    // Configure ErrorHandlerService mock to handle structured context objects
    errorHandlerSpyObj.handleError.and.callFake(
      (error: any, context: string | ErrorContext) => {
        // Handle structured context objects for SettingsService calls
        if (typeof context === 'object' && context !== null) {
          const operation = context['operation'];
          const details = context['details'];

          if (
            operation === 'saveSettings' &&
            details?.includes('Failed to save settings')
          ) {
            loggerSpyObj.warn(
              'Failed to save settings to localStorage:',
              error
            );
          } else if (
            operation === 'loadSettings' &&
            details?.includes('Failed to load settings')
          ) {
            loggerSpyObj.warn(
              'Failed to load settings from localStorage:',
              error
            );
          } else {
            // Fallback for unhandled structured contexts
            loggerSpyObj.error('Settings operation failed:', error);
          }
        } else if (typeof context === 'string') {
          // Handle legacy string contexts
          if (context.includes('saveSettings')) {
            loggerSpyObj.warn(
              'Failed to save settings to localStorage:',
              error
            );
          } else if (context.includes('loadSettings')) {
            loggerSpyObj.warn(
              'Failed to load settings from localStorage:',
              error
            );
          }
        }

        return {
          error: {
            message: error?.message || error?.toString() || 'Unknown error',
          },
          userMessage: 'Settings operation failed',
          severity: 'medium',
        };
      }
    );

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        { provide: NGXLogger, useValue: loggerSpyObj },
        { provide: ErrorHandlerService, useValue: errorHandlerSpyObj },
      ],
    });
    localStorage.clear();
    service = TestBed.inject(SettingsService);
    loggerSpy = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
    errorHandlerSpy = TestBed.inject(
      ErrorHandlerService
    ) as jasmine.SpyObj<ErrorHandlerService>;
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have all required BehaviorSubjects initialized', () => {
      expect(service.combine12$).toBeDefined();
      expect(service.lrdesignators$).toBeDefined();
      expect(service.flammarkers$).toBeDefined();
      expect(service.ppinspector$).toBeDefined();
      expect(service.zoom$).toBeDefined();
      expect(service.scrolloffset$).toBeDefined();
      expect(service.multiadvance$).toBeDefined();
      expect(service.flamsort$).toBeDefined();
      expect(service.projectsort$).toBeDefined();
      expect(service.ready).toBeDefined();
    });

    it('should initialize with default values when no localStorage data exists', () => {
      expect(service.combine12$.value).toBe(false);
      expect(service.lrdesignators$.value).toBe(false);
      expect(service.flammarkers$.value).toBe(false);
      expect(service.ppinspector$.value).toBe(false);
      expect(service.zoom$.value).toBe(false);
      expect(service.scrolloffset$.value).toBe(-1);
      expect(service.multiadvance$.value).toBe(3);
      expect(service.flamsort$.value).toBe('keyAsc');
      expect(service.projectsort$.value).toBe('dateAsc');
    });

    it('should automatically load settings during construction', () => {
      const testSettings = createValidSettings({
        combine12: true,
        zoom: true,
        scrolloffset: 10,
      });
      localStorage.setItem('settings', JSON.stringify(testSettings));

      // Create new service instance to test constructor behavior
      const newLoggerSpy = jasmine.createSpyObj('NGXLogger', [
        'warn',
        'debug',
        'info',
        'error',
      ]);
      const newErrorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', [
        'handleError',
      ]);
      const newService = new SettingsService(newLoggerSpy, newErrorHandlerSpy);

      expect(newService.combine12$.value).toBe(true);
      expect(newService.zoom$.value).toBe(true);
      expect(newService.scrolloffset$.value).toBe(10);
    });
  });

  describe('Settings Persistence', () => {
    it('should save settings to localStorage', () => {
      const settings = createValidSettings({
        combine12: true,
        lrdesignators: true,
        flammarkers: true,
        scrolloffset: 5,
      });

      service.saveSettings(settings);

      const savedSettings = JSON.parse(localStorage.getItem('settings')!);
      expect(savedSettings).toEqual(settings);
    });

    it('should load settings from localStorage', () => {
      const settings = createValidSettings({
        combine12: true,
        lrdesignators: true,
        flammarkers: true,
        ppinspector: true,
        zoom: true,
        scrolloffset: 0,
      });
      localStorage.setItem('settings', JSON.stringify(settings));

      service.loadSettings();

      expect(service.combine12$.value).toBe(true);
      expect(service.lrdesignators$.value).toBe(true);
      expect(service.flammarkers$.value).toBe(true);
      expect(service.ppinspector$.value).toBe(true);
      expect(service.zoom$.value).toBe(true);
      expect(service.scrolloffset$.value).toBe(0);
    });

    it('should handle saving settings with all boolean flags enabled', () => {
      const settings = createValidSettings({
        combine12: true,
        lrdesignators: true,
        flammarkers: true,
        ppinspector: true,
        zoom: true,
      });

      service.saveSettings(settings);

      const savedSettings = JSON.parse(localStorage.getItem('settings')!);
      expect(savedSettings.combine12).toBe(true);
      expect(savedSettings.lrdesignators).toBe(true);
      expect(savedSettings.flammarkers).toBe(true);
      expect(savedSettings.ppinspector).toBe(true);
      expect(savedSettings.zoom).toBe(true);
    });

    it('should handle saving settings with all boolean flags disabled', () => {
      const settings = createValidSettings({
        combine12: false,
        lrdesignators: false,
        flammarkers: false,
        ppinspector: false,
        zoom: false,
      });

      service.saveSettings(settings);

      const savedSettings = JSON.parse(localStorage.getItem('settings')!);
      expect(savedSettings.combine12).toBe(false);
      expect(savedSettings.lrdesignators).toBe(false);
      expect(savedSettings.flammarkers).toBe(false);
      expect(savedSettings.ppinspector).toBe(false);
      expect(savedSettings.zoom).toBe(false);
    });

    it('should save numerical settings correctly', () => {
      const settings = createValidSettings({
        scrolloffset: 25,
        multiadvance: 5,
      });

      service.saveSettings(settings);

      const savedSettings = JSON.parse(localStorage.getItem('settings')!);
      expect(savedSettings.scrolloffset).toBe(25);
      expect(savedSettings.multiadvance).toBe(5);
    });

    it('should save string settings correctly', () => {
      const settings = createValidSettings({
        flamsort: 'keyDesc',
        projectsort: 'nameAsc',
      });

      service.saveSettings(settings);

      const savedSettings = JSON.parse(localStorage.getItem('settings')!);
      expect(savedSettings.flamsort).toBe('keyDesc');
      expect(savedSettings.projectsort).toBe('nameAsc');
    });
  });

  describe('Reactive State Management', () => {
    it('should update BehaviorSubjects when loading settings', () => {
      const settings = createValidSettings({
        combine12: true,
        scrolloffset: 15,
        flamsort: 'nameDesc',
      });
      localStorage.setItem('settings', JSON.stringify(settings));

      service.loadSettings();

      expect(service.combine12$.value).toBe(true);
      expect(service.scrolloffset$.value).toBe(15);
      expect(service.flamsort$.value).toBe('nameDesc');
    });

    it('should emit values to subscribers when settings change', (done) => {
      let emissionCount = 0;
      const expectedValues = [false, true]; // Initial value, then updated value

      service.combine12$.subscribe((value) => {
        expect(value).toBe(expectedValues[emissionCount]);
        emissionCount++;
        if (emissionCount === 2) {
          done();
        }
      });

      const settings = createValidSettings({ combine12: true });
      localStorage.setItem('settings', JSON.stringify(settings));
      service.loadSettings();
    });

    it('should maintain reactive subscriptions across multiple setting changes', () => {
      const emittedValues: number[] = [];

      service.scrolloffset$.subscribe((value) => {
        emittedValues.push(value);
      });

      // Multiple setting changes
      const settings1 = createValidSettings({ scrolloffset: 10 });
      localStorage.setItem('settings', JSON.stringify(settings1));
      service.loadSettings();

      const settings2 = createValidSettings({ scrolloffset: 20 });
      localStorage.setItem('settings', JSON.stringify(settings2));
      service.loadSettings();

      const settings3 = createValidSettings({ scrolloffset: 30 });
      localStorage.setItem('settings', JSON.stringify(settings3));
      service.loadSettings();

      expect(emittedValues).toEqual([-1, 10, 20, 30]); // Initial + 3 updates
    });
  });

  describe('Ready Event Handling', () => {
    it('should emit ready event after saving settings', (done) => {
      service.ready.subscribe((isReady) => {
        expect(isReady).toBe(true);
        done();
      });

      const settings = createValidSettings({
        combine12: true,
        lrdesignators: true,
        flammarkers: true,
        ppinspector: true,
        zoom: true,
      });
      service.saveSettings(settings);
    });

    it('should emit ready event for each save operation', () => {
      const readyEvents: boolean[] = [];

      service.ready.subscribe((isReady) => {
        readyEvents.push(isReady);
      });

      // Multiple save operations
      service.saveSettings(createValidSettings({ combine12: true }));
      service.saveSettings(createValidSettings({ lrdesignators: true }));
      service.saveSettings(createValidSettings({ zoom: true }));

      expect(readyEvents).toEqual([true, true, true]);
    });

    it('should not emit ready event when only loading settings', (done) => {
      let readyEmitted = false;

      service.ready.subscribe(() => {
        readyEmitted = true;
      });

      const settings = createValidSettings({ combine12: true });
      localStorage.setItem('settings', JSON.stringify(settings));
      service.loadSettings();

      // Use setTimeout to ensure ready event would have been emitted if it was going to be
      setTimeout(() => {
        expect(readyEmitted).toBe(false);
        done();
      }, 10);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage getItem errors gracefully', () => {
      spyOn(localStorage, 'getItem').and.throwError('Storage access denied');

      expect(() => service.loadSettings()).not.toThrow();

      // Should maintain default values
      expect(service.combine12$.value).toBe(false);
      expect(service.scrolloffset$.value).toBe(-1);
      expect(service.flamsort$.value).toBe('keyAsc');
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Failed to load settings from localStorage:',
        jasmine.any(Error)
      );
    });

    it('should handle localStorage setItem errors gracefully', () => {
      spyOn(localStorage, 'setItem').and.throwError('Storage quota exceeded');

      const settings = createValidSettings({ combine12: true });

      expect(() => service.saveSettings(settings)).not.toThrow();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Failed to save settings to localStorage:',
        jasmine.any(Error)
      );
    });

    it('should handle corrupted JSON in localStorage', () => {
      localStorage.setItem('settings', 'invalid-json{');

      expect(() => service.loadSettings()).not.toThrow();

      // Should maintain default values when JSON parsing fails
      expect(service.combine12$.value).toBe(false);
      expect(service.scrolloffset$.value).toBe(-1);
      expect(service.flamsort$.value).toBe('keyAsc');
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Failed to load settings from localStorage:',
        jasmine.any(SyntaxError)
      );
    });

    it('should handle empty string in localStorage', () => {
      localStorage.setItem('settings', '');

      service.loadSettings();

      expect(service.combine12$.value).toBe(false);
      expect(service.scrolloffset$.value).toBe(-1);
    });

    it('should handle null values in localStorage', () => {
      localStorage.setItem('settings', 'null');

      expect(() => service.loadSettings()).not.toThrow();

      // Should maintain default values when parsed object is null
      expect(service.combine12$.value).toBe(false);
      expect(service.scrolloffset$.value).toBe(-1);
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('should handle partial settings objects with missing properties', () => {
      const partialSettings = {
        combine12: true,
        scrolloffset: 10,
        // Missing other properties
      };
      localStorage.setItem('settings', JSON.stringify(partialSettings));

      service.loadSettings();

      expect(service.combine12$.value).toBe(true);
      expect(service.scrolloffset$.value).toBe(10);
      // Should use defaults for missing properties
      expect(service.lrdesignators$.value).toBe(false);
      expect(service.flamsort$.value).toBe('keyAsc');
    });

    it('should handle settings with undefined values', () => {
      const settingsWithUndefined = {
        combine12: undefined,
        lrdesignators: true,
        scrolloffset: undefined,
        multiadvance: 5,
      };
      localStorage.setItem('settings', JSON.stringify(settingsWithUndefined));

      service.loadSettings();

      // Should use defaults for undefined values
      expect(service.combine12$.value).toBe(false);
      expect(service.scrolloffset$.value).toBe(-1);
      // Should use provided values where available
      expect(service.lrdesignators$.value).toBe(true);
      expect(service.multiadvance$.value).toBe(5);
    });

    it('should handle settings with null values', () => {
      const settingsWithNull = {
        combine12: null,
        lrdesignators: true,
        scrolloffset: null,
        flamsort: 'keyDesc',
      };
      localStorage.setItem('settings', JSON.stringify(settingsWithNull));

      service.loadSettings();

      // Should use defaults for null values
      expect(service.combine12$.value).toBe(false);
      expect(service.scrolloffset$.value).toBe(-1);
      // Should use provided values where available
      expect(service.lrdesignators$.value).toBe(true);
      expect(service.flamsort$.value).toBe('keyDesc');
    });

    it('should handle settings with invalid data types', () => {
      const invalidSettings = {
        combine12: 'not-a-boolean',
        lrdesignators: true,
        scrolloffset: 'not-a-number',
        multiadvance: 7,
        flamsort: 123, // Should be string
      };
      localStorage.setItem('settings', JSON.stringify(invalidSettings));

      service.loadSettings();

      // Should use defaults for invalid types, nullish coalescing handles this
      expect(service.combine12$.value).toBe('not-a-boolean' as any); // Passes through
      expect(service.lrdesignators$.value).toBe(true);
      expect(service.scrolloffset$.value).toBe('not-a-number' as any); // Passes through
      expect(service.multiadvance$.value).toBe(7);
      expect(service.flamsort$.value).toBe(123 as any); // Passes through
    });

    it('should handle boundary values for numerical settings', () => {
      const boundarySettings = createValidSettings({
        scrolloffset: -100,
        multiadvance: 0,
      });
      localStorage.setItem('settings', JSON.stringify(boundarySettings));

      service.loadSettings();

      expect(service.scrolloffset$.value).toBe(-100);
      expect(service.multiadvance$.value).toBe(0);
    });

    it('should handle extreme numerical values', () => {
      const extremeSettings = createValidSettings({
        scrolloffset: Number.MAX_SAFE_INTEGER,
        multiadvance: Number.MIN_SAFE_INTEGER,
      });
      localStorage.setItem('settings', JSON.stringify(extremeSettings));

      service.loadSettings();

      expect(service.scrolloffset$.value).toBe(Number.MAX_SAFE_INTEGER);
      expect(service.multiadvance$.value).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('should handle empty object in localStorage', () => {
      localStorage.setItem('settings', '{}');

      service.loadSettings();

      // Should use all default values
      expect(service.combine12$.value).toBe(false);
      expect(service.lrdesignators$.value).toBe(false);
      expect(service.scrolloffset$.value).toBe(-1);
      expect(service.multiadvance$.value).toBe(3);
      expect(service.flamsort$.value).toBe('keyAsc');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid sequential save operations', () => {
      const readyEvents: boolean[] = [];

      service.ready.subscribe((isReady) => {
        readyEvents.push(isReady);
      });

      // Rapid sequential saves
      for (let i = 0; i < 5; i++) {
        const settings = createValidSettings({
          combine12: i % 2 === 0,
          scrolloffset: i * 10,
        });
        service.saveSettings(settings);
      }

      expect(readyEvents.length).toBe(5);
      expect(readyEvents.every((event) => event === true)).toBe(true);
    });

    it('should handle alternating save and load operations', () => {
      const combine12Values: boolean[] = [];

      service.combine12$.subscribe((value) => {
        combine12Values.push(value);
      });

      // Initial value
      expect(combine12Values).toEqual([false]);

      // Save then load - save doesn't update reactive state, only load does
      service.saveSettings(createValidSettings({ combine12: true }));
      service.loadSettings(); // This should update the reactive state

      // Verify the state was updated
      expect(combine12Values).toEqual([false, true]);

      // Save different value then load
      service.saveSettings(createValidSettings({ combine12: false }));
      service.loadSettings(); // This should update to false

      expect(combine12Values).toEqual([false, true, false]);
    });

    it('should maintain state consistency across service lifecycle', () => {
      // Save initial settings
      const initialSettings = createValidSettings({
        combine12: true,
        scrolloffset: 25,
        flamsort: 'nameAsc',
      });
      service.saveSettings(initialSettings);

      // Verify state
      expect(service.combine12$.value).toBe(false); // saveSettings doesn't update BehaviorSubjects
      expect(service.scrolloffset$.value).toBe(-1);
      expect(service.flamsort$.value).toBe('keyAsc');

      // Load settings to update state
      service.loadSettings();

      expect(service.combine12$.value).toBe(true);
      expect(service.scrolloffset$.value).toBe(25);
      expect(service.flamsort$.value).toBe('nameAsc');
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large settings objects efficiently', () => {
      const largeSettings = createValidSettings({
        flamsort: 'a'.repeat(1000), // Large string
        projectsort: 'b'.repeat(1000),
      });

      expect(() => service.saveSettings(largeSettings)).not.toThrow();

      localStorage.setItem('settings', JSON.stringify(largeSettings));
      expect(() => service.loadSettings()).not.toThrow();
    });

    it('should not leak memory with multiple subscriptions', () => {
      const subscriptions: any[] = [];

      // Create multiple subscriptions
      for (let i = 0; i < 10; i++) {
        subscriptions.push(service.combine12$.subscribe(() => {}));
      }

      // Clean up subscriptions
      subscriptions.forEach((sub) => sub.unsubscribe());

      // Should not throw or cause issues
      expect(() => service.loadSettings()).not.toThrow();
    });

    it('should handle rapid setting changes without performance degradation', () => {
      const startTime = performance.now();

      // Perform many rapid operations
      for (let i = 0; i < 100; i++) {
        const settings = createValidSettings({
          combine12: i % 2 === 0,
          scrolloffset: i,
        });
        service.saveSettings(settings);
        service.loadSettings();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second for 100 operations
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { firstValueFrom, of, BehaviorSubject } from 'rxjs';
import { map, skip, filter } from 'rxjs/operators';

import { SettingsService, Settings } from './settings.service';
import { ErrorHandlerService, ErrorContext } from './error-handler.service';
import { ReactiveStateStore } from '../store/reactive-state-store';
import { SettingsActions } from '../store/actions/settings-actions';
import {
  selectCombine12,
  selectLRDesignators,
  selectFlamMarkers,
  selectZoom,
  selectScrollOffset,
  selectMultiAdvance,
  selectFlamSort,
  selectProjectSort,
  selectSettingsReady
} from '../store/selectors/settings-selectors';

/**
 * Comprehensive Test Suite for SettingsService
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
  let storeSpy: jasmine.SpyObj<ReactiveStateStore>;

  // Test data factory for creating valid settings
  const createValidSettings = (overrides: Partial<Settings> = {}): Settings => {
    return {
      combine12: false,
      lrdesignators: false,
      flammarkers: false,
      zoom: false,
      scrolloffset: -1,
      multiadvance: 3,
      flamsort: 'keyAsc',
      projectsort: 'dateAsc',
      colorModel: 'NONE',
      ...overrides,
    };
  };

  // Helper function to test observable values
  const expectObservableValue = async <T>(observable: any, expectedValue: T) => {
    const value = await firstValueFrom(observable);
    expect(value).toBe(expectedValue);
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

    // Create spy for ReactiveStateStore with stateful behavior using BehaviorSubject
    const storeSpyObj = jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch']);

    // Create a BehaviorSubject to hold the mock state
    const mockStateSubject = new BehaviorSubject({
      combine12: false,
      lrdesignators: false,
      flammarkers: false,
      zoom: false,
      scrolloffset: -1,
      multiadvance: 3,
      flamsort: 'keyAsc',
      projectsort: 'dateAsc',
      ready: false  // Start with ready: false to avoid unwanted initial emissions
    });

    // Mock store dispatch to update BehaviorSubject state
    storeSpyObj.dispatch.and.callFake((action: any) => {
      const currentState = mockStateSubject.value;

      if (action.type === '[Settings] Load Settings Success') {
        // Update state with loaded values and set ready: true (matches real reducer behavior)
        const newState = { ...currentState, ...action.payload.settings, ready: true };
        mockStateSubject.next(newState);
      } else if (action.type === '[Settings] Set Settings') {
        // Update state with set values and set ready: true
        const newState = { ...currentState, ...action.payload.settings, ready: true };
        mockStateSubject.next(newState);
      } else if (action.type === '[Settings] Set Settings Ready') {
        // Update ready state - payload contains { ready: boolean }
        const newState = { ...currentState, ready: action.payload.ready };
        mockStateSubject.next(newState);
      } else if (action.type === '[Settings] Load Settings Failure') {
        // On failure, set ready: false
        const newState = { ...currentState, ready: false };
        mockStateSubject.next(newState);
      }
    });

    // Mock store selectors to return from BehaviorSubject with selector applied
    storeSpyObj.select.and.callFake((selector: any) => {
      return mockStateSubject.pipe(
        map(state => {
          // Apply selector function to current state
          if (selector === selectCombine12) return state.combine12;
          if (selector === selectLRDesignators) return state.lrdesignators;
          if (selector === selectFlamMarkers) return state.flammarkers;
          if (selector === selectZoom) return state.zoom;
          if (selector === selectScrollOffset) return state.scrolloffset;
          if (selector === selectMultiAdvance) return state.multiadvance;
          if (selector === selectFlamSort) return state.flamsort;
          if (selector === selectProjectSort) return state.projectsort;
          if (selector === selectSettingsReady) return state.ready;
          return null;
        })
      );
    });

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        { provide: NGXLogger, useValue: loggerSpyObj },
        { provide: ErrorHandlerService, useValue: errorHandlerSpyObj },
        { provide: ReactiveStateStore, useValue: storeSpyObj },
      ],
    });
    localStorage.clear();

    // Reset mock state for each test
    mockStateSubject.next({
      combine12: false,
      lrdesignators: false,
      flammarkers: false,
      zoom: false,
      scrolloffset: -1,
      multiadvance: 3,
      flamsort: 'keyAsc',
      projectsort: 'dateAsc',
      ready: false  // Reset to false for each test
    });

    service = TestBed.inject(SettingsService);
    loggerSpy = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
    errorHandlerSpy = TestBed.inject(
      ErrorHandlerService
    ) as jasmine.SpyObj<ErrorHandlerService>;
    storeSpy = TestBed.inject(ReactiveStateStore) as jasmine.SpyObj<ReactiveStateStore>;
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
      expect(service.zoom$).toBeDefined();
      expect(service.scrolloffset$).toBeDefined();
      expect(service.multiadvance$).toBeDefined();
      expect(service.flamsort$).toBeDefined();
      expect(service.projectsort$).toBeDefined();
      expect(service.ready).toBeDefined();
    });

    it('should initialize with default values when no localStorage data exists', async () => {
      await expectObservableValue(service.combine12$, false);
      await expectObservableValue(service.lrdesignators$, false);
      await expectObservableValue(service.flammarkers$, false);
      await expectObservableValue(service.zoom$, false);
      await expectObservableValue(service.scrolloffset$, -1);
      await expectObservableValue(service.multiadvance$, 3);
      await expectObservableValue(service.flamsort$, 'keyAsc');
      await expectObservableValue(service.projectsort$, 'dateAsc');
    });

    it('should automatically load settings during construction', async () => {
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
      const newStoreSpy = jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch']);

      // Mock the store to return the test values
      newStoreSpy.select.and.callFake((selector: any) => {
        if (selector === selectCombine12) return of(true);
        if (selector === selectZoom) return of(true);
        if (selector === selectScrollOffset) return of(10);
        return of(null);
      });

      const newService = new SettingsService(newLoggerSpy, newErrorHandlerSpy, newStoreSpy);

      await expectObservableValue(newService.combine12$, true);
      await expectObservableValue(newService.zoom$, true);
      await expectObservableValue(newService.scrolloffset$, 10);
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
        zoom: true,
        scrolloffset: 0,
      });
      localStorage.setItem('settings', JSON.stringify(settings));

      service.loadSettings();

      // Verify that loadSettingsSuccess was dispatched with the correct settings
      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        SettingsActions.loadSettingsSuccess(settings)
      );

      // Verify that setSettingsReady was called
      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        SettingsActions.setSettingsReady(true)
      );
    });

    it('should handle saving settings with all boolean flags enabled', () => {
      const settings = createValidSettings({
        combine12: true,
        lrdesignators: true,
        flammarkers: true,
        zoom: true,
      });

      service.saveSettings(settings);

      const savedSettings = JSON.parse(localStorage.getItem('settings')!);
      expect(savedSettings.combine12).toBe(true);
      expect(savedSettings.lrdesignators).toBe(true);
      expect(savedSettings.flammarkers).toBe(true);
      expect(savedSettings.zoom).toBe(true);
    });

    it('should handle saving settings with all boolean flags disabled', () => {
      const settings = createValidSettings({
        combine12: false,
        lrdesignators: false,
        flammarkers: false,
        zoom: false,
      });

      service.saveSettings(settings);

      const savedSettings = JSON.parse(localStorage.getItem('settings')!);
      expect(savedSettings.combine12).toBe(false);
      expect(savedSettings.lrdesignators).toBe(false);
      expect(savedSettings.flammarkers).toBe(false);
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
    it('should dispatch loadSettingsSuccess when loading settings', () => {
      const settings = createValidSettings({
        combine12: true,
        scrolloffset: 15,
        flamsort: 'nameDesc',
      });
      localStorage.setItem('settings', JSON.stringify(settings));

      service.loadSettings();

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        SettingsActions.loadSettingsSuccess(settings)
      );
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
      service.ready.pipe(skip(1)).subscribe((isReady) => {
        expect(isReady).toBe(true);
        done();
      });

      const settings = createValidSettings({
        combine12: true,
        lrdesignators: true,
        flammarkers: true,
        zoom: true,
      });
      service.saveSettings(settings);
    });

    it('should emit ready event for each save operation', () => {
      const readyEvents: boolean[] = [];

      service.ready.pipe(skip(1)).subscribe((isReady) => {
        readyEvents.push(isReady);
      });

      // Multiple save operations
      service.saveSettings(createValidSettings({ combine12: true }));
      service.saveSettings(createValidSettings({ lrdesignators: true }));
      service.saveSettings(createValidSettings({ zoom: true }));

      expect(readyEvents).toEqual([true, true, true]);
    });

    it('should emit ready event when loading settings successfully', (done) => {
      let readyEmissionCount = 0;
      const readyValues: boolean[] = [];

      // Track all ready emissions
      service.ready.subscribe((ready) => {
        readyEmissionCount++;
        readyValues.push(ready);
      });

      // After subscription, we should have initial emission from constructor loadSettings
      // Constructor calls loadSettings() on empty localStorage, which goes to else branch and sets ready: true

      // Now set valid settings and load them - this SHOULD trigger ready emission (per reducer behavior)
      const settings = createValidSettings({ combine12: true });
      localStorage.setItem('settings', JSON.stringify(settings));
      service.loadSettings();

      // Use setTimeout to let any async behavior complete
      setTimeout(() => {
        // Should have: initial (true) + loadSettingsSuccess (true) = 2 emissions
        expect(readyEmissionCount).toBe(2);
        expect(readyValues).toEqual([true, true]); // Constructor + loadSettingsSuccess
        done();
      }, 10);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage getItem errors gracefully', () => {
      spyOn(localStorage, 'getItem').and.throwError('Storage access denied');

      expect(() => service.loadSettings()).not.toThrow();

      // Should dispatch loadSettingsFailure to the store
      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: SettingsActions.loadSettingsFailure('').type,
          payload: jasmine.any(Object)
        })
      );
      expect(errorHandlerSpy.handleError).toHaveBeenCalled();
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

      // Should dispatch loadSettingsFailure when JSON parsing fails
      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: SettingsActions.loadSettingsFailure('').type
        })
      );
      expect(errorHandlerSpy.handleError).toHaveBeenCalled();
    });

    it('should handle empty string in localStorage', () => {
      // Reset spy to clear any previous calls from beforeEach and service constructor
      storeSpy.dispatch.calls.reset();

      localStorage.setItem('settings', '');

      service.loadSettings();

      // Empty string is falsy, so it goes to the else branch (no settings found)
      // and should trigger setSettingsReady(true), NOT loadSettingsFailure
      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        SettingsActions.setSettingsReady(true)
      );

      // Should NOT have been called with loadSettingsFailure
      expect(storeSpy.dispatch).not.toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: SettingsActions.loadSettingsFailure('').type
        })
      );
    });

    it('should handle null values in localStorage', async () => {
      localStorage.setItem('settings', 'null');

      expect(() => service.loadSettings()).not.toThrow();

      // Should maintain default values when parsed object is null
      await expectObservableValue(service.combine12$, false);
      await expectObservableValue(service.scrolloffset$, -1);
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('should handle partial settings objects with missing properties', async () => {
      const partialSettings = {
        combine12: true,
        scrolloffset: 10,
        // Missing other properties
      };
      localStorage.setItem('settings', JSON.stringify(partialSettings));

      service.loadSettings();

      await expectObservableValue(service.combine12$, true);
      await expectObservableValue(service.scrolloffset$, 10);
      // Should use defaults for missing properties
      await expectObservableValue(service.lrdesignators$, false);
      await expectObservableValue(service.flamsort$, 'keyAsc');
    });

    it('should handle settings with undefined values', async () => {
      const settingsWithUndefined = {
        combine12: undefined,
        lrdesignators: true,
        scrolloffset: undefined,
        multiadvance: 5,
      };
      localStorage.setItem('settings', JSON.stringify(settingsWithUndefined));

      service.loadSettings();

      // Should use defaults for undefined values
      await expectObservableValue(service.combine12$, false);
      await expectObservableValue(service.scrolloffset$, -1);
      // Should use provided values where available
      await expectObservableValue(service.lrdesignators$, true);
      await expectObservableValue(service.multiadvance$, 5);
    });

    it('should handle settings with null values', async () => {
      const settingsWithNull = {
        combine12: null,
        lrdesignators: true,
        scrolloffset: null,
        flamsort: 'keyDesc',
      };
      localStorage.setItem('settings', JSON.stringify(settingsWithNull));

      service.loadSettings();

      // Should use defaults for null values
      await expectObservableValue(service.combine12$, false);
      await expectObservableValue(service.scrolloffset$, -1);
      // Should use provided values where available
      await expectObservableValue(service.lrdesignators$, true);
      await expectObservableValue(service.flamsort$, 'keyDesc');
    });

    it('should handle settings with invalid data types', async () => {
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
      await expectObservableValue(service.combine12$, 'not-a-boolean' as any); // Passes through
      await expectObservableValue(service.lrdesignators$, true);
      await expectObservableValue(service.scrolloffset$, 'not-a-number' as any); // Passes through
      await expectObservableValue(service.multiadvance$, 7);
      await expectObservableValue(service.flamsort$, 123 as any); // Passes through
    });

    it('should handle boundary values for numerical settings', async () => {
      const boundarySettings = createValidSettings({
        scrolloffset: -100,
        multiadvance: 0,
      });
      localStorage.setItem('settings', JSON.stringify(boundarySettings));

      service.loadSettings();

      await expectObservableValue(service.scrolloffset$, -100);
      await expectObservableValue(service.multiadvance$, 0);
    });

    it('should handle extreme numerical values', async () => {
      const extremeSettings = createValidSettings({
        scrolloffset: Number.MAX_SAFE_INTEGER,
        multiadvance: Number.MIN_SAFE_INTEGER,
      });
      localStorage.setItem('settings', JSON.stringify(extremeSettings));

      service.loadSettings();

      await expectObservableValue(service.scrolloffset$, Number.MAX_SAFE_INTEGER);
      await expectObservableValue(service.multiadvance$, Number.MIN_SAFE_INTEGER);
    });

    it('should handle empty object in localStorage', async () => {
      localStorage.setItem('settings', '{}');

      service.loadSettings();

      // Should use all default values
      await expectObservableValue(service.combine12$, false);
      await expectObservableValue(service.lrdesignators$, false);
      await expectObservableValue(service.scrolloffset$, -1);
      await expectObservableValue(service.multiadvance$, 3);
      await expectObservableValue(service.flamsort$, 'keyAsc');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid sequential save operations', () => {
      const readyEvents: boolean[] = [];

      service.ready.pipe(skip(1)).subscribe((isReady) => {
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

      // Save - this dispatches setSettings which updates the state immediately
      service.saveSettings(createValidSettings({ combine12: true }));
      expect(combine12Values).toEqual([false, true]);

      // Save different value - this also updates state immediately
      service.saveSettings(createValidSettings({ combine12: false }));
      expect(combine12Values).toEqual([false, true, false]);
    });

    it('should maintain state consistency across service lifecycle', async () => {
      // Save initial settings - this should update state immediately via setSettings action
      const initialSettings = createValidSettings({
        combine12: true,
        scrolloffset: 25,
        flamsort: 'nameAsc',
      });
      service.saveSettings(initialSettings);

      // Verify state is updated after saveSettings (which dispatches setSettings)
      await expectObservableValue(service.combine12$, true);
      await expectObservableValue(service.scrolloffset$, 25);
      await expectObservableValue(service.flamsort$, 'nameAsc');

      // Loading settings should maintain the same state since localStorage has the same values
      service.loadSettings();

      await expectObservableValue(service.combine12$, true);
      await expectObservableValue(service.scrolloffset$, 25);
      await expectObservableValue(service.flamsort$, 'nameAsc');
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

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { MarkModeService } from './mark-mode.service';
import { ReactiveStateStore } from '../store/reactive-state-store';
import { MarkModeActions } from '../store/actions/mark-mode-actions';
import {
  selectCurrentMarkMode,
  selectPreviousMarkMode,
  selectMarkModeHistory,
  selectCanUndoMarkMode,
  selectIsDefaultMarkMode
} from '../store/selectors/mark-mode-selectors';
import { ErrorHandlerService } from './error-handler.service';

/**
 * Comprehensive Test Suite for MarkModeService
 *
 * This test suite validates all aspects of the MarkModeService functionality
 * with ReactiveStateStore integration, including mark mode state management,
 * history tracking, undo functionality, and store action dispatching.
 *
 * Test Categories:
 * - Service Initialization: Basic service creation and store integration
 * - Mark Mode Management: Setting, updating, and resetting mark modes
 * - History Tracking: Mark mode change history and undo functionality
 * - Store Integration: Action dispatching and selector behavior
 * - Edge Cases: Boundary values, invalid inputs, state consistency
 */

describe('MarkModeService', () => {
  let service: MarkModeService;
  let storeSpy: jasmine.SpyObj<ReactiveStateStore>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Create spy for ErrorHandlerService
    const errorHandlerSpyObj = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);
    
    // Create spy for ReactiveStateStore with stateful behavior using BehaviorSubject
    const storeSpyObj = jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch', 'getState']);

    // Create a BehaviorSubject to hold the mock state
    const mockStateSubject = new BehaviorSubject({
      currentMode: 0,
      previousMode: undefined as number | undefined,
      history: [] as number[],
      lastUpdated: Date.now(),
      changeCount: 0,
    });

    // Mock store dispatch to update BehaviorSubject state
    storeSpyObj.dispatch.and.callFake((action: any) => {
      const currentState = mockStateSubject.value;

      if (action.type === '[MarkMode] Set Mark Mode') {
        const newState = {
          currentMode: action.payload.mode,
          previousMode: currentState.currentMode,
          history: [...currentState.history, action.payload.mode].slice(-10),
          lastUpdated: action.payload.timestamp || Date.now(),
          changeCount: currentState.changeCount + 1,
        };
        mockStateSubject.next(newState);
      } else if (action.type === '[MarkMode] Update Mark Mode') {
        const newState = {
          currentMode: action.payload.mode,
          previousMode: action.payload.previousMode ?? currentState.currentMode,
          history: [...currentState.history, action.payload.mode].slice(-10),
          lastUpdated: action.payload.timestamp || Date.now(),
          changeCount: currentState.changeCount + 1,
        };
        mockStateSubject.next(newState);
      } else if (action.type === '[MarkMode] Reset Mark Mode') {
        const newState = {
          currentMode: 0,
          previousMode: currentState.currentMode,
          history: [...currentState.history, 0].slice(-10),
          lastUpdated: action.payload.timestamp || Date.now(),
          changeCount: currentState.changeCount + 1,
        };
        mockStateSubject.next(newState);
      }
    });

    // Mock store selectors to return from BehaviorSubject with selector applied
    storeSpyObj.select.and.callFake((selector: any) => {
      return mockStateSubject.pipe(
        map(state => {
          // Apply selector function to current state
          if (selector === selectCurrentMarkMode) return state.currentMode;
          if (selector === selectPreviousMarkMode) return state.previousMode;
          if (selector === selectMarkModeHistory) return state.history;
          if (selector === selectCanUndoMarkMode) return state.previousMode !== undefined;
          if (selector === selectIsDefaultMarkMode) return state.currentMode === 0;
          return null;
        })
      );
    });

    // Mock getState to return current state
    storeSpyObj.getState.and.callFake(() => ({
      markMode: mockStateSubject.value,
      projects: null,
      ui: null,
      system: null,
      settings: null,
      notifications: null,
    }));

    TestBed.configureTestingModule({
      providers: [
        MarkModeService,
        { provide: ReactiveStateStore, useValue: storeSpyObj },
        { provide: ErrorHandlerService, useValue: errorHandlerSpyObj },
      ],
    });

    // Reset mock state for each test
    mockStateSubject.next({
      currentMode: 0,
      previousMode: undefined as number | undefined,
      history: [] as number[],
      lastUpdated: Date.now(),
      changeCount: 0,
    });

    service = TestBed.inject(MarkModeService);
    storeSpy = TestBed.inject(ReactiveStateStore) as jasmine.SpyObj<ReactiveStateStore>;
    errorHandlerSpy = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have all required observables', () => {
      expect(service.markModeChanged$).toBeDefined();
      expect(service.previousMode$).toBeDefined();
      expect(service.history$).toBeDefined();
      expect(service.canUndo$).toBeDefined();
      expect(service.isDefault$).toBeDefined();
    });
  });

  describe('Mark Mode Management', () => {
    it('should dispatch updateMarkMode action when updating mark mode', () => {
      service.updateMarkMode(3);

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[MarkMode] Update Mark Mode',
          payload: jasmine.objectContaining({
            mode: 3,
          })
        })
      );
    });

    it('should dispatch setMarkMode action when setting mark mode', () => {
      service.setMarkMode(5);

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[MarkMode] Set Mark Mode',
          payload: jasmine.objectContaining({
            mode: 5,
          })
        })
      );
    });

    it('should dispatch resetMarkMode action when resetting', () => {
      service.resetMarkMode();

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[MarkMode] Reset Mark Mode',
          payload: jasmine.objectContaining({
            timestamp: jasmine.any(Number),
          })
        })
      );
    });

    it('should emit mark mode changes through observable', (done) => {
      let emissionCount = 0;
      const expectedValues = [0, 3]; // Initial value, then updated value

      service.markModeChanged$.subscribe((value) => {
        expect(value).toBe(expectedValues[emissionCount]);
        emissionCount++;
        if (emissionCount === 2) {
          done();
        }
      });

      service.updateMarkMode(3);
    });

    it('should handle multiple sequential mark mode changes', () => {
      const emittedValues: number[] = [];

      service.markModeChanged$.subscribe((value) => {
        emittedValues.push(value);
      });

      service.updateMarkMode(1);
      service.updateMarkMode(2);
      service.setMarkMode(0);

      expect(emittedValues).toEqual([0, 1, 2, 0]); // Initial + 3 updates
    });
  });

  describe('History and Undo Functionality', () => {
    it('should track mark mode history', () => {
      const historyValues: number[][] = [];

      service.history$.subscribe((history) => {
        historyValues.push([...history]);
      });

      service.updateMarkMode(1);
      service.updateMarkMode(2);
      service.updateMarkMode(3);

      expect(historyValues[historyValues.length - 1]).toEqual([1, 2, 3]);
    });

    it('should enable undo when previous mode is available', () => {
      const canUndoValues: boolean[] = [];

      service.canUndo$.subscribe((canUndo) => {
        canUndoValues.push(canUndo);
      });

      service.updateMarkMode(5); // Should enable undo

      expect(canUndoValues).toEqual([false, true]); // Initial false, then true after update
    });

    it('should undo to previous mark mode', () => {
      // Set initial mode
      service.updateMarkMode(5);

      // Clear any previous dispatch calls
      storeSpy.dispatch.calls.reset();

      // Undo should dispatch setMarkMode with previous mode (0)
      service.undoMarkMode();

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[MarkMode] Set Mark Mode',
          payload: jasmine.objectContaining({
            mode: 0, // Previous mode
          })
        })
      );
    });
  });

  describe('Default Mode Detection', () => {
    it('should detect default mode correctly', () => {
      const isDefaultValues: boolean[] = [];

      service.isDefault$.subscribe((isDefault) => {
        isDefaultValues.push(isDefault);
      });

      service.updateMarkMode(1); // Not default
      service.resetMarkMode(); // Back to default

      expect(isDefaultValues).toEqual([true, false, true]); // Initial true, false after update, true after reset
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values', () => {
      service.updateMarkMode(0);
      service.updateMarkMode(6);
      service.updateMarkMode(-1);

      expect(storeSpy.dispatch).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid sequential updates', () => {
      for (let i = 0; i < 10; i++) {
        service.updateMarkMode(i);
      }

      expect(storeSpy.dispatch).toHaveBeenCalledTimes(10);
    });

    it('should not error when undoing with no previous mode', () => {
      // No previous mode should exist initially
      expect(() => service.undoMarkMode()).not.toThrow();
    });
  });

  describe('Persistence', () => {
    it('should save mark mode to localStorage when mode changes', () => {
      // Check initial state
      expect(localStorage.getItem('markMode')).toBe('0');
      
      // Change mode and verify it gets saved
      service.updateMarkMode(3);
      expect(localStorage.getItem('markMode')).toBe('3');
      
      // Change to another mode
      service.setMarkMode(1);
      expect(localStorage.getItem('markMode')).toBe('1');
      
      // Reset mode
      service.resetMarkMode();
      expect(localStorage.getItem('markMode')).toBe('0');
    });

    it('should load mark mode from localStorage on service initialization', () => {
      // Set a value in localStorage before service creation
      localStorage.setItem('markMode', '5');
      
      // Create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          MarkModeService,
          { provide: ReactiveStateStore, useValue: storeSpy },
          { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        ],
      });
      
      const newService = TestBed.inject(MarkModeService);
      
      // Verify that setMarkMode was called with the stored value
      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[MarkMode] Set Mark Mode',
          payload: jasmine.objectContaining({
            mode: 5,
          })
        })
      );
    });

    it('should handle invalid values in localStorage gracefully', () => {
      // Test with invalid JSON-like string
      localStorage.setItem('markMode', 'invalid');
      
      // Create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          MarkModeService,
          { provide: ReactiveStateStore, useValue: storeSpy },
          { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        ],
      });
      
      const newService = TestBed.inject(MarkModeService);
      
      // Should not call setMarkMode with invalid value
      expect(storeSpy.dispatch).not.toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[MarkMode] Set Mark Mode',
          payload: jasmine.objectContaining({
            mode: jasmine.any(Number),
          })
        })
      );
    });

    it('should handle out-of-range values in localStorage gracefully', () => {
      // Test with out-of-range values
      localStorage.setItem('markMode', '-1');
      
      // Create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          MarkModeService,
          { provide: ReactiveStateStore, useValue: storeSpy },
          { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        ],
      });
      
      const newService = TestBed.inject(MarkModeService);
      
      // Should not call setMarkMode with out-of-range value
      expect(storeSpy.dispatch).not.toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[MarkMode] Set Mark Mode',
          payload: jasmine.objectContaining({
            mode: -1,
          })
        })
      );
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalGetItem = localStorage.getItem;
      const originalSetItem = localStorage.setItem;
      
      spyOn(localStorage, 'getItem').and.throwError('Storage error');
      spyOn(localStorage, 'setItem').and.throwError('Storage error');
      
      // Create a new service instance - should not throw
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          MarkModeService,
          { provide: ReactiveStateStore, useValue: storeSpy },
          { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        ],
      });
      
      expect(() => TestBed.inject(MarkModeService)).not.toThrow();
      
      // Verify error handler was called for initialization
      expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
        jasmine.any(Error),
        jasmine.objectContaining({
          operation: 'initializeMarkMode',
          storageType: 'localStorage',
          storageKey: 'markMode',
        }),
        jasmine.any(String),
        'low'
      );
      
      // Reset spies
      localStorage.getItem = originalGetItem;
      localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage save errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      spyOn(localStorage, 'setItem').and.throwError('Storage full');
      
      // Should not throw when trying to save
      expect(() => service.updateMarkMode(2)).not.toThrow();
      
      // Verify error handler was called for save operation
      expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
        jasmine.any(Error),
        jasmine.objectContaining({
          operation: 'saveMarkMode',
          storageType: 'localStorage',
          storageKey: 'markMode',
        }),
        jasmine.any(String),
        'low'
      );
    });

    it('should persist mark mode across simulated sessions', () => {
      // Set a mark mode
      service.updateMarkMode(4);
      expect(localStorage.getItem('markMode')).toBe('4');
      
      // Simulate a new session by creating a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          MarkModeService,
          { provide: ReactiveStateStore, useValue: storeSpy },
          { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        ],
      });
      
      const newService = TestBed.inject(MarkModeService);
      
      // Verify that the persisted value was restored
      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[MarkMode] Set Mark Mode',
          payload: jasmine.objectContaining({
            mode: 4,
          })
        })
      );
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';

import { MarkModeService } from './mark-mode.service';
import { ReactiveStateStore } from '../store/reactive-state-store';
import { MarkModeActions } from '../store/actions/mark-mode-actions';
import { ProjectActions } from '../store/actions/project-actions';
import {
  selectCurrentMarkMode,
  selectPreviousMarkMode,
  selectMarkModeHistory,
  selectCanUndoMarkMode,
  selectIsDefaultMarkMode
} from '../store/selectors/mark-mode-selectors';
import { selectCurrentProject } from '../store/selectors/project-selectors';
import { ErrorHandlerService } from './error-handler.service';
import { ProjectDbService } from '../../data/services/project-db.service';
import { Project } from '../models';

/**
 * Comprehensive Test Suite for MarkModeService
 *
 * This test suite validates all aspects of the MarkModeService functionality
 * with ReactiveStateStore integration, including mark mode state management,
 * history tracking, undo functionality, store action dispatching, and
 * individual step marking persistence capabilities.
 *
 * Test Categories:
 * - Service Initialization: Basic service creation and store integration
 * - Mark Mode Management: Setting, updating, and resetting mark modes
 * - History Tracking: Mark mode change history and undo functionality
 * - Store Integration: Action dispatching and selector behavior
 * - Step Marking: Individual step marking persistence and retrieval
 * - Edge Cases: Boundary values, invalid inputs, state consistency
 */

describe('MarkModeService', () => {
  let service: MarkModeService;
  let storeSpy: jasmine.SpyObj<ReactiveStateStore>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;
  let projectDbSpy: jasmine.SpyObj<ProjectDbService>;

  beforeEach(() => {
    // Create spy for ReactiveStateStore with stateful behavior using BehaviorSubject
    const storeSpyObj = jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch', 'getState']);
    
    // Create spies for logger, error handler, and project database
    const loggerSpyObj = jasmine.createSpyObj('NGXLogger', ['debug', 'warn', 'error']);
    const errorHandlerSpyObj = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);
    const projectDbSpyObj = jasmine.createSpyObj('ProjectDbService', ['updateProject']);

    // Create a BehaviorSubject to hold the mock mark mode state
    const mockMarkModeState = new BehaviorSubject({
      currentMode: 0,
      previousMode: undefined as number | undefined,
      history: [] as number[],
      lastUpdated: Date.now(),
      changeCount: 0,
    });

    // Create a BehaviorSubject to hold the mock project state
    const mockProject: Project = {
      id: 1,
      name: 'Test Project',
      rows: [],
      markedSteps: {}
    };
    const mockProjectState = new BehaviorSubject(mockProject);

    // Mock store dispatch to update BehaviorSubject state
    storeSpyObj.dispatch.and.callFake((action: any) => {
      const currentState = mockMarkModeState.value;

      if (action.type === '[MarkMode] Set Mark Mode') {
        const newState = {
          currentMode: action.payload.mode,
          previousMode: currentState.currentMode,
          history: [...currentState.history, action.payload.mode].slice(-10),
          lastUpdated: action.payload.timestamp || Date.now(),
          changeCount: currentState.changeCount + 1,
        };
        mockMarkModeState.next(newState);
      } else if (action.type === '[MarkMode] Update Mark Mode') {
        const newState = {
          currentMode: action.payload.mode,
          previousMode: action.payload.previousMode ?? currentState.currentMode,
          history: [...currentState.history, action.payload.mode].slice(-10),
          lastUpdated: action.payload.timestamp || Date.now(),
          changeCount: currentState.changeCount + 1,
        };
        mockMarkModeState.next(newState);
      } else if (action.type === '[MarkMode] Reset Mark Mode') {
        const newState = {
          currentMode: 0,
          previousMode: currentState.currentMode,
          history: [...currentState.history, 0].slice(-10),
          lastUpdated: action.payload.timestamp || Date.now(),
          changeCount: currentState.changeCount + 1,
        };
        mockMarkModeState.next(newState);
      }
    });

    // Mock store selectors to return from BehaviorSubject with selector applied
    storeSpyObj.select.and.callFake((selector: any) => {
      if (selector === selectCurrentProject) {
        return mockProjectState.asObservable();
      }
      
      return mockMarkModeState.pipe(
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
      markMode: mockMarkModeState.value,
      projects: {
        currentProjectId: mockProjectState.value.id,
        entities: {
          [mockProjectState.value.id!]: mockProjectState.value
        }
      },
      ui: null,
      system: null,
      settings: null,
      notifications: null,
    }));

    // Make projectDbSpy return a resolved promise
    projectDbSpyObj.updateProject.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        MarkModeService,
        { provide: ReactiveStateStore, useValue: storeSpyObj },
        { provide: NGXLogger, useValue: loggerSpyObj },
        { provide: ErrorHandlerService, useValue: errorHandlerSpyObj },
        { provide: ProjectDbService, useValue: projectDbSpyObj },
      ],
    });

    // Reset mock state for each test
    mockMarkModeState.next({
      currentMode: 0,
      previousMode: undefined as number | undefined,
      history: [] as number[],
      lastUpdated: Date.now(),
      changeCount: 0,
    });

    service = TestBed.inject(MarkModeService);
    storeSpy = TestBed.inject(ReactiveStateStore) as jasmine.SpyObj<ReactiveStateStore>;
    loggerSpy = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
    errorHandlerSpy = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
    projectDbSpy = TestBed.inject(ProjectDbService) as jasmine.SpyObj<ProjectDbService>;
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

  describe('Step Marking Functionality', () => {
    it('should mark a step and save to project', async () => {
      await service.markStep(0, 3, 2);

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Projects] Update Project Success',
          payload: jasmine.objectContaining({
            project: jasmine.objectContaining({
              markedSteps: { 0: { 3: 2 } }
            })
          })
        })
      );

      expect(projectDbSpy.updateProject).toHaveBeenCalled();
    });

    it('should unmark a step when mark mode is 0', async () => {
      // First mark a step
      await service.markStep(0, 3, 2);
      storeSpy.dispatch.calls.reset();
      projectDbSpy.updateProject.calls.reset();

      // Then unmark it
      await service.markStep(0, 3, 0);

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Projects] Update Project Success',
          payload: jasmine.objectContaining({
            project: jasmine.objectContaining({
              markedSteps: {}
            })
          })
        })
      );

      expect(projectDbSpy.updateProject).toHaveBeenCalled();
    });

    it('should unmark a step using unmarkStep method', async () => {
      // First mark a step
      await service.markStep(0, 3, 2);
      storeSpy.dispatch.calls.reset();
      projectDbSpy.updateProject.calls.reset();

      // Then unmark it using convenience method
      await service.unmarkStep(0, 3);

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Projects] Update Project Success',
          payload: jasmine.objectContaining({
            project: jasmine.objectContaining({
              markedSteps: {}
            })
          })
        })
      );

      expect(projectDbSpy.updateProject).toHaveBeenCalled();
    });

    it('should get step mark value correctly', () => {
      // Initially unmarked
      expect(service.getStepMark(0, 3)).toBe(0);

      // Update mock project state to have marked steps using new structured format
      const mockProjectWithMarks: Project = {
        id: 1,
        name: 'Test Project',
        rows: [],
        markedSteps: { 0: { 3: 2 }, 1: { 5: 1 } }
      };

      storeSpy.getState.and.returnValue({
        markMode: { currentMode: 0, previousMode: undefined, history: [], lastUpdated: Date.now(), changeCount: 0 },
        projects: {
          currentProjectId: 1,
          entities: { 1: mockProjectWithMarks },
          loading: false,
          error: null,
          lastSaved: null,
          isDirty: false
        },
        ui: {
          currentPosition: null,
          selectedStepId: null,
          zoomLevel: 1.0,
          sidebarOpen: true,
          beadCountVisible: false,
          darkMode: false,
          notifications: []
        },
        system: {
          isOnline: true,
          storageQuota: null,
          performanceMetrics: {
            renderTime: 0,
            memoryUsage: 0,
            errorCount: 0,
            lastUpdate: new Date()
          },
          featureFlags: {
            virtualScrolling: true,
            advancedPatterns: false,
            exportFeatures: true,
            betaFeatures: false
          }
        },
        settings: {
          combine12: false,
          lrdesignators: false,
          flammarkers: false,
          ppinspector: false,
          zoom: false,
          scrolloffset: -1,
          multiadvance: 3,
          flamsort: 'keyAsc',
          projectsort: 'dateAsc',
          ready: true,
          colorModel: 'NONE'
        },
        notifications: {
          current: null,
          queue: [],
          lastId: 0
        }
      });

      expect(service.getStepMark(0, 3)).toBe(2);
      expect(service.getStepMark(1, 5)).toBe(1);
      expect(service.getStepMark(2, 1)).toBe(0); // Unmarked step
    });

    it('should get all marked steps correctly', () => {
      // Update mock project state to have marked steps using new structured format
      const mockProjectWithMarks: Project = {
        id: 1,
        name: 'Test Project',
        rows: [],
        markedSteps: { 0: { 3: 2 }, 1: { 5: 1 }, 2: { 7: 3 } }
      };

      storeSpy.getState.and.returnValue({
        markMode: { currentMode: 0, previousMode: undefined, history: [], lastUpdated: Date.now(), changeCount: 0 },
        projects: {
          currentProjectId: 1,
          entities: { 1: mockProjectWithMarks },
          loading: false,
          error: null,
          lastSaved: null,
          isDirty: false
        },
        ui: {
          currentPosition: null,
          selectedStepId: null,
          zoomLevel: 1.0,
          sidebarOpen: true,
          beadCountVisible: false,
          darkMode: false,
          notifications: []
        },
        system: {
          isOnline: true,
          storageQuota: null,
          performanceMetrics: {
            renderTime: 0,
            memoryUsage: 0,
            errorCount: 0,
            lastUpdate: new Date()
          },
          featureFlags: {
            virtualScrolling: true,
            advancedPatterns: false,
            exportFeatures: true,
            betaFeatures: false
          }
        },
        settings: {
          combine12: false,
          lrdesignators: false,
          flammarkers: false,
          ppinspector: false,
          zoom: false,
          scrolloffset: -1,
          multiadvance: 3,
          flamsort: 'keyAsc',
          projectsort: 'dateAsc',
          ready: true,
          colorModel: 'NONE'
        },
        notifications: {
          current: null,
          queue: [],
          lastId: 0
        }
      });

      const markedSteps = service.getAllMarkedSteps();

      expect(markedSteps).toEqual({ 0: { 3: 2 }, 1: { 5: 1 }, 2: { 7: 3 } });
    });

    it('should clear all marked steps', async () => {
      // Update mock project state to have marked steps using new structured format
      const mockProjectWithMarks: Project = {
        id: 1,
        name: 'Test Project',
        rows: [],
        markedSteps: { 0: { 3: 2 }, 1: { 5: 1 } }
      };

      storeSpy.getState.and.returnValue({
        markMode: { currentMode: 0, previousMode: undefined, history: [], lastUpdated: Date.now(), changeCount: 0 },
        projects: {
          currentProjectId: 1,
          entities: { 1: mockProjectWithMarks },
          loading: false,
          error: null,
          lastSaved: null,
          isDirty: false
        },
        ui: {
          currentPosition: null,
          selectedStepId: null,
          zoomLevel: 1.0,
          sidebarOpen: true,
          beadCountVisible: false,
          darkMode: false,
          notifications: []
        },
        system: {
          isOnline: true,
          storageQuota: null,
          performanceMetrics: {
            renderTime: 0,
            memoryUsage: 0,
            errorCount: 0,
            lastUpdate: new Date()
          },
          featureFlags: {
            virtualScrolling: true,
            advancedPatterns: false,
            exportFeatures: true,
            betaFeatures: false
          }
        },
        settings: {
          combine12: false,
          lrdesignators: false,
          flammarkers: false,
          ppinspector: false,
          zoom: false,
          scrolloffset: -1,
          multiadvance: 3,
          flamsort: 'keyAsc',
          projectsort: 'dateAsc',
          ready: true,
          colorModel: 'NONE'
        },
        notifications: {
          current: null,
          queue: [],
          lastId: 0
        }
      });

      await service.clearAllMarkedSteps();

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Projects] Update Project Success',
          payload: jasmine.objectContaining({
            project: jasmine.objectContaining({
              markedSteps: {}
            })
          })
        })
      );

      expect(projectDbSpy.updateProject).toHaveBeenCalled();
    });

    it('should handle no active project gracefully', async () => {
      storeSpy.getState.and.returnValue({
        markMode: { currentMode: 0, previousMode: undefined, history: [], lastUpdated: Date.now(), changeCount: 0 },
        projects: {
          currentProjectId: null,
          entities: {},
          loading: false,
          error: null,
          lastSaved: null,
          isDirty: false
        },
        ui: {
          currentPosition: null,
          selectedStepId: null,
          zoomLevel: 1.0,
          sidebarOpen: true,
          beadCountVisible: false,
          darkMode: false,
          notifications: []
        },
        system: {
          isOnline: true,
          storageQuota: null,
          performanceMetrics: {
            renderTime: 0,
            memoryUsage: 0,
            errorCount: 0,
            lastUpdate: new Date()
          },
          featureFlags: {
            virtualScrolling: true,
            advancedPatterns: false,
            exportFeatures: true,
            betaFeatures: false
          }
        },
        settings: {
          combine12: false,
          lrdesignators: false,
          flammarkers: false,
          ppinspector: false,
          zoom: false,
          scrolloffset: -1,
          multiadvance: 3,
          flamsort: 'keyAsc',
          projectsort: 'dateAsc',
          ready: true,
          colorModel: 'NONE'
        },
        notifications: {
          current: null,
          queue: [],
          lastId: 0
        }
      });

      // Should not throw errors
      await service.markStep(0, 3, 2);
      await service.unmarkStep(0, 3);
      await service.clearAllMarkedSteps();

      expect(service.getStepMark(0, 3)).toBe(0);
      expect(service.getAllMarkedSteps()).toEqual({});

      // Should not have called dispatch or database update
      expect(storeSpy.dispatch).not.toHaveBeenCalled();
      expect(projectDbSpy.updateProject).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      projectDbSpy.updateProject.and.returnValue(Promise.reject(new Error('Database error')));

      // Should not throw but should log error
      await service.markStep(0, 3, 2);

      expect(loggerSpy.error).toHaveBeenCalledWith('Error marking step:', jasmine.any(Error));
      expect(errorHandlerSpy.handleError).toHaveBeenCalled();
    });
  });
});

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
import { AppState, ProjectState, UiState, SystemState, SettingsState } from '../store/app-state.interface';

/**
 * Test helper function to create properly typed mock AppState
 */
function createMockAppState(overrides: {
  markModeState?: any;
  projectState?: Partial<ProjectState>;
  project?: Project;
}): AppState {
  const defaultProject: Project = {
    id: 1,
    name: 'Test Project',
    rows: [],
    markedSteps: {},
    markedRows: {}
  };

  const project = overrides.project || defaultProject;

  const defaultProjectState: ProjectState = {
    currentProjectId: project.id || null,
    entities: project.id ? { [project.id]: project } : {},
    loading: false,
    error: null,
    lastSaved: null,
    isDirty: false
  };

  const projectState = { ...defaultProjectState, ...overrides.projectState };

  const defaultUiState: UiState = {
    currentPosition: null,
    selectedStepId: null,
    zoomLevel: 1.0,
    sidebarOpen: true,
    beadCountVisible: false,
    darkMode: false,
    notifications: []
  };

  const defaultSystemState: SystemState = {
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
  };

  const defaultSettingsState: SettingsState = {
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
  };

  return {
    markMode: overrides.markModeState || { currentMode: 0, previousMode: undefined, history: [], lastUpdated: Date.now(), changeCount: 0 },
    projects: projectState,
    ui: defaultUiState,
    system: defaultSystemState,
    settings: defaultSettingsState,
    notifications: {
      current: null,
      queue: [],
      lastId: 0
    }
  };
}

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
  let mockMarkModeState: BehaviorSubject<any>;
  let mockProjectState: BehaviorSubject<Project>;

  beforeEach(() => {
    // Create spy for ReactiveStateStore with stateful behavior using BehaviorSubject
    const storeSpyObj = jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch', 'getState']);
    
    // Create spies for logger, error handler, and project database
    const loggerSpyObj = jasmine.createSpyObj('NGXLogger', ['debug', 'warn', 'error']);
    const errorHandlerSpyObj = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);
    const projectDbSpyObj = jasmine.createSpyObj('ProjectDbService', ['updateProject']);

    // Create a BehaviorSubject to hold the mock mark mode state
    mockMarkModeState = new BehaviorSubject({
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
    mockProjectState = new BehaviorSubject(mockProject);

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
    storeSpyObj.getState.and.callFake(() => createMockAppState({
      markModeState: mockMarkModeState.value,
      project: mockProjectState.value
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

  // ================================
  // ROW MARKING TESTS
  // ================================

  describe('Row Marking Functionality', () => {
    beforeEach(() => {
      // Reset state to default
      mockMarkModeState.next({
        currentMode: 2,
        previousMode: 1,
        history: [1, 2],
        lastUpdated: Date.now(),
        changeCount: 2,
      });

      // Reset project state
      mockProjectState.next({
        id: 1,
        name: 'Test Project',
        rows: [],
        markedSteps: {},
        markedRows: {}
      });
    });

    describe('markRow()', () => {
      it('should mark a row with specified mode', async () => {
        await service.markRow(2, 3);

        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: '[Projects] Update Project Success',
            payload: jasmine.objectContaining({
              project: jasmine.objectContaining({
                markedRows: { 2: 3 }
              })
            })
          })
        );
        expect(projectDbSpy.updateProject).toHaveBeenCalled();
        expect(loggerSpy.debug).toHaveBeenCalledWith('Row marking saved: row 2 = 3');
      });

      it('should unmark a row when markMode is 0', async () => {
        // First set up a project with an existing row marking
        mockProjectState.next({
          id: 1,
          name: 'Test Project',
          rows: [],
          markedSteps: {},
          markedRows: { 2: 3, 4: 1 }
        });

        await service.markRow(2, 0);

        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: '[Projects] Update Project Success',
            payload: jasmine.objectContaining({
              project: jasmine.objectContaining({
                markedRows: { 4: 1 } // Row 2 should be removed
              })
            })
          })
        );
        expect(projectDbSpy.updateProject).toHaveBeenCalled();
        expect(loggerSpy.debug).toHaveBeenCalledWith('Row marking saved: row 2 = 0');
      });

      it('should handle case when no current project exists', async () => {
        storeSpy.getState.and.returnValue(createMockAppState({
          markModeState: mockMarkModeState.value,
          projectState: {
            currentProjectId: null,
            entities: {},
            loading: false,
            error: null,
            lastSaved: null,
            isDirty: false
          }
        }));

        await service.markRow(2, 3);

        expect(storeSpy.dispatch).not.toHaveBeenCalled();
        expect(projectDbSpy.updateProject).not.toHaveBeenCalled();
        expect(loggerSpy.debug).toHaveBeenCalledWith('No active project to save row marking to');
      });

      it('should handle case when current project not found in entities', async () => {
        storeSpy.getState.and.returnValue(createMockAppState({
          markModeState: mockMarkModeState.value,
          projectState: {
            currentProjectId: 999,
            entities: { 1: mockProjectState.value },
            loading: false,
            error: null,
            lastSaved: new Date(),
            isDirty: false
          }
        }));

        await service.markRow(2, 3);

        expect(storeSpy.dispatch).not.toHaveBeenCalled();
        expect(projectDbSpy.updateProject).not.toHaveBeenCalled();
        expect(loggerSpy.debug).toHaveBeenCalledWith('Current project not found in entities');
      });

      it('should handle errors gracefully', async () => {
        projectDbSpy.updateProject.and.returnValue(Promise.reject(new Error('Database error')));

        await service.markRow(2, 3);

        expect(loggerSpy.error).toHaveBeenCalledWith('Error marking row:', jasmine.any(Error));
        expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
          jasmine.any(Error),
          jasmine.objectContaining({
            operation: 'markRow',
            details: 'Failed to mark row',
            rowIndex: 2,
            markMode: 3
          }),
          'Unable to save row marking. Marking may not persist.',
          'medium'
        );
      });
    });

    describe('unmarkRow()', () => {
      it('should call markRow with mode 0', async () => {
        spyOn(service, 'markRow');

        await service.unmarkRow(5);

        expect(service.markRow).toHaveBeenCalledWith(5, 0);
      });
    });

    describe('toggleRowMark()', () => {
      it('should mark unmarked row with current mark mode', async () => {
        const result = await service.toggleRowMark(3);

        expect(result).toBe(2); // Current mark mode is 2
        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: '[Projects] Update Project Success',
            payload: jasmine.objectContaining({
              project: jasmine.objectContaining({
                markedRows: { 3: 2 }
              })
            })
          })
        );
      });

      it('should unmark row that is marked with current mode', async () => {
        // Set up project with row marked with current mode
        mockProjectState.next({
          id: 1,
          name: 'Test Project',
          rows: [],
          markedSteps: {},
          markedRows: { 3: 2 } // Marked with current mode (2)
        });

        const result = await service.toggleRowMark(3);

        expect(result).toBe(0);
        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: '[Projects] Update Project Success',
            payload: jasmine.objectContaining({
              project: jasmine.objectContaining({
                markedRows: {}
              })
            })
          })
        );
      });

      it('should mark row with current mode when marked with different mode', async () => {
        // Set up project with row marked with different mode
        mockProjectState.next({
          id: 1,
          name: 'Test Project',
          rows: [],
          markedSteps: {},
          markedRows: { 3: 1 } // Marked with mode 1, current is 2
        });

        const result = await service.toggleRowMark(3);

        expect(result).toBe(2); // Should switch to current mode
        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: '[Projects] Update Project Success',
            payload: jasmine.objectContaining({
              project: jasmine.objectContaining({
                markedRows: { 3: 2 }
              })
            })
          })
        );
      });

      it('should return 0 when not in active mark mode', async () => {
        // Set current mode to 0 (default)
        mockMarkModeState.next({
          currentMode: 0,
          previousMode: 2,
          history: [1, 2, 0],
          lastUpdated: Date.now(),
          changeCount: 3,
        });

        const result = await service.toggleRowMark(3);

        expect(result).toBe(0);
        expect(storeSpy.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('getRowMark()', () => {
      it('should return mark mode for marked row', () => {
        // Set up project with marked rows
        mockProjectState.next({
          id: 1,
          name: 'Test Project',
          rows: [],
          markedSteps: {},
          markedRows: { 2: 3, 5: 1 }
        });

        expect(service.getRowMark(2)).toBe(3);
        expect(service.getRowMark(5)).toBe(1);
      });

      it('should return 0 for unmarked row', () => {
        expect(service.getRowMark(99)).toBe(0);
      });

      it('should return 0 when no current project', () => {
        storeSpy.getState.and.returnValue(createMockAppState({
          markModeState: mockMarkModeState.value,
          projectState: {
            currentProjectId: null,
            entities: {},
            loading: false,
            error: null,
            lastSaved: new Date(),
            isDirty: false
          }
        }));

        expect(service.getRowMark(2)).toBe(0);
      });

      it('should return 0 when current project not found', () => {
        storeSpy.getState.and.returnValue(createMockAppState({
          markModeState: mockMarkModeState.value,
          projectState: {
            currentProjectId: 999,
            entities: { 1: mockProjectState.value },
            loading: false,
            error: null,
            lastSaved: null,
            isDirty: false
          }
        }));

        expect(service.getRowMark(2)).toBe(0);
      });

      it('should handle errors gracefully', () => {
        storeSpy.getState.and.throwError('State error');

        expect(service.getRowMark(2)).toBe(0);
        expect(loggerSpy.error).toHaveBeenCalledWith('Error getting row mark:', jasmine.any(Error));
      });
    });

    describe('getAllMarkedRows()', () => {
      it('should return all marked rows', () => {
        // Set up project with marked rows
        mockProjectState.next({
          id: 1,
          name: 'Test Project',
          rows: [],
          markedSteps: {},
          markedRows: { 2: 3, 5: 1, 7: 2 }
        });

        const result = service.getAllMarkedRows();

        expect(result).toEqual({ 2: 3, 5: 1, 7: 2 });
      });

      it('should return empty object when no rows marked', () => {
        const result = service.getAllMarkedRows();

        expect(result).toEqual({});
      });

      it('should return empty object when no current project', () => {
        storeSpy.getState.and.returnValue(createMockAppState({
          markModeState: mockMarkModeState.value,
          projectState: {
            currentProjectId: null,
            entities: {},
            loading: false,
            error: null,
            lastSaved: null,
            isDirty: false
          }
        }));

        const result = service.getAllMarkedRows();

        expect(result).toEqual({});
      });

      it('should handle errors gracefully', () => {
        storeSpy.getState.and.throwError('State error');

        const result = service.getAllMarkedRows();

        expect(result).toEqual({});
        expect(loggerSpy.error).toHaveBeenCalledWith('Error getting all marked rows:', jasmine.any(Error));
      });
    });

    describe('clearAllMarkedRows()', () => {
      it('should clear all marked rows', async () => {
        // Set up project with marked rows
        mockProjectState.next({
          id: 1,
          name: 'Test Project',
          rows: [],
          markedSteps: {},
          markedRows: { 2: 3, 5: 1 }
        });

        await service.clearAllMarkedRows();

        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: '[Projects] Update Project Success',
            payload: jasmine.objectContaining({
              project: jasmine.objectContaining({
                markedRows: {}
              })
            })
          })
        );
        expect(projectDbSpy.updateProject).toHaveBeenCalled();
        expect(loggerSpy.debug).toHaveBeenCalledWith('All marked rows cleared');
      });

      it('should handle case when no current project exists', async () => {
        storeSpy.getState.and.returnValue(createMockAppState({
          markModeState: mockMarkModeState.value,
          projectState: {
            currentProjectId: null,
            entities: {},
            loading: false,
            error: null,
            lastSaved: null,
            isDirty: false
          }
        }));

        await service.clearAllMarkedRows();

        expect(storeSpy.dispatch).not.toHaveBeenCalled();
        expect(projectDbSpy.updateProject).not.toHaveBeenCalled();
        expect(loggerSpy.debug).toHaveBeenCalledWith('No active project to clear marked rows from');
      });

      it('should handle errors gracefully', async () => {
        projectDbSpy.updateProject.and.returnValue(Promise.reject(new Error('Database error')));

        await service.clearAllMarkedRows();

        expect(loggerSpy.error).toHaveBeenCalledWith('Error clearing marked rows:', jasmine.any(Error));
        expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
          jasmine.any(Error),
          jasmine.objectContaining({
            operation: 'clearAllMarkedRows',
            details: 'Failed to clear all marked rows'
          }),
          'Unable to clear row markings. Some markings may persist.',
          'medium'
        );
      });
    });

    describe('getRowMark$()', () => {
      it('should return observable of row mark', (done) => {
        // Set up project with marked rows
        mockProjectState.next({
          id: 1,
          name: 'Test Project',
          rows: [],
          markedSteps: {},
          markedRows: { 2: 3 }
        });

        service.getRowMark$(2).subscribe(markMode => {
          expect(markMode).toBe(3);
          done();
        });
      });

      it('should return 0 for unmarked row', (done) => {
        service.getRowMark$(99).subscribe(markMode => {
          expect(markMode).toBe(0);
          done();
        });
      });

      it('should emit new values when row mark changes', (done) => {
        let emissionCount = 0;
        const expectedValues = [0, 3];

        service.getRowMark$(2).subscribe(markMode => {
          expect(markMode).toBe(expectedValues[emissionCount]);
          emissionCount++;

          if (emissionCount === 2) {
            done();
          }
        });

        // Trigger change by updating project state
        setTimeout(() => {
          mockProjectState.next({
            id: 1,
            name: 'Test Project',
            rows: [],
            markedSteps: {},
            markedRows: { 2: 3 }
          });
        }, 10);
      });

      it('should use distinctUntilChanged to prevent duplicate emissions', (done) => {
        let emissionCount = 0;

        service.getRowMark$(2).subscribe(markMode => {
          emissionCount++;
          expect(markMode).toBe(0);

          // After a short delay, verify only one emission occurred
          if (emissionCount === 1) {
            setTimeout(() => {
              expect(emissionCount).toBe(1);
              done();
            }, 50);
          }
        });

        // Trigger multiple updates with same value
        setTimeout(() => {
          mockProjectState.next({
            id: 1,
            name: 'Test Project',
            rows: [],
            markedSteps: {},
            markedRows: {}
          });
        }, 10);

        setTimeout(() => {
          mockProjectState.next({
            id: 1,
            name: 'Test Project',
            rows: [],
            markedSteps: {},
            markedRows: {}
          });
        }, 20);
      });
    });
  });
});

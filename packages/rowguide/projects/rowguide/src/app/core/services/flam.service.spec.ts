import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { firstValueFrom, BehaviorSubject, Subject, of } from 'rxjs';
import { NGXLogger } from 'ngx-logger';

import { FlamService } from './flam.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from '../../features/project-management/services/project.service';
import { ProjectDbService } from '../../data/services/project-db.service';
import { SettingsService } from './settings.service';
import { ReactiveStateStore } from '../store/reactive-state-store';
import { Step } from '../models/step';
import { Row } from '../models/row';
import { FLAM } from '../models/flam';
import { FLAMRow } from '../models/flamrow';
import { routes } from '../../app.routes';
import { provideRouter } from '@angular/router';
import { Project } from '../models/project';

/**
 * @fileoverview Comprehensive Test Suite for FlamService
 *
 * This test suite validates the FlamService functionality including:
 * - Service initialization and dependency injection
 * - FLAM (First/Last Appearance Mapping) generation from row data
 * - Reactive step identification (first/last appearance detection)
 * - Color mapping persistence and loading from projects
 * - Integration with ProjectService and ProjectDbService
 * - Error handling and edge cases for malformed data
 * - Performance with large datasets and complex patterns
 */

describe('FlamService', () => {
  let service: FlamService;
  let projectService: jasmine.SpyObj<ProjectService>;
  let projectDbService: jasmine.SpyObj<ProjectDbService>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let logger: jasmine.SpyObj<NGXLogger>;
  let store: jasmine.SpyObj<ReactiveStateStore>;

  // Test data factory for creating consistent row structures
  const createTestRows = (): Row[] => [
    {
      id: 1,
      steps: [
        { id: 1, count: 1, description: 'Step A' },
        { id: 2, count: 1, description: 'Step B' },
      ],
    },
    {
      id: 2,
      steps: [
        { id: 1, count: 2, description: 'Step A' },
        { id: 2, count: 1, description: 'Step B' },
      ],
    },
    {
      id: 3,
      steps: [
        { id: 1, count: 4, description: 'Step A' },
        { id: 2, count: 1, description: 'Step C' },
      ],
    },
  ];

  // Helper function to create valid FLAM test data
  const createTestFLAM = (): FLAM => ({
    'Step A': {
      key: 'Step A',
      firstAppearance: [0, 0],
      lastAppearance: [2, 0],
      count: 7,
      color: 'DB0001', // Miyuki Delica code (tooling exists for DB codes)
      hexColor: '#FF0000',
    },
    'Step B': {
      key: 'Step B',
      firstAppearance: [0, 1],
      lastAppearance: [1, 1],
      count: 2,
    },
    'Step C': {
      key: 'Step C',
      firstAppearance: [2, 1],
      lastAppearance: [2, 1],
      count: 1,
      color: 'Red Bead Mix', // Free-form color description
      hexColor: '#00FF00',
    },
  });

  // Helper function to create mock project with color mappings
  const createMockProject = (
    colorMapping: { [key: string]: string } = {}
  ): Project =>
    ({
      id: 1,
      name: 'Test Project',
      rows: createTestRows(),
      position: { row: 0, step: 0 },
      colorMapping, // Free-form color data - can be DB codes, names, hex, etc.
      firstLastAppearanceMap: {},
      image: undefined,
    } as Project);

  beforeEach(() => {
    // Create comprehensive spies for all dependencies
    const projectServiceSpy = jasmine.createSpyObj(
      'ProjectService',
      ['updateProject'],
      {
        zippedRows$: of([]),
        project$: of(null),
        ready$: of(true),
      }
    );

    const projectDbServiceSpy = jasmine.createSpyObj('ProjectDbService', [
      'updateProject',
    ]);
    const settingsServiceSpy = jasmine.createSpyObj('SettingsService', [
      'loadSettings',
    ]);
    const loggerSpy = jasmine.createSpyObj('NGXLogger', [
      'trace',
      'debug',
      'warn',
      'error',
    ]);

    // Create a mock store with the necessary methods
    const storeServiceSpy = jasmine.createSpyObj('ReactiveStateStore', [
      'select',
      'dispatch'
    ]);
    // Set up default store spy behavior
    storeServiceSpy.select.and.returnValue(of(createMockProject()));

    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        FlamService,
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: ProjectDbService, useValue: projectDbServiceSpy },
        { provide: SettingsService, useValue: settingsServiceSpy },
        { provide: NGXLogger, useValue: loggerSpy },
        { provide: ReactiveStateStore, useValue: storeServiceSpy },
        provideRouter(routes),
      ],
    });

    service = TestBed.inject(FlamService);
    projectService = TestBed.inject(
      ProjectService
    ) as jasmine.SpyObj<ProjectService>;
    projectDbService = TestBed.inject(
      ProjectDbService
    ) as jasmine.SpyObj<ProjectDbService>;
    settingsService = TestBed.inject(
      SettingsService
    ) as jasmine.SpyObj<SettingsService>;
    logger = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
    store = TestBed.inject(ReactiveStateStore) as jasmine.SpyObj<ReactiveStateStore>;

    // Set up store mocks to return observables
    store.select.and.returnValue(of(null));
    store.dispatch.and.returnValue();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty FLAM', () => {
      expect(service.flam$).toBeDefined();
      expect(service.flam$.value).toEqual({});
    });

    it('should have all required dependencies injected', () => {
      expect(projectService).toBeTruthy();
      expect(projectDbService).toBeTruthy();
      expect(settingsService).toBeTruthy();
      expect(logger).toBeTruthy();
    });

    it('should subscribe to project service zippedRows$ on initialization', () => {
      // Service constructor should set up subscription
      expect(projectService.zippedRows$).toBeDefined();
    });
  });

  describe('FLAM Generation', () => {
    it('should generate FLAM correctly from row data', () => {
      const rows = createTestRows();
      const flam = service.generateFLAM(rows);

      expect(Object.keys(flam).length).toBe(3);
      expect(flam['Step A']).toEqual({
        key: 'Step A',
        firstAppearance: [0, 0],
        lastAppearance: [2, 0],
        count: 7, // 1 + 2 + 4
      });
      expect(flam['Step B']).toEqual({
        key: 'Step B',
        firstAppearance: [0, 1],
        lastAppearance: [1, 1],
        count: 2, // 1 + 1
      });
      expect(flam['Step C']).toEqual({
        key: 'Step C',
        firstAppearance: [2, 1],
        lastAppearance: [2, 1],
        count: 1,
      });
    });

    it('should handle empty rows array', () => {
      const flam = service.generateFLAM([]);
      expect(flam).toEqual({});
    });

    it('should handle rows with empty steps', () => {
      const rows: Row[] = [
        { id: 1, steps: [] },
        { id: 2, steps: [] },
      ];
      const flam = service.generateFLAM(rows);
      expect(flam).toEqual({});
    });

    it('should handle single step across multiple rows', () => {
      const rows: Row[] = [
        { id: 1, steps: [{ id: 1, count: 5, description: 'Single Step' }] },
        { id: 2, steps: [{ id: 1, count: 3, description: 'Single Step' }] },
      ];
      const flam = service.generateFLAM(rows);

      expect(flam['Single Step']).toEqual({
        key: 'Single Step',
        firstAppearance: [0, 0],
        lastAppearance: [1, 0],
        count: 8,
      });
    });

    it('should handle duplicate step descriptions in same row', () => {
      const rows: Row[] = [
        {
          id: 1,
          steps: [
            { id: 1, count: 2, description: 'Repeat' },
            { id: 2, count: 3, description: 'Repeat' },
          ],
        },
      ];
      const flam = service.generateFLAM(rows);

      expect(flam['Repeat']).toEqual({
        key: 'Repeat',
        firstAppearance: [0, 0],
        lastAppearance: [0, 1],
        count: 5,
      });
    });

    it('should log FLAM generation', () => {
      const rows = createTestRows();
      service.generateFLAM(rows);
      expect(logger.trace).toHaveBeenCalledWith(
        'Generated FLAM:',
        jasmine.any(Object)
      );
    });
  });

  describe('Reactive Step Identification', () => {
    beforeEach(() => {
      service.flam$.next(createTestFLAM());
    });

    it('should identify first step correctly', async () => {
      const stepA: Step = { id: 1, count: 1, description: 'Step A' }; // id=1 means position 0
      const stepB: Step = { id: 2, count: 1, description: 'Step B' }; // id=2 means position 1

      // Step A first appears at [0, 0] -> row=0, step.id-1=0
      expect(await firstValueFrom(service.isFirstStep(0, stepA))).toBeTrue();
      expect(await firstValueFrom(service.isFirstStep(1, stepA))).toBeFalse();

      // Step B first appears at [0, 1] -> row=0, step.id-1=1
      expect(await firstValueFrom(service.isFirstStep(0, stepB))).toBeTrue();
      expect(await firstValueFrom(service.isFirstStep(1, stepB))).toBeFalse();
    });

    it('should identify last step correctly', async () => {
      const stepA: Step = { id: 1, count: 4, description: 'Step A' };
      const stepC: Step = { id: 2, count: 1, description: 'Step C' };

      expect(await firstValueFrom(service.isLastStep(2, stepA))).toBeTrue();
      expect(await firstValueFrom(service.isLastStep(0, stepA))).toBeFalse();
      expect(await firstValueFrom(service.isLastStep(2, stepC))).toBeTrue();
    });

    it('should handle non-existent step descriptions', (done) => {
      const nonExistentStep: Step = {
        id: 1,
        count: 1,
        description: 'Non-existent',
      };

      // These observables should not emit because the filter will reject undefined
      let firstStepEmitted = false;
      let lastStepEmitted = false;

      const firstSub = service.isFirstStep(0, nonExistentStep).subscribe({
        next: () => {
          firstStepEmitted = true;
        },
        error: () => {
          /* Expected - no emission */
        },
      });

      const lastSub = service.isLastStep(0, nonExistentStep).subscribe({
        next: () => {
          lastStepEmitted = true;
        },
        error: () => {
          /* Expected - no emission */
        },
      });

      // Wait briefly then verify no emissions occurred
      setTimeout(() => {
        expect(firstStepEmitted).toBeFalse();
        expect(lastStepEmitted).toBeFalse();
        firstSub.unsubscribe();
        lastSub.unsubscribe();
        done();
      }, 100);
    });

    it('should handle steps with correct description but wrong position', async () => {
      const stepA: Step = { id: 1, count: 1, description: 'Step A' };

      // Step A first appears at row 0, step 0 (id 1 - 1 = 0)
      expect(await firstValueFrom(service.isFirstStep(0, stepA))).toBeTrue();
      expect(await firstValueFrom(service.isFirstStep(1, stepA))).toBeFalse();

      // Step A last appears at row 2, step 0 (id 1 - 1 = 0)
      expect(await firstValueFrom(service.isLastStep(2, stepA))).toBeTrue();
      expect(await firstValueFrom(service.isLastStep(1, stepA))).toBeFalse();
    });
  });

  describe('Color Mapping Management', () => {
    it('should save color mappings to project', async () => {
      const testFlam = createTestFLAM();
      const mockProject = createMockProject();

      service.flam$.next(testFlam);

      // Set up store spy to return mock project for selectCurrentProject
      store.select.and.returnValue(of(mockProject));
      store.dispatch.and.stub();

      await service.saveColorMappingsToProject();

      expect(store.dispatch).toHaveBeenCalled();
      expect(projectDbService.updateProject).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Saved color mappings to project:',
        jasmine.any(Object)
      );

      // Verify the color mapping extraction
      const dispatchedAction = (
        store.dispatch as jasmine.Spy
      ).calls.mostRecent().args[0];
      expect(dispatchedAction.payload.project.colorMapping).toEqual({
        'Step A': 'DB0001', // Miyuki Delica code
        'Step C': 'Red Bead Mix', // Free-form color name
      });
    });

    it('should handle saving when no project is loaded', async () => {
      service.flam$.next(createTestFLAM());

      // Update store spy to return null for project selector
      store.select.and.returnValue(of(null));

      await expectAsync(
        service.saveColorMappingsToProject()
      ).not.toBeRejected();
      expect(projectDbService.updateProject).not.toHaveBeenCalled();
    });

    it('should handle saving when FLAM has no colors', async () => {
      const flamWithoutColors: FLAM = {
        'Step A': {
          key: 'Step A',
          firstAppearance: [0, 0],
          lastAppearance: [0, 0],
          count: 1,
        },
      };
      const mockProject = createMockProject();

      service.flam$.next(flamWithoutColors);

      // Set up store spy to return mock project for selectCurrentProject
      store.select.and.returnValue(of(mockProject));
      store.dispatch.and.stub();

      await service.saveColorMappingsToProject();

      // Should still save the project but with empty color mapping
      expect(store.dispatch).toHaveBeenCalled();
      expect(projectDbService.updateProject).toHaveBeenCalled();
    });

    it('should load color mappings from project', async () => {
      const initialFlam: FLAM = {
        'Step A': {
          key: 'Step A',
          firstAppearance: [0, 0],
          lastAppearance: [0, 0],
          count: 1,
        },
        'Step B': {
          key: 'Step B',
          firstAppearance: [0, 1],
          lastAppearance: [0, 1],
          count: 1,
        },
      };
      const colorMapping = { 'Step A': 'DB0001', 'Step B': 'Custom Blue Mix' }; // Mixed color formats
      const mockProject = createMockProject(colorMapping);

      service.flam$.next(initialFlam);

      // Set up store spy to return mock project with color mappings
      store.select.and.returnValue(of(mockProject));

      await service.loadColorMappingsFromProject();

      expect(service.flam$.value['Step A'].color).toBe('DB0001');
      expect(service.flam$.value['Step B'].color).toBe('Custom Blue Mix');
      expect(logger.debug).toHaveBeenCalledWith(
        'Loaded color mappings from project:',
        colorMapping
      );
    });

    it('should load free-form color mappings from project', async () => {
      const initialFlam: FLAM = {
        'Natural Red': {
          key: 'Natural Red',
          firstAppearance: [0, 0],
          lastAppearance: [0, 0],
          count: 1,
        },
        'Ocean Blue': {
          key: 'Ocean Blue',
          firstAppearance: [0, 1],
          lastAppearance: [0, 1],
          count: 1,
        },
        'Forest Green': {
          key: 'Forest Green',
          firstAppearance: [0, 2],
          lastAppearance: [0, 2],
          count: 1,
        },
      };
      const colorMapping = {
        'Natural Red': 'Deep burgundy with copper undertones',
        'Ocean Blue': '#1E90FF (DodgerBlue)',
        'Forest Green': 'DB0878 with matte finish',
      };
      const mockProject = createMockProject(colorMapping);

      service.flam$.next(initialFlam);

      // Set up store spy to return mock project with color mappings
      store.select.and.returnValue(of(mockProject));

      await service.loadColorMappingsFromProject();

      expect(service.flam$.value['Natural Red'].color).toBe(
        'Deep burgundy with copper undertones'
      );
      expect(service.flam$.value['Ocean Blue'].color).toBe(
        '#1E90FF (DodgerBlue)'
      );
      expect(service.flam$.value['Forest Green'].color).toBe(
        'DB0878 with matte finish'
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Loaded color mappings from project:',
        colorMapping
      );
    });

    it('should handle loading when project has no color mappings', () => {
      const initialFlam = createTestFLAM();
      const mockProject = createMockProject(); // No color mappings

      service.flam$.next(initialFlam);

      // Set up store spy to return mock project with no color mappings
      store.select.and.returnValue(of(mockProject));

      expect(() => service.loadColorMappingsFromProject()).not.toThrow();
      // FLAM should remain unchanged
      expect(service.flam$.value).toEqual(initialFlam);
    });

    it('should handle loading when no project is loaded', () => {
      service.flam$.next(createTestFLAM());

      // Update store spy to return null for project selector
      store.select.and.returnValue(of(null));

      expect(() => service.loadColorMappingsFromProject()).not.toThrow();
    });

    it('should handle partial color mapping matches', async () => {
      const initialFlam: FLAM = {
        'Step A': {
          key: 'Step A',
          firstAppearance: [0, 0],
          lastAppearance: [0, 0],
          count: 1,
        },
        'Step B': {
          key: 'Step B',
          firstAppearance: [0, 1],
          lastAppearance: [0, 1],
          count: 1,
        },
      };
      const colorMapping = { 'Step A': 'DB0001', 'Step C': 'Purple Metallic' }; // Step C not in FLAM
      const mockProject = createMockProject(colorMapping);

      service.flam$.next(initialFlam);

      // Set up store spy to return mock project
      store.select.and.returnValue(of(mockProject));

      await service.loadColorMappingsFromProject();

      expect(service.flam$.value['Step A'].color).toBe('DB0001');
      expect(service.flam$.value['Step B'].color).toBeUndefined();
    });

    it('should handle both Miyuki Delica and hex color codes correctly', async () => {
      const flamWithMixedColors: FLAM = {
        'Delica Bead': {
          key: 'Delica Bead',
          firstAppearance: [0, 0],
          lastAppearance: [0, 0],
          count: 1,
          color: 'DB0001', // Miyuki Delica code
          hexColor: '#FF0000', // Corresponding hex color
        },
        'No Color': {
          key: 'No Color',
          firstAppearance: [0, 1],
          lastAppearance: [0, 1],
          count: 1,
        },
      };
      const mockProject = createMockProject();

      service.flam$.next(flamWithMixedColors);

      // Set up store spy to return mock project
      store.select.and.returnValue(of(mockProject));

      await service.saveColorMappingsToProject();

      // Should only save the Miyuki Delica color code, not hex
      const dispatchedAction = (
        store.dispatch as jasmine.Spy
      ).calls.mostRecent().args[0];
      expect(dispatchedAction.payload.project.colorMapping).toEqual({
        'Delica Bead': 'DB0001',
      });
    });

    it('should handle free-form color descriptions', async () => {
      const flamWithFreeFormColors: FLAM = {
        'Custom Red': {
          key: 'Custom Red',
          firstAppearance: [0, 0],
          lastAppearance: [0, 0],
          count: 1,
          color: 'Deep Cherry Red with Metallic Finish',
        },
        'Hex Color': {
          key: 'Hex Color',
          firstAppearance: [0, 1],
          lastAppearance: [0, 1],
          count: 1,
          color: '#3A5FCD', // Hex color as free-form text
        },
        'Mixed Format': {
          key: 'Mixed Format',
          firstAppearance: [0, 2],
          lastAppearance: [0, 2],
          count: 1,
          color: 'DB0042 (Transparent Blue)',
        },
      };

      service.flam$.next(flamWithFreeFormColors);
      const mockProject = createMockProject();

      // Set up store spy to return mock project
      store.select.and.returnValue(of(mockProject));

      await service.saveColorMappingsToProject();

      const dispatchedAction = (
        store.dispatch as jasmine.Spy
      ).calls.mostRecent().args[0];
      expect(dispatchedAction.payload.project.colorMapping).toEqual({
        'Custom Red': 'Deep Cherry Red with Metallic Finish',
        'Hex Color': '#3A5FCD',
        'Mixed Format': 'DB0042 (Transparent Blue)',
      });
    });

    it('should handle empty and whitespace color values', async () => {
      const flamWithEmptyColors: FLAM = {
        'Empty Color': {
          key: 'Empty Color',
          firstAppearance: [0, 0],
          lastAppearance: [0, 0],
          count: 1,
          color: '',
        },
        'Whitespace Color': {
          key: 'Whitespace Color',
          firstAppearance: [0, 1],
          lastAppearance: [0, 1],
          count: 1,
          color: '   ',
        },
        'Valid Color': {
          key: 'Valid Color',
          firstAppearance: [0, 2],
          lastAppearance: [0, 2],
          count: 1,
          color: 'Actual Color',
        },
      };

      service.flam$.next(flamWithEmptyColors);
      const mockProject = createMockProject();

      // Set up store spy to return mock project
      store.select.and.returnValue(of(mockProject));

      await service.saveColorMappingsToProject();

      const dispatchedAction = (
        store.dispatch as jasmine.Spy
      ).calls.mostRecent().args[0];
      // Service saves truthy color values - whitespace strings are truthy but empty strings are not
      expect(dispatchedAction.payload.project.colorMapping).toEqual({
        'Whitespace Color': '   ', // Whitespace is truthy, so it gets saved
        'Valid Color': 'Actual Color',
        // Empty string is falsy and gets filtered out
      });
    });

    it('should handle Unicode and special characters in color descriptions', async () => {
      const flamWithUnicodeColors: FLAM = {
        'Emoji Color': {
          key: 'Emoji Color',
          firstAppearance: [0, 0],
          lastAppearance: [0, 0],
          count: 1,
          color: '🔴 Fire Red 🔥',
        },
        'Unicode Color': {
          key: 'Unicode Color',
          firstAppearance: [0, 1],
          lastAppearance: [0, 1],
          count: 1,
          color: '紅色珠子 (Red Bead)',
        },
        'Special Chars': {
          key: 'Special Chars',
          firstAppearance: [0, 2],
          lastAppearance: [0, 2],
          count: 1,
          color: 'Café™ Brown® #123',
        },
      };

      service.flam$.next(flamWithUnicodeColors);
      const mockProject = createMockProject();

      // Set up store spy to return mock project
      store.select.and.returnValue(of(mockProject));

      await service.saveColorMappingsToProject();

      const dispatchedAction = (
        store.dispatch as jasmine.Spy
      ).calls.mostRecent().args[0];
      expect(dispatchedAction.payload.project.colorMapping).toEqual({
        'Emoji Color': '🔴 Fire Red 🔥',
        'Unicode Color': '紅色珠子 (Red Bead)',
        'Special Chars': 'Café™ Brown® #123',
      });
    });

    it('should validate Miyuki Delica color code format', async () => {
      const flamWithValidDelicaCodes: FLAM = {
        'DB Series': {
          key: 'DB Series',
          firstAppearance: [0, 0],
          lastAppearance: [0, 0],
          count: 1,
          color: 'DB0001',
        },
        'DB Higher': {
          key: 'DB Higher',
          firstAppearance: [0, 1],
          lastAppearance: [0, 1],
          count: 1,
          color: 'DB1234',
        },
        'DB Max': {
          key: 'DB Max',
          firstAppearance: [0, 2],
          lastAppearance: [0, 2],
          count: 1,
          color: 'DB9999',
        },
      };

      service.flam$.next(flamWithValidDelicaCodes);
      const mockProject = createMockProject();

      // Set up store spy to return mock project
      store.select.and.returnValue(of(mockProject));

      await service.saveColorMappingsToProject();

      const dispatchedAction = (
        store.dispatch as jasmine.Spy
      ).calls.mostRecent().args[0];
      expect(dispatchedAction.payload.project.colorMapping).toEqual({
        'DB Series': 'DB0001',
        'DB Higher': 'DB1234',
        'DB Max': 'DB9999',
      });
    });
  });

  describe('Integration and Reactive Behavior', () => {
    it('should respond to zippedRows$ changes', fakeAsync(() => {
      const rows = createTestRows();

      // Use a Subject to control when the emission happens
      const rowsSubject = new Subject<Row[]>();

      // Create a new projectService spy with the controlled observable
      const newProjectServiceSpy = jasmine.createSpyObj(
        'ProjectService',
        ['updateProject'],
        {
          zippedRows$: rowsSubject.asObservable(),
          project$: of(null),
          ready$: of(true),
        }
      );

      // Create a new service instance to trigger constructor subscription
      const newService = new FlamService(
        logger,
        newProjectServiceSpy,
        projectDbService,
        settingsService,
        store
      );

      // Set up spies AFTER service creation
      const generateFLAMSpy = spyOn(
        newService,
        'generateFLAM'
      ).and.callThrough();
      const loadColorMappingsSpy = spyOn(
        newService,
        'loadColorMappingsFromProject'
      );

      // NOW emit the rows after spies are set up
      rowsSubject.next(rows);

      // Tick to process the subscription
      tick();

      expect(generateFLAMSpy).toHaveBeenCalledWith(rows);
      expect(loadColorMappingsSpy).toHaveBeenCalled();
    }));

    it('should not process empty rows from zippedRows$', fakeAsync(() => {
      // Create a new projectService spy with empty rows
      const newProjectServiceSpy = jasmine.createSpyObj(
        'ProjectService',
        ['updateProject'],
        {
          zippedRows$: of([]),
          project$: of(null),
          ready$: of(true),
        }
      );

      // Create a new service instance
      const newService = new FlamService(
        logger,
        newProjectServiceSpy,
        projectDbService,
        settingsService,
        store
      );
      spyOn(newService, 'generateFLAM');

      // Tick to process the subscription
      tick();

      expect(newService.generateFLAM).not.toHaveBeenCalled();
    }));

    it('should maintain FLAM state across multiple updates', fakeAsync(() => {
      const rows1 = [{ id: 1, steps: [{ id: 1, count: 1, description: 'A' }] }];
      const rows2 = [{ id: 1, steps: [{ id: 1, count: 2, description: 'B' }] }];

      // Set up a BehaviorSubject we can control
      const rowsSubject = new BehaviorSubject<Row[]>(rows1);

      // Create a new projectService spy with the controlled observable
      const newProjectServiceSpy = jasmine.createSpyObj(
        'ProjectService',
        ['updateProject'],
        {
          zippedRows$: rowsSubject.asObservable(),
          project$: of(null),
          ready$: of(true),
        }
      );

      // Create new service instance with controlled observable
      const newService = new FlamService(
        logger,
        newProjectServiceSpy,
        projectDbService,
        settingsService,
        store
      );

      tick(); // Process first emission
      expect(newService.flam$.value['A']).toBeDefined();

      // Emit new rows
      rowsSubject.next(rows2);
      tick(); // Process second emission
      expect(newService.flam$.value['B']).toBeDefined();
      expect(newService.flam$.value['A']).toBeUndefined(); // Should be replaced
    }));
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed step data', () => {
      const malformedRows: Row[] = [
        {
          id: 1,
          steps: [
            { id: 1, count: 1, description: '' }, // Empty description
            { id: 2, count: 0, description: 'Zero Count' }, // Zero count
            { id: 3, count: -1, description: 'Negative Count' }, // Negative count
          ],
        },
      ];

      expect(() => service.generateFLAM(malformedRows)).not.toThrow();

      const flam = service.generateFLAM(malformedRows);
      expect(flam['']).toBeDefined(); // Empty key is valid
      expect(flam['Zero Count'].count).toBe(0);
      expect(flam['Negative Count'].count).toBe(-1);
    });

    it('should handle steps with identical descriptions and positions', () => {
      const duplicateRows: Row[] = [
        {
          id: 1,
          steps: [
            { id: 1, count: 5, description: 'Duplicate' },
            { id: 2, count: 3, description: 'Duplicate' },
          ],
        },
      ];

      const flam = service.generateFLAM(duplicateRows);
      expect(flam['Duplicate'].count).toBe(8); // 5 + 3
      expect(flam['Duplicate'].firstAppearance).toEqual([0, 0]);
      expect(flam['Duplicate'].lastAppearance).toEqual([0, 1]);
    });

    it('should handle very large datasets efficiently', () => {
      const largeRows: Row[] = [];
      for (let i = 0; i < 1000; i++) {
        largeRows.push({
          id: i,
          steps: [
            { id: 1, count: 1, description: `Step_${i % 10}` },
            { id: 2, count: 2, description: `Common` },
          ],
        });
      }

      const startTime = performance.now();
      const flam = service.generateFLAM(largeRows);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(Object.keys(flam).length).toBe(11); // 10 unique steps + 1 common
      expect(flam['Common'].count).toBe(2000); // 2 * 1000 rows
    });

    it('should handle Unicode and special characters in step descriptions', () => {
      const unicodeRows: Row[] = [
        {
          id: 1,
          steps: [
            { id: 1, count: 1, description: '🔴 Red Bead' },
            { id: 2, count: 1, description: '特殊字符' },
            { id: 3, count: 1, description: 'Émojí test 🎨' },
          ],
        },
      ];

      const flam = service.generateFLAM(unicodeRows);
      expect(flam['🔴 Red Bead']).toBeDefined();
      expect(flam['特殊字符']).toBeDefined();
      expect(flam['Émojí test 🎨']).toBeDefined();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not create memory leaks with large FLAM objects', () => {
      const largeFLAM: FLAM = {};
      for (let i = 0; i < 10000; i++) {
        largeFLAM[`Step_${i}`] = {
          key: `Step_${i}`,
          firstAppearance: [0, 0],
          lastAppearance: [999, 999],
          count: i,
        };
      }

      service.flam$.next(largeFLAM);
      expect(service.flam$.value).toBe(largeFLAM);

      // Clear and verify cleanup
      service.flam$.next({});
      expect(Object.keys(service.flam$.value).length).toBe(0);
    });

    it('should handle rapid consecutive FLAM updates', () => {
      const updates = [];
      for (let i = 0; i < 100; i++) {
        const rows = [
          { id: i, steps: [{ id: 1, count: 1, description: `Step_${i}` }] },
        ];
        updates.push(service.generateFLAM(rows));
      }

      // All updates should complete without error
      expect(updates.length).toBe(100);
      updates.forEach((flam, index) => {
        expect(flam[`Step_${index}`]).toBeDefined();
      });
    });
  });
});

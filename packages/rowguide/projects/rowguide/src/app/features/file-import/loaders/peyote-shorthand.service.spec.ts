import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { PeyoteShorthandService } from './peyote-shorthand.service';
import { Project, Row, Step } from '../../../core/models';
import { NotificationService } from '../../../core/services';
import { SettingsService } from '../../../core/services';
import { ZipperService } from '../services';
import { BehaviorSubject } from 'rxjs';

describe('PeyoteShorthandService', () => {
  let service: PeyoteShorthandService;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let zipperServiceSpy: jasmine.SpyObj<ZipperService>;
  let settingsServiceStub: Partial<SettingsService>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;
  let combine12Subject: BehaviorSubject<boolean>;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('NGXLogger', ['debug', 'trace', 'warn']);
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'snackbar',
    ]);
    zipperServiceSpy = jasmine.createSpyObj('ZipperService', [
      'expandSteps',
      'compressSteps',
    ]);
    combine12Subject = new BehaviorSubject<boolean>(false);
    settingsServiceStub = { combine12$: combine12Subject };

    TestBed.configureTestingModule({
      providers: [
        { provide: NGXLogger, useValue: loggerSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: SettingsService, useValue: settingsServiceStub },
        { provide: ZipperService, useValue: zipperServiceSpy },
      ],
    });

    service = TestBed.inject(PeyoteShorthandService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should convert project string to Project object', () => {
    const projectString =
      'Row 1 (L) (1)stepA, (2)stepB\nRow 2 (R) (3)stepC, (4)stepD';
    const project: Project = service.toProject(projectString);

    expect(project.rows.length).toBe(2);

    const firstRow: Row = project.rows[0];
    expect(firstRow.id).toBe(1);
    expect(firstRow.steps.length).toBe(2);
    expect(firstRow.steps[0]).toEqual({
      count: 1,
      description: 'stepA',
      id: 1,
    });
    expect(firstRow.steps[1]).toEqual({
      count: 2,
      description: 'stepB',
      id: 2,
    });

    const secondRow: Row = project.rows[1];
    expect(secondRow.id).toBe(2);
    expect(secondRow.steps.length).toBe(2);
    expect(secondRow.steps[0]).toEqual({
      count: 3,
      description: 'stepC',
      id: 1,
    });
    expect(secondRow.steps[1]).toEqual({
      count: 4,
      description: 'stepD',
      id: 2,
    });
  });

  it('should handle lines with no valid steps', () => {
    const projectString = 'Row 1 (L) invalid step\nRow 2 (R) (1)stepA';
    const project: Project = service.toProject(projectString);

    expect(project.rows.length).toBe(1);

    const firstRow: Row = project.rows[0];
    expect(firstRow.id).toBe(1);
    expect(firstRow.steps.length).toBe(1);
    expect(firstRow.steps[0]).toEqual({
      count: 1,
      description: 'stepA',
      id: 1,
    });
  });

  it('should handle empty input string', () => {
    const projectString = '';
    const project: Project = service.toProject(projectString);

    expect(project.rows.length).toBe(0);
  });

  it('should handle input with only whitespace', () => {
    const projectString = '   \n  ';
    const project: Project = service.toProject(projectString);

    expect(project.rows.length).toBe(0);
  });

  it('should handle input with multiple rows and steps', () => {
    const projectString =
      'Row 1 (L) (1)stepA, (2)stepB\nRow 2 (R) (3)stepC, (4)stepD\nRow 3 (L) (5)stepE';
    const project: Project = service.toProject(projectString);

    expect(project.rows.length).toBe(3);

    const firstRow: Row = project.rows[0];
    expect(firstRow.id).toBe(1);
    expect(firstRow.steps.length).toBe(2);
    expect(firstRow.steps[0]).toEqual({
      count: 1,
      description: 'stepA',
      id: 1,
    });
    expect(firstRow.steps[1]).toEqual({
      count: 2,
      description: 'stepB',
      id: 2,
    });

    const secondRow: Row = project.rows[1];
    expect(secondRow.id).toBe(2);
    expect(secondRow.steps.length).toBe(2);
    expect(secondRow.steps[0]).toEqual({
      count: 3,
      description: 'stepC',
      id: 1,
    });
    expect(secondRow.steps[1]).toEqual({
      count: 4,
      description: 'stepD',
      id: 2,
    });

    const thirdRow: Row = project.rows[2];
    expect(thirdRow.id).toBe(3);
    expect(thirdRow.steps.length).toBe(1);
    expect(thirdRow.steps[0]).toEqual({
      count: 5,
      description: 'stepE',
      id: 1,
    });
  });

  it('should handle input with invalid steps', () => {
    const projectString =
      'Row 1 (L) (1)stepA, invalid, (2)stepB\nRow 2 (R) (3)stepC, (4)stepD';
    const project: Project = service.toProject(projectString);

    expect(project.rows.length).toBe(2);

    const firstRow: Row = project.rows[0];
    expect(firstRow.id).toBe(1);
    expect(firstRow.steps.length).toBe(2);
    expect(firstRow.steps[0]).toEqual({
      count: 1,
      description: 'stepA',
      id: 1,
    });
    expect(firstRow.steps[1]).toEqual({
      count: 2,
      description: 'stepB',
      id: 2,
    });

    const secondRow: Row = project.rows[1];
    expect(secondRow.id).toBe(2);
    expect(secondRow.steps.length).toBe(2);
    expect(secondRow.steps[0]).toEqual({
      count: 3,
      description: 'stepC',
      id: 1,
    });
    expect(secondRow.steps[1]).toEqual({
      count: 4,
      description: 'stepD',
      id: 2,
    });
  });

  it('should handle input with no steps', () => {
    const projectString = 'Row 1 (L) no steps here';
    const project: Project = service.toProject(projectString);

    expect(project.rows.length).toBe(0);
  });

  it('should handle multiple step formats', () => {
    const projectString =
      'Row 1 (L) (1)stepA, 2(stepB)\nRow 2 (R) 3(stepC), (4)stepD';
    const project: Project = service.toProject(projectString);

    expect(project.rows.length).toBe(2);

    const firstRow: Row = project.rows[0];
    expect(firstRow.id).toBe(1);
    expect(firstRow.steps.length).toBe(2);
    expect(firstRow.steps[0]).toEqual({
      count: 1,
      description: 'stepA',
      id: 1,
    });
    expect(firstRow.steps[1]).toEqual({
      count: 2,
      description: 'stepB',
      id: 2,
    });

    const secondRow: Row = project.rows[1];
    expect(secondRow.id).toBe(2);
    expect(secondRow.steps.length).toBe(2);
    expect(secondRow.steps[0]).toEqual({
      count: 3,
      description: 'stepC',
      id: 1,
    });
    expect(secondRow.steps[1]).toEqual({
      count: 4,
      description: 'stepD',
      id: 2,
    });
  });

  it('should handle descriptions with numbers', () => {
    const projectString =
      'Row 1 (L) (1)step1, (2)step2\nRow 2 (R) (3)step3, (4)step4';
    const project: Project = service.toProject(projectString);

    expect(project.rows.length).toBe(2);

    const firstRow: Row = project.rows[0];
    expect(firstRow.id).toBe(1);
    expect(firstRow.steps.length).toBe(2);
    expect(firstRow.steps[0]).toEqual({
      count: 1,
      description: 'step1',
      id: 1,
    });
    expect(firstRow.steps[1]).toEqual({
      count: 2,
      description: 'step2',
      id: 2,
    });

    const secondRow: Row = project.rows[1];
    expect(secondRow.id).toBe(2);
    expect(secondRow.steps.length).toBe(2);
    expect(secondRow.steps[0]).toEqual({
      count: 3,
      description: 'step3',
      id: 1,
    });
    expect(secondRow.steps[1]).toEqual({
      count: 4,
      description: 'step4',
      id: 2,
    });
  });

  describe('Step Count Validation', () => {
    it('should call notification service when step counts do not match', fakeAsync(() => {
      const projectString =
        'Row 1 (L) (1)stepA\nRow 2 (R) (2)stepB\nRow 3 (L) (3)stepC'; // Steps: 1, 2, 3 - no pattern matches

      service.toProject(projectString);

      // Trigger the observable
      combine12Subject.next(false);
      tick();

      expect(notificationServiceSpy.snackbar).toHaveBeenCalledWith(
        'Imported file has inconsistent step counts.  This may be a sign of a failed import.  Please send the file to the developer for review if the import was not successful.'
      );
    }));

    it('should not call notification service when all step counts match', fakeAsync(() => {
      const projectString =
        'Row 1 (L) (1)stepA, (2)stepB\nRow 2 (R) (1)stepC, (2)stepD'; // Same step counts: 3 vs 3

      service.toProject(projectString);

      // Trigger the observable
      combine12Subject.next(false);
      tick();

      expect(notificationServiceSpy.snackbar).not.toHaveBeenCalled();
    }));

    it('should not call notification service when even rows match', fakeAsync(() => {
      const projectString =
        'Row 1 (L) (1)stepA, (2)stepB\nRow 2 (R) (3)stepC\nRow 3 (L) (1)stepE, (2)stepF'; // Even rows match: 3, 3, 3

      service.toProject(projectString);

      // Trigger the observable
      combine12Subject.next(false);
      tick();

      expect(notificationServiceSpy.snackbar).not.toHaveBeenCalled();
    }));

    it('should not call notification service when odd rows match', fakeAsync(() => {
      const projectString =
        'Row 1 (L) (2)stepA\nRow 2 (R) (3)stepC\nRow 3 (L) (2)stepE'; // Odd rows match: 2, 3, 2

      service.toProject(projectString);

      // Trigger the observable
      combine12Subject.next(false);
      tick();

      expect(notificationServiceSpy.snackbar).not.toHaveBeenCalled();
    }));
  });

  describe('Combined Row 1&2 Processing', () => {
    beforeEach(() => {
      // Setup default mock responses for ZipperService
      zipperServiceSpy.expandSteps.and.returnValue([
        { id: 1, count: 1, description: 'stepA' },
        { id: 2, count: 1, description: 'stepB' },
        { id: 3, count: 1, description: 'stepC' },
        { id: 4, count: 1, description: 'stepD' },
      ]);
      zipperServiceSpy.compressSteps.and.returnValue([
        { id: 1, count: 1, description: 'step' },
      ]);
    });

    it('should handle Row 1&2 combined format', () => {
      const projectString =
        'Row 1&2 (L) (1)stepA, (1)stepB, (1)stepC, (1)stepD';

      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(2);
      expect(zipperServiceSpy.expandSteps).toHaveBeenCalled();
      expect(zipperServiceSpy.compressSteps).toHaveBeenCalledTimes(2);

      const firstRow: Row = project.rows[0];
      expect(firstRow.id).toBe(1);

      const secondRow: Row = project.rows[1];
      expect(secondRow.id).toBe(2);
    });

    it('should skip combined rows with no valid steps', () => {
      zipperServiceSpy.expandSteps.and.returnValue([]);
      zipperServiceSpy.compressSteps.and.returnValue([]);

      const projectString = 'Row 1&2 (L) invalid steps';

      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(0);
    });
  });

  describe('Custom Delimiter Support', () => {
    it('should use custom delimiter when provided', () => {
      const projectString = 'Row 1 (L) (1)stepA; (2)stepB; (3)stepC';
      const project: Project = service.toProject(projectString, '; ');

      expect(project.rows.length).toBe(1);
      const row: Row = project.rows[0];
      expect(row.steps.length).toBe(3);
      expect(row.steps[0].description).toBe('stepA');
      expect(row.steps[1].description).toBe('stepB');
      expect(row.steps[2].description).toBe('stepC');
    });

    it('should handle different delimiter formats', () => {
      const projectString = 'Row 1 (L) (1)stepA | (2)stepB | (3)stepC';
      const project: Project = service.toProject(projectString, ' | ');

      expect(project.rows.length).toBe(1);
      const row: Row = project.rows[0];
      expect(row.steps.length).toBe(3);
    });
  });

  describe('Step Pattern Matching', () => {
    it('should match (count)description pattern', () => {
      const projectString = 'Row 1 (L) (5)stepName';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(1);
      const step = project.rows[0].steps[0];
      expect(step.count).toBe(5);
      expect(step.description).toBe('stepName');
    });

    it('should match count(description) pattern', () => {
      const projectString = 'Row 1 (L) 7(stepName)';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(1);
      const step = project.rows[0].steps[0];
      expect(step.count).toBe(7);
      expect(step.description).toBe('stepName');
    });

    it('should handle steps with alphanumeric descriptions', () => {
      const projectString = 'Row 1 (L) (3)step1A2B, (2)test99';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(1);
      const row = project.rows[0];
      expect(row.steps.length).toBe(2);
      expect(row.steps[0].description).toBe('step1A2B');
      expect(row.steps[1].description).toBe('test99');
    });

    it('should ignore steps that do not match any pattern', () => {
      const projectString =
        'Row 1 (L) (3)validStep, invalidStep, count(), ()description, (2)validStep2';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(1);
      const row = project.rows[0];
      expect(row.steps.length).toBe(2);
      expect(row.steps[0].description).toBe('validStep');
      expect(row.steps[1].description).toBe('validStep2');
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Invalid step:',
        'invalidStep'
      );
    });
  });

  describe('Row Tag Stripping', () => {
    it('should handle various row tag formats', () => {
      const testCases = [
        'Row 1 (L) (1)step',
        'Row 2 (R) (1)step',
        'Row 10 (L) (1)step',
        'Row 999 (R) (1)step',
      ];

      testCases.forEach((testCase, index) => {
        const project: Project = service.toProject(testCase);
        expect(project.rows.length).toBe(1);
        expect(project.rows[0].id).toBe(1);
        expect(project.rows[0].steps[0].description).toBe('step');
      });
    });

    it('should handle Row 1&2 tag format', () => {
      zipperServiceSpy.expandSteps.and.returnValue([
        { id: 1, count: 1, description: 'step' },
      ]);
      zipperServiceSpy.compressSteps.and.returnValue([
        { id: 1, count: 1, description: 'step' },
      ]);

      const projectString = 'Row 1&2 (L) (1)step';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(2);
    });
  });

  describe('Logging', () => {
    it('should log debug information for project loading', () => {
      const projectString = 'Row 1 (L) (1)step';
      service.toProject(projectString);

      expect(loggerSpy.debug).toHaveBeenCalledWith(
        'Loading project from string',
        projectString
      );
    });

    it('should log trace information for lines and words', () => {
      const projectString = 'Row 1 (L) (1)stepA, (2)stepB';
      service.toProject(projectString);

      expect(loggerSpy.trace).toHaveBeenCalledWith(
        'Line:',
        'Row 1 (L) (1)stepA, (2)stepB'
      );
      expect(loggerSpy.trace).toHaveBeenCalledWith('Word:', '(1)stepA');
      expect(loggerSpy.trace).toHaveBeenCalledWith('Word:', '(2)stepB');
    });

    it('should log step parsing details', () => {
      const projectString = 'Row 1 (L) (5)testStep';
      service.toProject(projectString);

      expect(loggerSpy.trace).toHaveBeenCalledWith('Count:', 5);
      expect(loggerSpy.trace).toHaveBeenCalledWith('Description:', 'testStep');
    });

    it('should log warnings for inconsistent step counts', fakeAsync(() => {
      const projectString =
        'Row 1 (L) (1)step\nRow 2 (R) (2)step\nRow 3 (L) (3)step';
      service.toProject(projectString);

      combine12Subject.next(false);
      tick();

      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Row steps do not match:',
        1,
        [1, 2, 3]
      );
    }));
  });

  describe('Edge Cases', () => {
    it('should handle projects with only empty lines', () => {
      const projectString = '\n\n\n';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(0);
    });

    it('should handle mixed valid and invalid lines', () => {
      const projectString =
        'Row 1 (L) (1)validStep\n' +
        'Not a valid row format\n' +
        'Row 2 (R) (2)anotherValidStep\n' +
        'Another invalid line';

      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(2);
      expect(project.rows[0].steps[0].description).toBe('validStep');
      expect(project.rows[1].steps[0].description).toBe('anotherValidStep');
    });

    it('should handle zero count steps', () => {
      const projectString = 'Row 1 (L) (0)zeroStep, (1)normalStep';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(1);
      const row = project.rows[0];
      expect(row.steps.length).toBe(2);
      expect(row.steps[0].count).toBe(0);
      expect(row.steps[1].count).toBe(1);
    });

    it('should handle very large count numbers', () => {
      const projectString = 'Row 1 (L) (999999)largeCount';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(1);
      const step = project.rows[0].steps[0];
      expect(step.count).toBe(999999);
      expect(step.description).toBe('largeCount');
    });
  });

  describe('Step ID Assignment', () => {
    it('should assign sequential IDs to steps within a row', () => {
      const projectString = 'Row 1 (L) (1)first, (2)second, (3)third';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(1);
      const row = project.rows[0];
      expect(row.steps.length).toBe(3);
      expect(row.steps[0].id).toBe(1);
      expect(row.steps[1].id).toBe(2);
      expect(row.steps[2].id).toBe(3);
    });

    it('should reset step IDs for each row', () => {
      const projectString =
        'Row 1 (L) (1)first, (2)second\nRow 2 (R) (1)third, (2)fourth';
      const project: Project = service.toProject(projectString);

      expect(project.rows.length).toBe(2);

      const firstRow = project.rows[0];
      expect(firstRow.steps[0].id).toBe(1);
      expect(firstRow.steps[1].id).toBe(2);

      const secondRow = project.rows[1];
      expect(secondRow.steps[0].id).toBe(1);
      expect(secondRow.steps[1].id).toBe(2);
    });
  });
});

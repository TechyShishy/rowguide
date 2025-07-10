import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { PeyoteShorthandService } from './peyote-shorthand.service';
import { Project, Row } from '../../../core/models';
import { NotificationService } from '../../../core/services';
import { SettingsService } from '../../../core/services';
import { BehaviorSubject } from 'rxjs';

describe('PeyoteShorthandService', () => {
  let service: PeyoteShorthandService;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let settingsServiceStub: Partial<SettingsService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('NGXLogger', ['debug', 'trace', 'warn']);
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'snackbar',
    ]);
    settingsServiceStub = { combine12$: new BehaviorSubject<boolean>(false) };

    TestBed.configureTestingModule({
      providers: [
        { provide: NGXLogger, useValue: spy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: SettingsService, useValue: settingsServiceStub },
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
});

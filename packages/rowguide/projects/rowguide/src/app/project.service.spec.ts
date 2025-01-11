import { TestBed } from '@angular/core/testing';
import { ProjectService } from './project.service';
import { PeyoteShorthandService } from './loader/peyote-shorthand.service';
import { SettingsService } from './settings.service';
import { NullProject } from './null-project';
import { Subject } from 'rxjs';
import { BeadProject } from './bead-project';
import { LoggerModule } from 'ngx-logger';
import { LoggerTestingModule } from 'ngx-logger/testing';

describe('ProjectService', () => {
  let service: ProjectService;
  let peyoteShorthandService: jasmine.SpyObj<PeyoteShorthandService>;
  let settingsService: jasmine.SpyObj<SettingsService>;

  beforeEach(() => {
    const peyoteShorthandServiceSpy = jasmine.createSpyObj(
      'PeyoteShorthandService',
      ['toRGP']
    );
    const settingsServiceSpy = jasmine.createSpyObj('SettingsService', [], {
      ready: new Subject<boolean>(),
    });

    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        ProjectService,
        {
          provide: PeyoteShorthandService,
          useValue: peyoteShorthandServiceSpy,
        },
        { provide: SettingsService, useValue: settingsServiceSpy },
      ],
    });

    service = TestBed.inject(ProjectService);
    peyoteShorthandService = TestBed.inject(
      PeyoteShorthandService
    ) as jasmine.SpyObj<PeyoteShorthandService>;
    settingsService = TestBed.inject(
      SettingsService
    ) as jasmine.SpyObj<SettingsService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with a NullProject', () => {
    expect(service.project).toBeInstanceOf(NullProject);
  });

  it('should save the current position', () => {
    const row = 1;
    const step = 2;
    service.saveCurrentPosition(row, step);
    const savedData = JSON.parse(localStorage.getItem('currentProject')!);
    expect(savedData.position.row).toBe(row);
    expect(savedData.position.step).toBe(step);
  });

  it('should load the current position', async () => {
    const row = 1;
    const step = 2;
    localStorage.setItem(
      'currentProject',
      JSON.stringify({ project: new BeadProject(), position: { row, step } })
    );

    settingsService.ready.next(true); // Simulate settings service being ready

    const position = await service.loadCurrentPosition();
    expect(position).toEqual({ row, step });
  });

  it('should return null if no current project is found', () => {
    localStorage.removeItem('currentProject');
    const position = service.loadCurrentPosition();
    expect(position).toBeNull();
  });

  it('should load the current project', () => {
    const project = new BeadProject();
    localStorage.setItem(
      'currentProject',
      JSON.stringify({ project, position: { row: 1, step: 2 } })
    );
    service.loadCurrentProject();
    expect(service.project).toEqual(jasmine.objectContaining(project));
  });

  it('should load Peyote project', () => {
    const projectName = 'Test Project';
    const data = 'some,data';
    const project = new BeadProject();
    peyoteShorthandService.toRGP.and.returnValue(project);

    service.loadPeyote(projectName, data);

    expect(service.project).toEqual(project);
    expect(service.project.name).toBe(projectName);
  });
});

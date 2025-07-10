import { TestBed } from '@angular/core/testing';
import { ProjectService } from './project.service';
import { PeyoteShorthandService } from './loader/peyote-shorthand.service';
import { SettingsService } from './settings.service';
import { NullProject } from './null-project';
import { Subject } from 'rxjs';
import { BeadProject } from './bead-project';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

describe('ProjectService', () => {
  let service: ProjectService;
  let peyoteShorthandService: jasmine.SpyObj<PeyoteShorthandService>;
  let settingsService: jasmine.SpyObj<SettingsService>;

  beforeEach(() => {
    const peyoteShorthandServiceSpy = jasmine.createSpyObj(
      'PeyoteShorthandService',
      ['toProject']
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
        provideRouter(routes),
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
    expect(service.project$.value).toBeInstanceOf(NullProject);
  });

  it('should load the current project', () => {
    const project = new BeadProject();
    localStorage.setItem(
      'currentProject',
      JSON.stringify({ project, position: { row: 1, step: 2 } })
    );
    service.loadCurrentProject();
    expect(service.project$.value).toEqual(jasmine.objectContaining(project));
  });

  it('should load Peyote project', () => {
    const projectName = 'Test Project';
    const data = 'some,data';
    const project = new BeadProject();
    peyoteShorthandService.toProject.and.returnValue(project);

    service.loadPeyote(projectName, data);

    expect(service.project$.value).toEqual(project);
    expect(service.project$.value.name).toBe(projectName);
  });
});

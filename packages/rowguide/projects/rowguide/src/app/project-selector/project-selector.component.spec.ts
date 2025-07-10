import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectSelectorComponent } from './project-selector.component';
import { ProjectService } from '../project.service';
import { ProjectDbService } from '../project-db.service';
import { BeadtoolPdfService } from '../loader/beadtool-pdf.service';
import { FlamService } from '../flam.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, firstValueFrom, from, of, Subject } from 'rxjs';
import * as pako from 'pako';
import { Project } from '../project';
import { FLAM } from '../flam';
import { provideRouter } from '@angular/router';
import { routes } from '../app.routes';

describe('ProjectSelectorComponent', () => {
  let component: ProjectSelectorComponent;
  let fixture: ComponentFixture<ProjectSelectorComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let indexedDBServiceSpy: jasmine.SpyObj<ProjectDbService>;
  let beadtoolPdfServiceSpy: jasmine.SpyObj<BeadtoolPdfService>;
  let flamServiceSpy: jasmine.SpyObj<FlamService>;

  beforeEach(async () => {
    projectServiceSpy = jasmine.createSpyObj('ProjectService', [
      'loadPeyote',
      'saveCurrentPosition',
    ]);
    indexedDBServiceSpy = jasmine.createSpyObj('IndexedDBService', [
      'loadProjects',
      'addProject',
      'updateProject',
    ]);
    beadtoolPdfServiceSpy = jasmine.createSpyObj('BeadtoolPdfService', [
      'loadDocument',
      'renderFrontPage',
    ]);
    flamServiceSpy = jasmine.createSpyObj('FlamService', [
      'inititalizeFLAM',
      'generateFLAM',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        ProjectSelectorComponent,
        LoggerTestingModule,
        BrowserAnimationsModule,
      ],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: ProjectDbService, useValue: indexedDBServiceSpy },
        { provide: BeadtoolPdfService, useValue: beadtoolPdfServiceSpy },
        { provide: FlamService, useValue: flamServiceSpy },
        provideRouter(routes),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load projects from IndexedDB on init', async () => {
    const mockProjects: Project[] = [{ rows: [], id: 1, name: 'Test Project' }];
    indexedDBServiceSpy.loadProjects.and.returnValue(
      Promise.resolve(mockProjects)
    );

    await component.ngAfterViewInit();

    const projects = await firstValueFrom(component.projects$);
    expect(projects).toEqual(mockProjects);
  });

  it('should detect gzip file and process it', async () => {
    const mockGzipContent = pako.gzip(
      JSON.stringify({ id: 1, name: 'Test Project', rows: [] })
    );
    const mockFile = new File([mockGzipContent], 'test.gz');
    component.file = mockFile;

    const mockProject: Project = { id: 1, name: 'Test Project', rows: [] };

    projectServiceSpy.project$ = new BehaviorSubject<Project>(mockProject);
    flamServiceSpy.flam$ = new BehaviorSubject<FLAM>({});
    projectServiceSpy.ready = new Subject<boolean>();

    await firstValueFrom(component.importFile());

    expect(indexedDBServiceSpy.updateProject).toHaveBeenCalledWith({
      id: 1,
      name: 'Test Project',
      rows: [],
    });
  });

  it('should detect PDF file and process it', async () => {
    const mockFile = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
      'test.pdf'
    );
    component.file = mockFile;

    beadtoolPdfServiceSpy.loadDocument.and.returnValue(of('PDF file content'));
    beadtoolPdfServiceSpy.renderFrontPage.and.returnValue(
      from(Promise.resolve(new ArrayBuffer(0)))
    );
    const mockProject = {
      id: 1,
      name: 'Test Project',
      rows: [],
    };
    projectServiceSpy.project$ = new BehaviorSubject<Project>(mockProject);
    flamServiceSpy.flam$ = new BehaviorSubject<FLAM>({});
    projectServiceSpy.ready = new Subject<boolean>();

    projectServiceSpy.loadPeyote.and.returnValue(Promise.resolve(mockProject));

    await firstValueFrom(component.importFile());

    expect(beadtoolPdfServiceSpy.loadDocument).toHaveBeenCalled();
    expect(projectServiceSpy.loadPeyote).toHaveBeenCalledWith(
      'test.pdf',
      'PDF file content'
    );
    expect(flamServiceSpy.generateFLAM).toHaveBeenCalled();
    expect(indexedDBServiceSpy.updateProject).toHaveBeenCalled();
  });

  it('should process plain text file', async () => {
    const mockFile = new File(['Test Content'], 'test.txt');
    component.file = mockFile;

    const mockProject: Project = { id: 1, name: 'Test Project', rows: [] };

    projectServiceSpy.project$ = new BehaviorSubject<Project>(mockProject);
    projectServiceSpy.loadPeyote.and.returnValue(Promise.resolve(mockProject));
    flamServiceSpy.flam$ = new BehaviorSubject<FLAM>({});
    projectServiceSpy.ready = new Subject<boolean>();

    await firstValueFrom(component.importFile());

    expect(projectServiceSpy.loadPeyote).toHaveBeenCalledWith(
      'test.txt',
      'Test Content'
    );
  });
});

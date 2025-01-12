import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectSelectorComponent } from './project-selector.component';
import { ProjectService } from '../project.service';
import { IndexedDBService } from '../indexed-db.service';
import { BeadtoolPdfService } from '../loader/beadtool-pdf.service';
import { FlamService } from '../flam.service';
import { NGXLogger } from 'ngx-logger';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, Subject } from 'rxjs';
import * as pako from 'pako';
import { Project } from '../project';
import { FLAM } from '../flam';

describe('ProjectSelectorComponent', () => {
  let component: ProjectSelectorComponent;
  let fixture: ComponentFixture<ProjectSelectorComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let indexedDBServiceSpy: jasmine.SpyObj<IndexedDBService>;
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
    flamServiceSpy = jasmine.createSpyObj('FlamService', ['inititalizeFLAM']);

    await TestBed.configureTestingModule({
      imports: [
        ProjectSelectorComponent,
        LoggerTestingModule,
        BrowserAnimationsModule,
      ],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: IndexedDBService, useValue: indexedDBServiceSpy },
        { provide: BeadtoolPdfService, useValue: beadtoolPdfServiceSpy },
        { provide: FlamService, useValue: flamServiceSpy },
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

    expect(component.projects).toEqual(mockProjects);
  });

  it('should save project to IndexedDB', () => {
    const mockProject: Project = { rows: [], id: 1, name: 'Test Project' };
    component.saveProjectToIndexedDB(mockProject);
    expect(indexedDBServiceSpy.addProject).toHaveBeenCalledWith(mockProject);
  });

  it('should detect gzip file and process it', async () => {
    const mockGzipContent = pako.gzip(
      JSON.stringify({ id: 1, name: 'Test Project', rows: [] })
    );
    const mockFile = new File([mockGzipContent], 'test.gz');
    component.file = mockFile;

    await component.importFile();

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

    beadtoolPdfServiceSpy.loadDocument.and.returnValue(
      Promise.resolve('PDF file content')
    );
    beadtoolPdfServiceSpy.renderFrontPage.and.returnValue(
      Promise.resolve(new ArrayBuffer(0))
    );

    projectServiceSpy.project$ = new BehaviorSubject<Project>({
      id: 1,
      name: 'Test Project',
      rows: [],
    });
    flamServiceSpy.flam$ = new BehaviorSubject<FLAM>({});
    projectServiceSpy.ready = new Subject<boolean>();

    await component.importFile();

    expect(beadtoolPdfServiceSpy.loadDocument).toHaveBeenCalled();
    expect(projectServiceSpy.loadPeyote).toHaveBeenCalledWith(
      'test.pdf',
      'PDF file content'
    );
    expect(flamServiceSpy.inititalizeFLAM).toHaveBeenCalledWith(true);
    expect(indexedDBServiceSpy.updateProject).toHaveBeenCalled();
  });

  it('should process plain text file', async () => {
    const mockFile = new File(['Test Content'], 'test.txt');
    component.file = mockFile;

    const mockProject: Project = { id: 1, name: 'Test Project', rows: [] };

    projectServiceSpy.project$ = new BehaviorSubject<Project>(mockProject);
    flamServiceSpy.flam$ = new BehaviorSubject<FLAM>({});
    projectServiceSpy.ready = new Subject<boolean>();

    await component.importFile();

    expect(projectServiceSpy.loadPeyote).toHaveBeenCalledWith(
      'test.txt',
      'Test Content'
    );
  });
});

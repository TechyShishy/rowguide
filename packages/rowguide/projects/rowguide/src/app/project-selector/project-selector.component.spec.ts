import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectSelectorComponent } from './project-selector.component';
import { ProjectService } from '../project.service';
import { IndexedDBService } from '../indexed-db.service';
import { Project } from '../project';
import pako from 'pako';
import { PdfjslibService } from '../pdfjslib.service';

describe('ProjectSelectorComponent', () => {
  let component: ProjectSelectorComponent;
  let fixture: ComponentFixture<ProjectSelectorComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let indexedDBServiceSpy: jasmine.SpyObj<IndexedDBService>;
  let pdfjsLibServiceSpy: jasmine.SpyObj<PdfjslibService>;

  beforeEach(async () => {
    projectServiceSpy = jasmine.createSpyObj('ProjectService', ['loadPeyote']);
    indexedDBServiceSpy = jasmine.createSpyObj('IndexedDBService', [
      'loadProjects',
      'addProject',
    ]);
    pdfjsLibServiceSpy = jasmine.createSpyObj('pdfjsLibService', [
      'getDocument',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        ProjectSelectorComponent,
        LoggerTestingModule,
        BrowserAnimationsModule, // Add this line
      ],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: IndexedDBService, useValue: indexedDBServiceSpy },
        { provide: PdfjslibService, useValue: pdfjsLibServiceSpy },
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

    expect(indexedDBServiceSpy.addProject).toHaveBeenCalledWith({
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
    pdfjsLibServiceSpy.getDocument.and.returnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () =>
          Promise.resolve({
            getTextContent: () =>
              Promise.resolve({
                items: [
                  { str: 'Row 1&2 (L) (1)A, (2)B' },
                  { str: 'Row 3 (R) (3)C, (1)A' },
                ],
              }),
          }),
      }),
    } as any);

    const mockProject: Project = { id: 1, name: 'Test Project', rows: [] };
    projectServiceSpy.loadPeyote.and.returnValue(mockProject);

    await component.importFile();

    expect(projectServiceSpy.loadPeyote).toHaveBeenCalledWith(
      'test.pdf',
      '(1)A, (2)B\n(3)C, (1)A'
    );
  });

  it('should process plain text file', async () => {
    const mockFile = new File(['Test Content'], 'test.txt');
    component.file = mockFile;

    const mockProject: Project = { id: 1, name: 'Test Project', rows: [] };
    projectServiceSpy.loadPeyote.and.returnValue(mockProject);

    await component.importFile();

    expect(projectServiceSpy.loadPeyote).toHaveBeenCalledWith(
      'test.txt',
      'Test Content'
    );
  });
});

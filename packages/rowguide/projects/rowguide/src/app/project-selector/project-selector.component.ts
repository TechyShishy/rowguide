import {
  Component,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NGXLogger } from 'ngx-logger';
import { ngfModule } from 'angular-file';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MatExpansionModule,
} from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../features/project-management/services';
import { MatCardModule } from '@angular/material/card';
import { inflate } from 'pako';
import { CommonModule } from '@angular/common';
import { Project } from '../core/models/project';
import { ProjectDbService } from '../data/services';
import { ProjectSummaryComponent } from '../project-summary/project-summary.component';
import { BeadtoolPdfService } from '../features/file-import/loaders';
import { FlamService } from '../core/services';
import { Router } from '@angular/router';
import {
  combineLatestWith,
  from,
  map,
  Observable,
  Subject,
  switchMap,
  firstValueFrom,
  tap,
  of,
  forkJoin,
  BehaviorSubject,
} from 'rxjs';
import { NotificationService } from '../core/services';
import { SettingsService } from '../core/services';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-project-selector',
  imports: [
    MatButtonModule,
    ngfModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    FormsModule,
    CommonModule,
    ProjectSummaryComponent,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.scss',
})
export class ProjectSelectorComponent {
  file: File = new File([], '');
  fileData: string = '';
  fileData$: Observable<string> = new Observable<string>();
  projects$: Observable<Project[]> = new Observable<Project[]>();
  showSpinner: boolean = false;
  private destroy$ = new Subject<void>();
  sortOrder$: BehaviorSubject<string> = new BehaviorSubject<string>('dateAsc');

  constructor(
    private logger: NGXLogger,
    private projectService: ProjectService,
    private indexedDBService: ProjectDbService,
    private flamService: FlamService,
    private beadtoolPdfService: BeadtoolPdfService,
    private router: Router,
    private notificationService: NotificationService,
    private settingsService: SettingsService
  ) {}
  importFile(): Observable<Project> {
    return from(this.file.arrayBuffer()).pipe(
      map((buffer) => buffer.slice(0, 8)),
      switchMap((buffer) => this.detectFileType(buffer))
    );
  }

  async clickImport() {
    this.showSpinner = true;
    await firstValueFrom(this.importFile());
    this.showSpinner = false;
  }

  private detectFileType(buffer: ArrayBuffer): Observable<Project> {
    let project$: Observable<Project>;
    const gzipHeader = Uint8Array.from([0x1f, 0x8b]);
    const pdfHeader = Uint8Array.from([0x25, 0x50, 0x44, 0x46]);
    const bufHeader = new Uint8Array(buffer);

    if (bufHeader[0] === gzipHeader[0] && bufHeader[1] === gzipHeader[1]) {
      this.logger.debug('Gzip file detected');
      project$ = this.importGzipFile(this.file);
    } else if (
      bufHeader[0] === pdfHeader[0] &&
      bufHeader[1] === pdfHeader[1] &&
      bufHeader[2] === pdfHeader[2] &&
      bufHeader[3] === pdfHeader[3]
    ) {
      this.logger.debug('PDF file detected');
      project$ = this.importPdfFile(this.file);
    } else {
      this.logger.debug('RGS file detected');
      project$ = this.importRgsFile(this.file);
    }

    return project$.pipe(
      tap((project) => {
        this.projectService.project$.next(project);
        this.indexedDBService.updateProject(project);
        this.projectService.ready.next(true);
        this.router.navigate(['project', { id: project.id }]);
      })
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  importGzipFile(file: File) {
    return from(file.arrayBuffer()).pipe(
      map((buffer) => {
        const projectArray = inflate(buffer);
        const decoder = new TextDecoder();
        const projectString = decoder.decode(projectArray);
        return JSON.parse(projectString);
      })
    );
  }
  importPdfFile(file: File) {
    return from(this.beadtoolPdfService.loadDocument(file)).pipe(
      map((text: string): [string, number] => {
        const match = text.match(
          /(?:Row (\d+) \([LR]\) (?:\(\d+\)\w+(?:,\s+)?)+\n?)$/
        );
        let lastRow = 0;
        if (match) {
          lastRow = parseInt(match[1]);
        }
        return [text, lastRow];
      }),
      switchMap(([data, lastRow]: [string, number]) => {
        return forkJoin([
          from(this.projectService.loadPeyote(file.name, data)),
          of(lastRow),
        ]);
      }),
      combineLatestWith(from(this.beadtoolPdfService.renderFrontPage(file))),
      map(([[project, lastRow], image]): [Project, number] => {
        project.image = image;
        project.firstLastAppearanceMap = this.flamService.generateFLAM(
          project.rows
        );
        project.position = { row: 0, step: 0 };
        return [project, lastRow];
      }),
      combineLatestWith(this.settingsService.combine12$),
      map(([[project, lastRow], combine12]: [[Project, number], boolean]) => {
        if (lastRow > 0) {
          if (lastRow !== project.rows.length) {
            this.logger.warn('Row count mismatch');
            this.notificationService.snackbar(
              'Number of rows imported does not match the highest row number in the PDF.  This may be a sign of a failed import.  Please send the file to the developer for review if the import was not successful.'
            );
          }
        }
        return project;
      })
    );
  }

  importRgsFile(file: File) {
    return from(this.file.text()).pipe(
      switchMap((data) => {
        return from(this.projectService.loadPeyote(file.name, data));
      }),
      map((project) => {
        project.firstLastAppearanceMap = this.flamService.generateFLAM(
          project.rows
        );
        project.position = { row: 0, step: 0 };
        return project;
      })
    );
  }

  async extractSection(pdfFile: File) {
    const arrayBuffer = await pdfFile.arrayBuffer();
  }

  ngAfterViewInit() {
    this.sortOrder$ = this.settingsService.projectsort$;
    this.projects$ = from(this.indexedDBService.loadProjects()).pipe(
      combineLatestWith(this.sortOrder$),
      map(([projects, sortOrder]) => {
        return projects.sort((a, b) => {
          if (sortOrder === 'nameAsc') {
            return (a.name ?? '').localeCompare(b.name ?? '');
          } else if (sortOrder === 'nameDesc') {
            return (b.name ?? '').localeCompare(a.name ?? '');
          } else if (sortOrder === 'rowCountAsc') {
            return (a.rows?.length ?? 0) - (b.rows?.length ?? 0);
          } else if (sortOrder === 'rowCountDesc') {
            return (b.rows?.length ?? 0) - (a.rows?.length ?? 0);
          } else if (sortOrder === 'colorCountAsc') {
            return (
              Object.keys(a.firstLastAppearanceMap ?? {}).length -
              Object.keys(b.firstLastAppearanceMap ?? {}).length
            );
          } else if (sortOrder === 'colorCountDesc') {
            return (
              Object.keys(b.firstLastAppearanceMap ?? {}).length -
              Object.keys(a.firstLastAppearanceMap ?? {}).length
            );
          } else if (sortOrder === 'dateAsc') {
            return (a.id ?? 0) - (b.id ?? 0);
          } else if (sortOrder === 'dateDesc') {
            return (b.id ?? 0) - (a.id ?? 0);
          }
          return 0; // Default case
        });
      })
    );
  }
}

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NGXLogger } from 'ngx-logger';
import { ngfModule } from 'angular-file';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MatExpansionModule,
  MatExpansionPanel,
} from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../project.service';
import { MatCardModule } from '@angular/material/card';
import { inflate } from 'pako';
import { CommonModule } from '@angular/common';
import { Project } from '../project';
import { IndexedDBService } from '../indexed-db.service';
import { ProjectSummaryComponent } from '../project-summary/project-summary.component';
import { BeadtoolPdfService } from '../loader/beadtool-pdf.service';
import { FlamService } from '../flam.service';
import { Router } from '@angular/router';
import {
  buffer,
  combineLatestWith,
  from,
  map,
  mergeWith,
  Observable,
  Subject,
  switchMap,
  takeUntil,
  firstValueFrom,
  tap,
  of,
  forkJoin,
} from 'rxjs';
import { NotificationService } from '../notification.service';
import { SettingsService } from '../settings.service';

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
  ],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.scss',
})
export class ProjectSelectorComponent {
  file: File = new File([], '');
  fileData: string = '';
  fileData$: Observable<string> = new Observable<string>();
  projects: Project[] = [];
  showSpinner: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private logger: NGXLogger,
    private projectService: ProjectService,
    private indexedDBService: IndexedDBService,
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
        this.loadProjectsFromIndexedDB();
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
        project.firstLastAppearanceMap = this.flamService.generateFLAM(project);
        project.position = { row: 0, step: 0 };
        return [project, lastRow];
      }),
      combineLatestWith(this.settingsService.combine12$),
      map(([[project, lastRow], combine12]: [[Project, number], boolean]) => {
        if (lastRow > 0) {
          if (
            (combine12 && lastRow !== project.rows.length + 1) ||
            (!combine12 && lastRow !== project.rows.length)
          ) {
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
        project.firstLastAppearanceMap = this.flamService.generateFLAM(project);
        project.position = { row: 0, step: 0 };
        return project;
      })
    );
  }

  async extractSection(pdfFile: File) {
    const arrayBuffer = await pdfFile.arrayBuffer();
  }

  async loadProjectsFromIndexedDB() {
    this.projects = await this.indexedDBService.loadProjects();
  }

  async ngAfterViewInit() {
    await this.loadProjectsFromIndexedDB();
  }
}

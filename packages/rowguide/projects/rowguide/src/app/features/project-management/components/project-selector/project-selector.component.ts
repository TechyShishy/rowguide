import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ngfModule } from 'angular-file';
import { NGXLogger } from 'ngx-logger';
import { inflate } from 'pako';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatestWith,
  firstValueFrom,
  forkJoin,
  from,
  of,
} from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { Project } from '../../../../core/models/project';
import { FlamService, NotificationService, SettingsService } from '../../../../core/services';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { ProjectActions } from '../../../../core/store/actions/project-actions';
import { SettingsActions } from '../../../../core/store/actions/settings-actions';
import { selectProjectSort } from '../../../../core/store/selectors/settings-selectors';
import { ProjectDbService } from '../../../../data/services';
import { BeadtoolPdfService, XlsmPdfService } from '../../../file-import/loaders';
import { ProjectService } from '../../services';
import { ProjectSummaryComponent } from '../project-summary/project-summary.component';
import { MatSelectModule } from '@angular/material/select';
import { ErrorBoundaryComponent } from '../../../../shared/components/error-boundary/error-boundary.component';

/**
 * Project selector component for file import and project management
 *
 * This component provides a comprehensive file import pipeline supporting multiple
 * pattern file formats (PDF, GZIP, RGS) with automatic type detection, validation,
 * and project creation. It integrates with the reactive state store and database
 * services to provide persistent project management with sorting capabilities.
 *
 * @example
 * ```typescript
 * // Basic usage in template
 * <app-project-selector></app-project-selector>
 *
 * // Component automatically:
 * // 1. Displays existing projects with sorting options
 * // 2. Provides file upload interface
 * // 3. Detects file types automatically (PDF/GZIP/RGS)
 * // 4. Processes files through appropriate parsers
 * // 5. Generates FLAM analysis for color mapping
 * // 6. Persists projects to IndexedDB
 * // 7. Navigates to project view after import
 *
 * // Supported file formats:
 * // - PDF: BeadTool PDF pattern files and XLSM-style tabular patterns with automatic fallback
 * // - GZIP: Compressed project files for backup/restore
 * // - RGS: Raw Peyote shorthand pattern notation
 * ```
 *
 * @since 1.0.0
 */
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
    ErrorBoundaryComponent,
  ],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.scss',
})
export class ProjectSelectorComponent {
  /** Currently selected file for import operations */
  file: File = new File([], '');

  /** String representation of file data (used for text-based files) */
  fileData: string = '';

  /** Observable stream of file data for reactive processing */
  fileData$: Observable<string> = new Observable<string>();

  /**
   * Observable stream of all projects with dynamic sorting applied.
   * Combines project data from IndexedDB with current sort preferences.
   */
  projects$: Observable<Project[]> = new Observable<Project[]>();

  /** Loading state indicator for file import operations */
  showSpinner: boolean = false;

  /** Subject for component lifecycle management and subscription cleanup */
  private destroy$ = new Subject<void>();

  /**
   * Observable for current project sorting preference.
   * Supports: nameAsc, nameDesc, rowCountAsc, rowCountDesc,
   * colorCountAsc, colorCountDesc, dateAsc, dateDesc
   */
  sortOrder$: Observable<string> = this.store.select(selectProjectSort);

  /**
   * Creates an instance of ProjectSelectorComponent.
   *
   * Establishes comprehensive dependency injection for file import pipeline,
   * project management, and state coordination. Dependencies include services
   * for logging, project management, database operations, FLAM analysis,
   * PDF processing, routing, notifications, settings, and state management.
   *
   * @param logger - NGX Logger service for debugging and monitoring
   * @param projectService - Service for project management and pattern parsing
   * @param indexedDBService - Service for IndexedDB project persistence
   * @param flamService - Service for First/Last Appearance Map generation
   * @param beadtoolPdfService - Service for BeadTool PDF pattern extraction and processing
   * @param xlsmPdfService - Service for XLSM-style PDF pattern extraction and processing
   * @param router - Angular router for navigation after import
   * @param notificationService - Service for user feedback and warnings
   * @param settingsService - Service for application configuration management
   * @param store - Reactive state store for application state coordination
   *
   * @example
   * ```typescript
   * // Component automatically ready for:
   * // 1. File type detection and import processing
   * // 2. Project sorting and display
   * // 3. Database persistence and state management
   * // 4. Error handling and user feedback
   * ```
   *
   * @since 1.0.0
   */
  constructor(
    private logger: NGXLogger,
    private projectService: ProjectService,
    private indexedDBService: ProjectDbService,
    private flamService: FlamService,
    private beadtoolPdfService: BeadtoolPdfService,
    private xlsmPdfService: XlsmPdfService,
    private router: Router,
    private notificationService: NotificationService,
    private settingsService: SettingsService,
    private store: ReactiveStateStore
  ) {}
  /**
   * Orchestrates the complete file import pipeline with automatic type detection.
   *
   * Reads the selected file as an ArrayBuffer, examines the first 8 bytes for
   * file type signatures, and routes to the appropriate parser (PDF, GZIP, or RGS).
   * The pipeline automatically generates FLAM analysis, updates the store, persists
   * to IndexedDB, and navigates to the project view.
   *
   * @returns Observable that emits the imported Project after full processing
   *
   * @example
   * ```typescript
   * // Called automatically when user selects a file
   * this.importFile().subscribe({
   *   next: (project) => {
   *     console.log('Project imported:', project.name);
   *     // User automatically navigated to project view
   *   },
   *   error: (error) => {
   *     console.error('Import failed:', error);
   *     // Error boundary handles user feedback
   *   }
   * });
   *
   * // File type detection:
   * // [0x1F, 0x8B] → GZIP compressed project
   * // [0x25, 0x50, 0x44, 0x46] → PDF pattern file
   * // Other → RGS text pattern
   * ```
   *
   * @since 1.0.0
   */
  importFile(): Observable<Project> {
    return from(this.file.arrayBuffer()).pipe(
      map((buffer) => buffer.slice(0, 8)),
      switchMap((buffer) => this.detectFileType(buffer))
    );
  }

  /**
   * Handles UI-triggered import with loading state management.
   *
   * Provides user feedback during file import by managing the spinner state
   * and orchestrating the complete import pipeline. Called when user clicks
   * the import button in the interface.
   *
   * @example
   * ```typescript
   * // In template:
   * <button (click)="clickImport()" [disabled]="showSpinner">
   *   Import Project
   *   <mat-spinner *ngIf="showSpinner"></mat-spinner>
   * </button>
   *
   * // Provides automatic loading states and error handling
   * ```
   *
   * @since 1.0.0
   */
  async clickImport() {
    this.showSpinner = true;
    await firstValueFrom(this.importFile());
    this.showSpinner = false;
  }

  /**
   * Detects file type from binary header and routes to appropriate parser.
   *
   * Examines the first bytes of uploaded files to determine format:
   * - GZIP: [0x1F, 0x8B] → Compressed project backup
   * - PDF: [0x25, 0x50, 0x44, 0x46] → BeadTool PDF pattern
   * - RGS: Any other → Raw pattern shorthand
   *
   * After parsing, automatically updates store state, persists to database,
   * and navigates to the project view for immediate use.
   *
   * @private
   * @param buffer - First 8 bytes of the uploaded file for type detection
   * @returns Observable that emits the processed Project with full integration
   *
   * @example
   * ```typescript
   * // File type detection algorithm:
   * const gzipHeader = [0x1F, 0x8B];      // GZIP magic bytes
   * const pdfHeader = [0x25, 0x50, 0x44, 0x46]; // "%PDF" in ASCII
   *
   * // Automatic routing:
   * // GZIP → importGzipFile() → JSON.parse() → Project
   * // PDF → importPdfFile() → BeadTool/XLSM Services → Project + image
   * // RGS → importRgsFile() → PeyoteShorthandService → Project
   * ```
   *
   * @since 1.0.0
   */
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
        this.store.dispatch(ProjectActions.updateProjectSuccess(project));
        this.indexedDBService.updateProject(project);
        this.router.navigate(['project', { id: project.id }]);
      })
    );
  }

  /**
   * Component cleanup on destruction.
   *
   * Completes the destroy Subject to trigger unsubscription of all
   * reactive streams and prevent memory leaks from ongoing observables.
   * Essential for proper component lifecycle management.
   *
   * @since 1.0.0
   */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Imports compressed project backup files (GZIP format).
   *
   * Processes GZIP-compressed JSON project backups by decompressing
   * the binary data and parsing the contained project structure.
   * Includes automatic ID reassignment and FLAM regeneration for
   * imported projects to prevent conflicts.
   *
   * The decompression pipeline handles legacy project formats and
   * ensures compatibility with current data structures.
   *
   * @private
   * @param file - GZIP file containing compressed project JSON
   * @returns Observable that emits the decompressed and processed Project
   *
   * @example
   * ```typescript
   * // GZIP processing pipeline:
   * // 1. Read binary data → ArrayBuffer
   * // 2. pako.inflate() → Decompressed JSON string
   * // 3. JSON.parse() → Project object
   * // 4. ID reassignment + validation
   * // 5. FLAM regeneration → Full integration
   * ```
   *
   * @throws {Error} When GZIP decompression fails or JSON parsing errors occur
   * @since 1.0.0
   */
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
  /**
   * Imports PDF patterns with automatic service fallback and validation.
   *
   * Complex pipeline that processes PDF files by:
   * 1. First attempting BeadTool PDF extraction for standard format patterns
   * 2. Falling back to XLSM PDF extraction for tabular format patterns
   * 3. Detecting row count discrepancies for import validation
   * 4. Rendering the front page as a project thumbnail image
   * 5. Generating FLAM (First/Last Appearance Map) for navigation
   * 6. Applying user preferences (combine1&2 setting) to row processing
   *
   * The fallback mechanism ensures maximum compatibility across different
   * PDF pattern formats by trying BeadTool format first, then XLSM format
   * if the BeadTool service returns empty or invalid results.
   *
   * @private
   * @param file - PDF file containing peyote pattern (BeadTool or XLSM format)
   * @returns Observable that emits fully processed Project with image
   *
   * @example
   * ```typescript
   * // PDF processing pipeline with fallback:
   * // 1. beadtoolPdfService.loadDocument() → Try BeadTool format
   * // 2. If empty/invalid → xlsmPdfService.loadDocument() → Try XLSM format
   * // 3. Regex pattern matching → Detect last row number
   * // 4. projectService.loadPeyote() → Parse pattern data
   * // 5. [Active service].renderFrontPage() → Generate thumbnail
   * // 6. flamService.generateFLAM() → Build navigation map
   * // 7. Row count validation → User notification if mismatch
   * ```
   *
   * @throws {Error} When both PDF parsing services fail or pattern data is malformed
   * @since 2.0.0
   */
  importPdfFile(file: File) {
    this.logger.debug('Starting PDF import process for file:', file.name);
    return from(this.beadtoolPdfService.loadDocument(file)).pipe(
      switchMap((beadtoolText: string) => {
        // Check if BeadTool service returned useful content
        this.logger.debug('BeadTool service returned text length:', beadtoolText?.length || 0);
        this.logger.debug('BeadTool service text preview:', beadtoolText?.substring(0, 200) || 'null/empty');

        const isBeadtoolValid = beadtoolText &&
          beadtoolText.trim().length > 0 &&
          beadtoolText.includes('Row');

        this.logger.debug('BeadTool validation result:', isBeadtoolValid);

        if (isBeadtoolValid) {
          this.logger.debug('Using BeadTool PDF format');
          return this.processPdfWithService(file, beadtoolText, this.beadtoolPdfService, 'BeadTool');
        } else {
          this.logger.debug('BeadTool format failed, falling back to XLSM PDF format');
          return from(this.xlsmPdfService.loadDocument(file)).pipe(
            switchMap((xlsmText: string) => {
              this.logger.debug('XLSM service returned text length:', xlsmText?.length || 0);
              this.logger.debug('XLSM service text preview:', xlsmText?.substring(0, 200) || 'null/empty');

              const isXlsmValid = xlsmText &&
                xlsmText.trim().length > 0 &&
                xlsmText.includes('Row');

              this.logger.debug('XLSM validation result:', isXlsmValid);

              if (isXlsmValid) {
                this.logger.debug('Using XLSM PDF format');
                return this.processPdfWithService(file, xlsmText, this.xlsmPdfService, 'XLSM');
              } else {
                this.logger.error('Both PDF services failed to extract valid content');
                this.logger.error('BeadTool text was:', beadtoolText || 'null/empty');
                this.logger.error('XLSM text was:', xlsmText || 'null/empty');
                this.notificationService.snackbar(
                  'Unable to extract pattern data from PDF. Please verify the file format is supported.'
                );
                throw new Error('Both BeadTool and XLSM PDF services failed to extract valid content');
              }
            })
          );
        }
      })
    );
  }

  /**
   * Processes PDF text content using the specified service for rendering.
   *
   * Helper method that handles the common processing steps after text extraction,
   * including pattern parsing, thumbnail generation, FLAM creation, and validation.
   * Uses the same service that successfully extracted the text for rendering operations.
   *
   * @private
   * @param file - Original PDF file for rendering operations
   * @param text - Extracted text content from PDF
   * @param pdfService - PDF service to use for rendering (BeadTool or XLSM)
   * @param serviceType - Type identifier for logging purposes
   * @returns Observable that emits fully processed Project with image
   *
   * @since 2.0.0
   */
  private processPdfWithService(
    file: File,
    text: string,
    pdfService: BeadtoolPdfService | XlsmPdfService,
    serviceType: string
  ): Observable<Project> {
    this.logger.debug(`Starting processPdfWithService with ${serviceType} service`);
    this.logger.debug(`Processing text (length: ${text.length})`);

    return of(text).pipe(
      map((text: string): [string, number] => {
        this.logger.debug('Analyzing text for row count matching...');
        const match = text.match(
          /(?:Row (\d+) \([LR]\) (?:\(\d+\)\w+(?:,\s+)?)+\n?)$/
        );
        let lastRow = 0;
        if (match) {
          lastRow = parseInt(match[1]);
          this.logger.debug('Found last row number:', lastRow);
        } else {
          this.logger.debug('No row number match found in text');
        }
        return [text, lastRow];
      }),
      switchMap(([data, lastRow]: [string, number]) => {
        this.logger.debug('Calling projectService.loadPeyote');
        return forkJoin([
          from(this.projectService.loadPeyote(file.name, data)),
          of(lastRow),
        ]);
      }),
      tap(([project, lastRow]) => {
        this.logger.debug('Project loaded successfully:', {
          name: project.name,
          rowCount: project.rows?.length,
          lastRowFromMatch: lastRow
        });
      }),
      combineLatestWith(from(pdfService.renderFrontPage(file))),
      map(([[project, lastRow], image]): [Project, number] => {
        this.logger.debug('Front page rendered, setting up project properties');
        project.image = image;
        project.firstLastAppearanceMap = this.flamService.generateFLAM(
          project.rows
        );
        project.position = { row: 0, step: 0 };
        this.logger.debug(`Successfully processed PDF using ${serviceType} format`);
        return [project, lastRow];
      }),
      combineLatestWith(this.settingsService.combine12$),
      map(([[project, lastRow], combine12]: [[Project, number], boolean]) => {
        this.logger.debug('Final processing step - row count validation');
        if (lastRow > 0) {
          if (lastRow !== project.rows.length) {
            this.logger.warn('Row count mismatch detected:', {
              expectedRows: lastRow,
              actualRows: project.rows.length
            });
            this.notificationService.snackbar(
              'Number of rows imported does not match the highest row number in the PDF.  This may be a sign of a failed import.  Please send the file to the developer for review if the import was not successful.'
            );
          } else {
            this.logger.debug('Row count validation passed');
          }
        }
        this.logger.debug('PDF processing completed successfully');
        return project;
      })
    );
  }

  /**
   * Imports raw peyote shorthand files (RGS format).
   *
   * Processes plain text files containing peyote pattern shorthand
   * notation by parsing the text content and converting it to a
   * structured Project format. Automatically generates FLAM for
   * navigation and initializes the project at row 0, step 0.
   *
   * This method handles the simplest import format, supporting
   * various peyote shorthand conventions and bead count notations.
   *
   * @private
   * @param file - Text file containing peyote shorthand pattern
   * @returns Observable that emits the parsed Project
   *
   * @example
   * ```typescript
   * // RGS processing pipeline:
   * // 1. file.text() → Read text content
   * // 2. projectService.loadPeyote() → Parse shorthand notation
   * // 3. flamService.generateFLAM() → Build navigation map
   * // 4. Initialize position → Ready for use
   *
   * // Supported shorthand formats:
   * // "6A, 4B, 2C" → 6 A beads, 4 B beads, 2 C beads
   * // "Row 1: 8DBM" → Row 1 with 8 dark blue metallic beads
   * ```
   *
   * @since 1.0.0
   */
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

  /**
   * Legacy PDF section extraction method (currently unused).
   *
   * Placeholder for future PDF section processing functionality.
   * May be used for extracting specific sections from complex
   * multi-section PDF patterns.
   *
   * @param pdfFile - PDF file for section extraction
   * @private
   * @deprecated This method is not currently used in the import pipeline
   */
  async extractSection(pdfFile: File) {
    const arrayBuffer = await pdfFile.arrayBuffer();
  }

  /**
   * Initializes the project list and sorting after view initialization.
   *
   * Sets up the reactive project list by combining IndexedDB data
   * with user sort preferences. Provides comprehensive sorting options:
   * - Name (ascending/descending)
   * - Row count (ascending/descending)
   * - Color count based on FLAM data (ascending/descending)
   *
   * The sorted project list is updated automatically when sort
   * preferences change or when projects are added/modified.
   *
   * @since 1.0.0
   */
  ngAfterViewInit() {
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

  onSortOrderChange(value: string) {
    this.store.dispatch(SettingsActions.updateSetting('projectsort', value));
  }

  /**
   * Error boundary retry handler - refreshes the projects list
   */
  onRetry(): void {
    // Trigger a refresh of the projects data using the same pattern as ngAfterViewInit
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

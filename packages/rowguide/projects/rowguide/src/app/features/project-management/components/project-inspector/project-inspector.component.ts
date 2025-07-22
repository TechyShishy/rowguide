import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import {
  MatTable,
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';
import { ngfModule } from 'angular-file';
import { NGXLogger } from 'ngx-logger';
import { Observable, firstValueFrom, from, of } from 'rxjs';
import { map, switchMap, take, distinctUntilChanged, shareReplay } from 'rxjs/operators';

import { FLAMRow } from '../../../../core/models/flamrow';
import { Position } from '../../../../core/models/position';
import { Project } from '../../../../core/models/project';
import { FlamService, SettingsService } from '../../../../core/services';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { ProjectActions } from '../../../../core/store/actions/project-actions';
import { SettingsActions } from '../../../../core/store/actions/settings-actions';
import { selectCurrentProject } from '../../../../core/store/selectors/project-selectors';
import { selectFlamSort } from '../../../../core/store/selectors/settings-selectors';
import { ProjectDbService } from '../../../../data/services';
import { ProjectService } from '../../services';
import { ErrorBoundaryComponent } from '../../../../shared/components/error-boundary/error-boundary.component';
import { ConfirmationDialogComponent, ConfirmationDialogData, ConfirmationResult } from '../../../../shared/components/confirmation-dialog';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

/**
 * Project Inspector Component for FLAM (First/Last Appearance Map) Analysis and Visualization.
 *
 * Provides comprehensive project analysis with sortable data tables, color mapping management,
 * and image upload capabilities. Central hub for analyzing pattern complexity and managing
 * bead color assignments with real-time synchronization to the pattern tracking system.
 *
 * **Key Features:**
 * - **FLAM Data Visualization**: Interactive table showing first/last appearances of each pattern element
 * - **Color Management**: Inline editing of color codes with Delica color system integration
 * - **Project Image Upload**: PNG image attachment with validation and persistence
 * - **Dynamic Sorting**: Multi-column sorting with persistent user preferences
 * - **Real-time Updates**: Automatic synchronization with ReactiveStateStore and IndexedDB
 *
 * **FLAM Analysis Capabilities:**
 * - Pattern element tracking across rows and columns
 * - Count aggregation for each unique pattern element
 * - First and last appearance coordinate mapping
 * - Color assignment and hex color preview integration
 *
 * **State Integration:**
 * - ReactiveStateStore for application state management
 * - IndexedDB persistence for project and color data
 * - Real-time FLAM service synchronization
 * - Settings service integration for sort preferences
 *
 * @example
 * ```typescript
 * // In template:
 * <app-project-inspector></app-project-inspector>
 *
 * // The component automatically:
 * // 1. Loads current project FLAM data
 * // 2. Displays sortable analysis table
 * // 3. Provides color editing interface
 * // 4. Handles image upload and validation
 * // 5. Persists changes to database
 * ```
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-project-inspector',
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ngfModule,
    ErrorBoundaryComponent,
  ],
  templateUrl: './project-inspector.component.html',
  styleUrls: ['./project-inspector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectInspectorComponent implements OnInit, AfterViewInit {
  /** Utility for accessing Object.values in templates */
  ObjectValues = Object.values;

  /**
   * Project image observable with fallback to placeholder.
   *
   * Provides reactive image data stream that automatically converts
   * ArrayBuffer image data to base64 data URLs for display. Falls back
   * to a no-image placeholder when project has no attached image.
   *
   * @readonly
   */
  image$: Observable<string> = this.projectService.project$.pipe(
    switchMap(this.loadProjectImage),
    map((image) => (image != '' ? image : 'assets/no-image-available.png'))
  );

  /** File upload container for image attachment */
  file: File = new File([], '');

  /** Reference to color input field for programmatic focus management */
  @ViewChild('colorInput') colorInput!: ElementRef<HTMLInputElement>;

  /** Material Sort component for table column sorting */
  @ViewChild(MatSort) sort!: MatSort;

  /**
   * Material Table component for FLAM data display.
   *
   * Displays comprehensive FLAM analysis with sortable columns for:
   * - Pattern element key/description
   * - First appearance coordinates (row, column)
   * - Last appearance coordinates (row, column)
   * - Total count across entire pattern
   * - Assigned color code and hex preview
   */
  @ViewChild(MatTable) table!: MatTable<{
    key: string;
    firstRow: number;
    firstColumn: number;
    lastRow: number;
    lastColumn: number;
    count: number;
    color: string;
    hexColor: string;
  }>;

  /**
   * Material Table data source for FLAM analysis display.
   *
   * Contains transformed FLAM data optimized for table presentation
   * with integrated color mapping and coordinate display.
   */
  dataSource = new MatTableDataSource<{
    key: string;
    firstRow: number;
    firstColumn: number;
    lastRow: number;
    lastColumn: number;
    count: number;
    color: string;
    hexColor: string;
  }>([]);

  /**
   * Currently editing color key for inline editing state management.
   *
   * Tracks which FLAM row is in edit mode for color assignment.
   * Null when no row is being edited.
   */
  editingColorKey: string | null = null;

  /**
   * Delica color system mapping loaded from JSON configuration.
   *
   * Maps Delica color codes to hex color values for visual preview
   * in the FLAM table. Loaded asynchronously on component init.
   */
  private delicaColors: { [key: string]: string } = {};

  /**
   * TrackBy function for Angular table row optimization.
   *
   * Improves rendering performance by providing stable identity
   * for table rows based on pattern element key.
   *
   * @param index - Row index (unused)
   * @param item - Table row data item
   * @returns Unique identifier for the row
   */
  trackByKey(index: number, item: any): string {
    return item.key;
  }

  /**
   * Component constructor with comprehensive dependency injection.
   *
   * Injects core services for FLAM analysis, project management,
   * settings synchronization, database persistence, HTTP client
   * for color data loading, and change detection management.
   *
   * @param flamService - FLAM generation and management service
   * @param settingsService - User preferences and configuration management
   * @param projectService - Project state and lifecycle management
   * @param logger - Structured logging service for debugging
   * @param cdr - Change detection reference for OnPush optimization
   * @param indexedDBService - Database persistence for projects
   * @param http - HTTP client for loading color configuration
   * @param store - Centralized state management store
   */
  constructor(
    public flamService: FlamService,
    public settingsService: SettingsService,
    public projectService: ProjectService,
    public logger: NGXLogger,
    private cdr: ChangeDetectorRef,
    private indexedDBService: ProjectDbService,
    private http: HttpClient,
    private store: ReactiveStateStore,
    private dialog: MatDialog,
    private errorHandler: ErrorHandlerService
  ) {}

  /**
   * Component initialization with Delica color loading and project readiness.
   *
   * Performs critical initialization tasks:
   * 1. Loads Delica color mapping from JSON configuration file
   * 2. Refreshes table data when colors are available for hex preview
   * 3. Subscribes to project readiness for FLAM data availability
   * 4. Handles color loading errors with appropriate logging
   *
   * The Delica color system provides standardized bead color codes
   * that map to hex values for visual preview in the analysis table.
   *
   * @example
   * ```typescript
   * // Delica color mapping example:
   * {
   *   "DB001": "#FFFFFF",  // White
   *   "DB010": "#000000",  // Black
   *   "DB795": "#FF0000"   // Red
   * }
   * ```
   */
  ngOnInit() {
    // Load delica colors mapping
    this.http
      .get<{ [key: string]: string }>('assets/delica-colors.json')
      .subscribe({
        next: (colors) => {
          this.delicaColors = colors;
          // Refresh the table data to apply hex colors now that delica colors are loaded
          this.refreshTableData();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load delica colors', err);
        },
      });

    this.projectService.ready$.subscribe(async () => {
      //this.flamService.inititalizeFLAM(true);
      this.cdr.markForCheck();
    });
  }

  /**
   * Transforms FLAM row data for table display with color integration.
   *
   * Converts FLAMRow objects into table-compatible format with:
   * - Pattern element key and appearance coordinates
   * - Count aggregation across entire pattern
   * - Color code assignment and hex color preview
   * - Integration with Delica color system for visual feedback
   *
   * @private
   * @param flamRow - FLAM row data from analysis service
   * @returns Table row object with display-optimized properties
   *
   * @example
   * ```typescript
   * // Input FLAMRow:
   * { key: "6A", firstAppearance: [0, 2], lastAppearance: [4, 8],
   *   count: 24, color: "DB001" }
   *
   * // Output table row:
   * { key: "6A", firstRow: 0, firstColumn: 2, lastRow: 4,
   *   lastColumn: 8, count: 24, color: "DB001", hexColor: "#FFFFFF" }
   * ```
   */
  private mapFlamToRow(flamRow: FLAMRow): any {
    return {
      key: flamRow.key,
      firstRow: flamRow.firstAppearance[0],
      firstColumn: flamRow.firstAppearance[1],
      lastRow: flamRow.lastAppearance[0],
      lastColumn: flamRow.lastAppearance[1],
      count: flamRow.count,
      color: flamRow.color ?? '',
      hexColor:
        flamRow.color && this.delicaColors[flamRow.color]
          ? this.delicaColors[flamRow.color]
          : '',
    };
  }

  /**
   * Refreshes table data with current FLAM analysis and color mappings.
   *
   * Re-processes current FLAM data to apply updated color mappings
   * and hex color previews. Triggers change detection for OnPush
   * optimization while maintaining data consistency.
   *
   * Called automatically when Delica colors load or when color
   * assignments are modified.
   *
   * @private
   */
  private refreshTableData(): void {
    // Re-process the current FLAM data to apply hex colors
    const currentFlam = this.flamService.flam$.value;
    const flamArray = Object.values(currentFlam).map((flamRow) =>
      this.mapFlamToRow(flamRow)
    );

    this.dataSource.data = [...flamArray];
  }
  /**
   * View initialization with MatSort setup and FLAM data binding.
   *
   * Critical post-view initialization that establishes:
   * 1. MatSort component validation and setup
   * 2. FLAM data stream subscription with table integration
   * 3. Sort state synchronization with user preferences
   * 4. Bidirectional sort preference persistence
   * 5. Change detection optimization for OnPush strategy
   *
   * **Sort Integration:**
   * - Subscribes to FLAM data changes for automatic table updates
   * - Synchronizes sort state with ReactiveStateStore settings
   * - Persists sort preferences across sessions
   * - Handles sort direction changes with proper state management
   *
   * **Supported Sort Options:**
   * - Pattern key (alphabetical)
   * - First/last appearance coordinates
   * - Bead count (numerical)
   * - Color assignments
   *
   * @example
   * ```typescript
   * // Sort state examples:
   * "keyAsc"        → Sort by pattern key A-Z
   * "countDesc"     → Sort by count highest-lowest
   * "firstRowAsc"   → Sort by first appearance row
   * "colorDesc"     → Sort by color code Z-A
   * ```
   */
  ngAfterViewInit() {
    // Ensure sort is properly initialized before subscribing
    if (!this.sort) {
      this.logger.warn('MatSort not initialized');
      return;
    }

    this.flamService.flam$
      .pipe(
        map((flam) => Object.values(flam)),
        map((flamArray) =>
          flamArray.map((flamRow) => this.mapFlamToRow(flamRow))
        )
      )
      .subscribe((flamRows) => {
        // Create a new array reference to ensure proper change detection
        this.dataSource.data = [...flamRows];
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
        // Mark for check since we're using OnPush change detection
        this.cdr.markForCheck();
      });

    this.sort.sortChange.subscribe(async (sortState: Sort) => {
      const currentFlamsort = await firstValueFrom(
        this.store.select(selectFlamSort)
      );

      // Handle case where direction might be empty string
      if (!sortState.direction) {
        return; // Don't update if no direction is set
      }

      const newFlamsort =
        sortState.active +
        sortState.direction[0].toUpperCase() +
        sortState.direction.slice(1);

      if (newFlamsort !== currentFlamsort) {
        this.store.dispatch(
          SettingsActions.updateSetting('flamsort', newFlamsort)
        );
      }
    });

    this.settingsService.flamsort$.subscribe((flamsort) => {
      this.logger.debug('flamsort', flamsort);

      if (flamsort.endsWith('Asc')) {
        this.sort.direction = 'asc';
        this.sort.active = flamsort.split('Asc')[0];
      } else if (flamsort.endsWith('Desc')) {
        this.sort.direction = 'desc';
        this.sort.active = flamsort.split('Desc')[0];
      } else {
        this.sort.direction = '';
        this.sort.active = '';
      }

      // Emit the sort change to trigger proper sorting with OnPush
      const sortState: Sort = {
        active: this.sort.active,
        direction: this.sort.direction,
      };
      this.sort.sortChange.emit(sortState);

      // Mark for check since we're using OnPush change detection
      this.cdr.markForCheck();
    });
  }

  /**
   * Programmatic focus management for color input field.
   *
   * Provides keyboard-friendly color editing by automatically
   * focusing and selecting the color input when entering edit mode.
   * Essential for accessibility and user experience optimization.
   *
   * @private
   */
  private focusColorInput(): void {
    if (this.colorInput?.nativeElement) {
      this.colorInput.nativeElement.focus();
      this.colorInput.nativeElement.select();
    }
  }

  /**
   * Loads project image from ArrayBuffer and converts to display format.
   *
   * Handles project image loading with comprehensive format conversion:
   * 1. Validates project has attached image data
   * 2. Converts ArrayBuffer to Blob with PNG MIME type
   * 3. Uses FileReader to generate base64 data URL
   * 4. Returns empty string for projects without images
   *   * Supports the image$ observable stream for reactive image display
   * with automatic fallback to placeholder images.
   *
   * @param project - Project with optional image ArrayBuffer
   * @returns Promise resolving to base64 data URL or empty string
   *
   * @example
   * ```typescript
   * // Usage in image$ observable:
   * this.projectService.project$.pipe(
   *   switchMap(this.loadProjectImage),
   *   map(image => image || 'assets/no-image-available.png')
   * )
   * ```
   */
  async loadProjectImage(project: Project): Promise<string> {
    if (project?.image) {
      const reader = new FileReader();
      const result = await new Promise<string>((resolve) => {
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(
          new Blob([project.image ?? new ArrayBuffer(0)], { type: 'image/png' })
        );
      });
      return result;
    }
    return firstValueFrom(of(''));
  }

  /**
   * Handles image upload with PNG validation and project persistence.
   *
   * Comprehensive image upload pipeline that includes:
   * 1. File reading as ArrayBuffer for binary validation
   * 2. PNG header validation using magic bytes ([0x89, 0x50, 0x4E, 0x47...])
   * 3. Current project retrieval from ReactiveStateStore
   * 4. Project update with new image data
   * 5. Database persistence via IndexedDB service
   * 6. Error handling for invalid files or missing projects
   *
   * **Security Features:**
   * - PNG magic byte validation prevents invalid file uploads
   * - Binary validation ensures file integrity   * - Proper error logging for debugging and security audit
   *
   * @returns Promise that resolves when upload completes successfully
   *
   * @example
   * ```typescript
   * // PNG magic bytes validation:
   * const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
   * // ↑ Magic bytes that identify valid PNG files
   *
   * // Usage with file input:
   * <input type="file"
   *        accept="image/png"
   *        (change)="uploadPicture()">
   * ```
   *
   * @throws {Error} When file reading fails or project update encounters errors
   */
  async uploadPicture(): Promise<void> {
    try {
      const buffer = await this.file.arrayBuffer();
      const pngHeader = Uint8Array.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const isPng = new Uint8Array(buffer)
        .subarray(0, 8)
        .every((value, index) => value === pngHeader[index]);

      if (isPng) {
        const project = await firstValueFrom(
          this.store.select(selectCurrentProject)
        );

        if (project) {
          const updatedProject = { ...project, image: buffer };
          this.store.dispatch(
            ProjectActions.updateProjectSuccess(updatedProject)
          );
          await this.indexedDBService.updateProject(updatedProject);
        } else {
          this.logger.error('No project available for image upload');
        }
      }
    } catch (error) {
      this.logger.error('Failed to read file for upload:', error);
    }
  }

  /**
   * Updates FLAM row color assignment with persistence and hex color mapping.
   *
   * Comprehensive color assignment pipeline that includes:
   * 1. FLAM data retrieval and color property update
   * 2. Change detection triggering with new FLAM object creation
   * 3. Project persistence via saveColorMappingsToProject()
   * 4. Hex color mapping using Delica color system
   * 5. Automatic exit from inline editing mode
   *
   * **Color Persistence Flow:**
   * - Updates in-memory FLAM data structure
   * - Saves color mappings to current project
   * - Persists changes to IndexedDB via FLAM service
   * - Updates table display with hex color preview
   *
   * @param flamRow - FLAM row with updated color assignment
   *
   * @example
   * ```typescript
   * // Color assignment example:
   * flamRow.color = "DB001";  // Delica white
   * updateFlamRowColor(flamRow);
   * // Result: Color saved to project, hex #FFFFFF displayed
   * ```
   */
  updateFlamRowColor(flamRow: FLAMRow): void {
    // Update the FLAM data in the service
    const currentFlam = this.flamService.flam$.value;
    if (currentFlam[flamRow.key]) {
      currentFlam[flamRow.key].color = flamRow.color;
      // Create a new FLAM object to trigger proper change detection
      const newFlam = { ...currentFlam };
      this.flamService.flam$.next(newFlam);
      // Save color mappings to project and database
      this.flamService.saveColorMappingsToProject();

      if (flamRow.color && this.delicaColors[flamRow.color]) {
        flamRow.hexColor = this.delicaColors[flamRow.color];
        this.logger.debug(
          `DB color ${flamRow.color} maps to hex ${flamRow.hexColor}`
        );
      }
    }
    // Stop editing when focus is lost
    this.stopEditingColor();
  }

  /**
   * Activates inline color editing mode for specified FLAM row.
   *
   * Initiates color editing workflow by:
   * 1. Setting the editing state to track current row
   * 2. Triggering change detection for UI updates
   * 3. Automatically focusing the color input field
   * 4. Selecting input text for immediate typing
   *
   * Provides keyboard-accessible editing with automatic focus management
   * for improved user experience during color assignment.
   *
   * @param flamRow - FLAM row to enter color editing mode
   */
  startEditingColor(flamRow: FLAMRow): void {
    this.editingColorKey = flamRow.key;
    this.cdr.detectChanges();

    // Focus the input after change detection has completed
    this.focusColorInput();
  }

  /**
   * Exits inline color editing mode and triggers change detection.
   *
   * Completes the color editing workflow by clearing the editing
   * state and marking the component for change detection to update
   * the table display mode.
   */
  stopEditingColor(): void {
    this.editingColorKey = null;
    this.cdr.markForCheck();
  }

  /**
   * Checks if specified FLAM row is currently in color editing mode.
   *
   * Template helper function that determines whether to display
   * the color input field or the static color display for a
   * given table row.
   *
   * @param flamRow - FLAM row to check editing state
   * @returns True if row is in editing mode, false otherwise
   */
  isEditingColor(flamRow: FLAMRow): boolean {
    return this.editingColorKey === flamRow.key;
  }

  /**
   * Resets current project position to origin coordinates with confirmation.
   *
   * Provides safety confirmation dialog before resetting position to prevent
   * accidental data loss. Features:
   * 1. Checks localStorage for "don't ask again" preference
   * 2. Shows confirmation dialog with clear warning message
   * 3. Respects user's "don't ask again" choice and persists preference
   * 4. Executes reset only on user confirmation
   * 5. Provides success feedback after position reset
   *
   * **Safety Features:**
   * - Confirmation dialog prevents accidental resets
   * - "Don't ask again" option for power users
   * - Clear messaging about action consequences
   * - Accessible dialog with keyboard navigation
   *
   * @example
   * ```typescript
   * // Method called from template button click
   * resetPosition(); // Shows confirmation dialog unless disabled
   * ```
   */
  resetPosition(): void {
    const skipConfirmation = localStorage.getItem('skipResetPositionConfirmation') === 'true';

    if (skipConfirmation) {
      // Fire-and-forget: executeReset handles its own errors
      this.executeReset();
      return;
    }

    // Blur any currently focused element to prevent aria-hidden conflicts
    (document.activeElement as HTMLElement)?.blur();

    const dialogData: ConfirmationDialogData = {
      title: 'Reset Position',
      message: 'Are you sure you want to reset your current position to the beginning? This will move you back to row 1, step 1.',
      confirmText: 'Reset Position',
      cancelText: 'Cancel',
      icon: 'restart_alt',
      showDontAskAgain: true,
      customClass: 'reset-position-dialog'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      disableClose: false,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: ConfirmationResult | undefined) => {
      if (result?.result) {
        // User confirmed the reset
        if (result.dontAskAgain) {
          localStorage.setItem('skipResetPositionConfirmation', 'true');
          this.logger.info('User enabled "skip reset confirmation" preference');
        }

        // Fire-and-forget: executeReset handles its own errors  
        this.executeReset();
      } else {
        this.logger.debug('Reset position cancelled by user');
      }
    });
  }

  /**
   * Executes the position reset operation.
   *
   * Private helper method that performs the actual position reset
   * and provides user feedback. Separated from resetPosition()
   * to enable reuse and testing.
   */
  private async executeReset(): Promise<void> {
    try {
      await this.projectService.saveCurrentPosition(0, 0);
      this.logger.info('Project position reset to origin (0, 0)');
      
      // TODO: Consider adding success notification
      // this.errorHandler.showNotification({ 
      //   message: 'Position reset to beginning', 
      //   duration: 3000 
      // });
    } catch (error) {
      // Use the centralized error handler for proper categorization and user feedback
      this.errorHandler.handleError(error, {
        operation: 'resetPosition',
        service: 'ProjectInspectorComponent',
        details: 'Failed to reset project position to origin coordinates',
        context: { targetPosition: { row: 0, step: 0 } }
      }, 'Failed to reset position. Please try again.');
      
      // No re-throw needed - fire-and-forget pattern
      // ErrorHandlerService already handles user notifications and logging
    }
  }

  /**
   * Clears all color assignments from FLAM data with full persistence.
   *
   * Comprehensive color reset operation that:
   * 1. Retrieves current FLAM data from service
   * 2. Clears color property for all pattern elements
   * 3. Creates new FLAM object for change detection
   * 4. Persists changes via saveColorMappingsToProject()
   * 5. Refreshes table display and triggers change detection
   * 6. Logs operation completion for debugging
   *
   * Useful for starting color assignment process over or
   * removing all color mappings for pattern analysis.
   *
   * @example
   * ```typescript
   * // Before: FLAM entries have various color assignments
   * // After: All FLAM entries have color: '' (empty)
   * // Changes persisted to project and database
   * ```
   */
  resetAllColorCodes(): void {
    const currentFlam = this.flamService.flam$.value;

    // Clear all color assignments
    Object.keys(currentFlam).forEach((key) => {
      currentFlam[key].color = '';
    });

    // Create a new FLAM object to trigger proper change detection
    const newFlam = { ...currentFlam };
    this.flamService.flam$.next(newFlam);

    this.flamService.saveColorMappingsToProject();
    this.refreshTableData();
    this.cdr.markForCheck();

    this.logger.debug('All color codes have been reset');
  }

  /**
   * Current position observable from store.
   *
   * Provides reactive access to the current project position for display.
   * Automatically converts from 0-based internal coordinates to 1-based
   * user-friendly display coordinates.
   */
  currentPosition$ = this.store.select(selectCurrentProject).pipe(
    map((project: Project | null) => project?.position || null),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Gets current display row for position indicator.
   *
   * Reactive position display using store integration for real-time updates.
   * Converts 0-based internal row index to 1-based user display format.
   *
   * @returns Current row number for display (1-based)
   */
  getDisplayRow(): Observable<number> {
    return this.currentPosition$.pipe(
      map((position: Position | null) => (position?.row ?? 0) + 1)
    );
  }

  /**
   * Gets current display step for position indicator.
   *
   * Reactive position display using store integration for real-time updates.
   * Converts 0-based internal step index to 1-based user display format.
   *
   * @returns Current step number for display (1-based)
   */
  getDisplayStep(): Observable<number> {
    return this.currentPosition$.pipe(
      map((position: Position | null) => (position?.step ?? 0) + 1)
    );
  }

  /**
   * Handles error recovery by refreshing project inspector data.
   *
   * Implements error boundary integration by refreshing the
   * FLAM table data and triggering change detection when the
   * user clicks retry after an error occurs.
   *
   * Called by ErrorBoundaryComponent retry mechanism to
   * restore component functionality after error recovery.
   */
  onRetry(): void {
    // Refresh the project inspector data when retrying after an error
    this.refreshTableData();
    this.cdr.markForCheck();
  }
}

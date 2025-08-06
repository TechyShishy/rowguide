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
import { NGXLogger } from 'ngx-logger';
import {
  Observable,
  firstValueFrom,
  of,
  from,
  BehaviorSubject,
  combineLatest,
} from 'rxjs';
import {
  map,
  distinctUntilChanged,
  shareReplay,
  switchMap,
  take,
  filter,
  startWith,
  debounceTime,
} from 'rxjs/operators';

import { FLAMRow } from '../../../../core/models/flamrow';
import { Project } from '../../../../core/models/project';
import { FlamService, SettingsService } from '../../../../core/services';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { SettingsActions } from '../../../../core/store/actions/settings-actions';
import { selectCurrentProject } from '../../../../core/store/selectors/project-selectors';
import {
  selectFlamSort,
  selectColorModelPrefix,
} from '../../../../core/store/selectors/settings-selectors';
import { ProjectService } from '../../services';
import { ErrorBoundaryComponent } from '../../../../shared/components/error-boundary/error-boundary.component';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

/**
 * FLAM Analysis Component - Dedicated page for First/Last Appearance Map analysis.
 *
 * Provides comprehensive FLAM visualization and color management functionality
 * extracted from the project inspector for improved maintainability and UX.
 *
 * **Key Features:**
 * - **FLAM Data Visualization**: Interactive table showing first/last appearances of each pattern element
 * - **Color Management**: Inline editing of color codes with Delica color system integration
 * - **Dynamic Sorting**: Multi-column sorting with persistent user preferences
 * - **Real-time Updates**: Automatic synchronization with ReactiveStateStore and FLAM service
 *
 * **FLAM Analysis Capabilities:**
 * - Pattern element tracking across rows and columns
 * - Count aggregation for each unique pattern element
 * - First and last appearance coordinate mapping
 * - Color assignment and hex color preview integration
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-flam-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatSortModule,
    MatTableModule,
    ErrorBoundaryComponent,
  ],
  templateUrl: './flam-analysis.component.html',
  styleUrl: './flam-analysis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlamAnalysisComponent implements OnInit, AfterViewInit {
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
   * Tracks whether auto-prefix was applied to the current editing session.
   *
   * Used to determine cursor positioning behavior:
   * - true: Position cursor after prefix (for auto-prefixed values)
   * - false: Select all text (for manually entered values)
   */
  private autoPrefixApplied: boolean = false;

  /**
   * Observable that emits when both MatSort and data are ready for initialization.
   * This eliminates the need for manual lifecycle tracking flags.
   */
  private sortReady$ = new BehaviorSubject<boolean>(false);

  /**
   * Observable that tracks whether we're currently applying sort from settings.
   * Used to distinguish between user-initiated and programmatic sort changes.
   */
  private applyingSort$ = new BehaviorSubject<boolean>(false);

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
   * Determines if a specific column is currently being sorted.
   *
   * Used for conditional CSS class application to highlight
   * the active sort column in the FLAM table.
   *
   * @param columnName - The column identifier to check
   * @returns true if the column is currently sorted, false otherwise
   */
  isColumnSorted(columnName: string): boolean {
    return this.sort?.active === columnName && this.sort?.direction !== '';
  }

  /**
   * Component constructor with comprehensive dependency injection.
   *
   * Injects core services for FLAM analysis, project management,
   * settings synchronization, HTTP client for color data loading,
   * and change detection management.
   *
   * @param flamService - FLAM generation and management service
   * @param settingsService - User preferences and configuration management
   * @param projectService - Project state and lifecycle management
   * @param logger - Structured logging service for debugging
   * @param cdr - Change detection reference for OnPush optimization
   * @param http - HTTP client for loading color configuration
   * @param store - Centralized state management store
   * @param dialog - Material Dialog service for confirmations
   * @param errorHandler - Error handling service
   */
  constructor(
    public flamService: FlamService,
    public settingsService: SettingsService,
    public projectService: ProjectService,
    public logger: NGXLogger,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private store: ReactiveStateStore,
    private dialog: MatDialog,
    private errorHandler: ErrorHandlerService
  ) {}

  /**
   * Component initialization with Delica color loading and project readiness.
   *
   * Performs critical initialization tasks:
   * 1. Ensures current project is loaded from localStorage if not in store (similar to project component)
   * 2. Loads Delica color mapping from JSON configuration file
   * 3. Refreshes table data when colors are available for hex preview
   * 4. Subscribes to project readiness for FLAM data availability
   * 5. Handles color loading errors with appropriate logging
   */
  ngOnInit() {
    // CRITICAL: Initialize project loading chain similar to project component
    // This ensures the project is loaded in the store and triggers the FLAM service subscription
    this.initializeProjectLoading();

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
      this.cdr.markForCheck();
    });
  }
  /**
   * Initialize project loading chain similar to project component pattern.
   * Creates project observable that loads from route params or localStorage,
   * and subscribes to trigger the loading process.
   */
  private initializeProjectLoading(): void {
    const project$ = this.store.select(selectCurrentProject).pipe(
      take(1),
      switchMap((storeProject) => {
        if (storeProject) {
          return of(storeProject);
        }

        // No project in store, try to load from localStorage
        const currentProjectId = localStorage.getItem('currentProject');

        if (currentProjectId) {
          const projectId = parseInt(currentProjectId, 10);
          // Convert promise to observable using from()
          return from(this.projectService.loadProject(projectId)).pipe(
            map((project) => project || null)
          );
        }

        this.logger.warn('No project ID in localStorage');
        return of(null);
      })
    ); // CRITICAL: Subscribe to trigger the loading chain and set up reactive FLAM subscription
    project$.subscribe((project) => {
      if (project) {
        // Set up reactive subscription to FLAM data changes
        this.subscribeToFlamUpdates();
      } else {
        this.logger.warn('No project available for FLAM Analysis');
      }
    });
  }

  /**
   * Sets up reactive subscription to FLAM data updates.
   *
   * This ensures the table is updated whenever FLAM data changes,
   * including the initial load and any subsequent updates.
   * Uses smart diffing to prevent unnecessary data source regeneration.
   */
  private subscribeToFlamUpdates(): void {
    this.flamService.flam$
      .pipe(
        filter((flam) => Object.keys(flam).length > 0),
        map((flam) => Object.values(flam)),
        map((flamArray) =>
          flamArray.map((flamRow) => this.mapFlamToRow(flamRow))
        )
      )
      .subscribe((newFlamRows) => {
        // Smart update: only regenerate data source if structure changed
        if (this.shouldRegenerateDataSource(newFlamRows)) {
          this.dataSource.data = [...newFlamRows];

          // Signal that sort is ready if we have both data and MatSort
          if (this.sort) {
            this.dataSource.sort = this.sort;
            this.sortReady$.next(true);
          }
        } else {
          this.updateDataSourceInPlace(newFlamRows);
        }

        this.cdr.markForCheck();
      });
  }

  /**
   * Determines if the data source needs to be completely regenerated.
   * Returns true if the structure (keys, counts, positions) has changed.
   * Returns false if only colors have changed.
   */
  private shouldRegenerateDataSource(newFlamRows: any[]): boolean {
    const currentData = this.dataSource.data;

    // If no current data, definitely need to regenerate
    if (currentData.length === 0) {
      return true;
    }

    // If length changed, need to regenerate
    if (currentData.length !== newFlamRows.length) {
      return true;
    }

    // Check if structural data changed (everything except color and hexColor)
    for (let i = 0; i < currentData.length; i++) {
      const current = currentData[i];
      const newRow = newFlamRows[i];

      if (
        current.key !== newRow.key ||
        current.firstRow !== newRow.firstRow ||
        current.firstColumn !== newRow.firstColumn ||
        current.lastRow !== newRow.lastRow ||
        current.lastColumn !== newRow.lastColumn ||
        current.count !== newRow.count
      ) {
        return true; // Structural change detected
      }
    }

    // CRITICAL: Also check if only color changed (not hexColor)
    // If only hexColor changed due to delica colors loading, use in-place update
    let onlyHexColorChanged = true;
    for (let i = 0; i < currentData.length; i++) {
      const current = currentData[i];
      const newRow = newFlamRows[i];

      // If color field itself changed, we need regeneration for proper tracking
      if (current.color !== newRow.color) {
        onlyHexColorChanged = false;
        break;
      }
    }

    // If only hex colors changed (due to delica colors loading), use in-place update
    if (onlyHexColorChanged) {
      return false;
    }

    return false; // Only color changes
  }

  /**
   * Updates the existing data source in-place, preserving the array reference
   * to maintain sort state. Only updates color-related properties.
   */
  private updateDataSourceInPlace(newFlamRows: any[]): void {
    const currentData = this.dataSource.data;

    for (let i = 0; i < currentData.length && i < newFlamRows.length; i++) {
      const current = currentData[i];
      const newRow = newFlamRows[i];

      // Only update color-related properties
      if (current.color !== newRow.color) {
        current.color = newRow.color;
      }
      if (current.hexColor !== newRow.hexColor) {
        current.hexColor = newRow.hexColor;
      }
    }

    // Trigger change detection without regenerating the data array
    this.dataSource._updateChangeSubscription();
  }

  /**
   * View initialization - sets up reactive sort management.
   *
   * Uses a purely reactive approach that eliminates the need for lifecycle flags.
   */
  ngAfterViewInit() {
    // Signal that MatSort is available and check if we already have data
    if (this.sort) {
      if (this.dataSource.data.length > 0) {
        this.dataSource.sort = this.sort;
        this.sortReady$.next(true);
      }

      // Set up reactive sort management
      this.setupReactiveSortManagement();
    }
  }

  /**
   * Sets up reactive sort management using observables instead of flags.
   * This approach is cleaner and more maintainable than manual state tracking.
   */
  private setupReactiveSortManagement(): void {
    if (!this.sort) return;

    // 1. Set up user-initiated sort change handling
    const userSortChanges$ = this.sort.sortChange.pipe(
      filter(() => !this.applyingSort$.value), // Only process user-initiated changes
      map((sortState) => ({
        active: sortState.active,
        direction: sortState.direction,
      }))
    );

    // 2. Save user sort changes to settings
    userSortChanges$.subscribe(async (sortState) => {
      if (!sortState.direction) return;

      const newFlamsort =
        sortState.active +
        sortState.direction[0].toUpperCase() +
        sortState.direction.slice(1);

      const currentFlamsort = await firstValueFrom(
        this.store.select(selectFlamSort)
      );

      if (newFlamsort !== currentFlamsort) {
        this.store.dispatch(
          SettingsActions.updateSetting('flamsort', newFlamsort)
        );
      }
    });

    // 3. Apply sort settings when sort becomes ready
    combineLatest([this.sortReady$, this.settingsService.flamsort$])
      .pipe(
        filter(
          ([ready, flamsort]) =>
            ready && !this.applyingSort$.value && !!flamsort
        ),
        map(([ready, flamsort]) => flamsort),
        distinctUntilChanged()
      )
      .subscribe((flamsort) => {
        this.applySort(flamsort);
      });
  }

  /**
   * Get current sort state as a settings string.
   * @returns The current sort as a string (e.g., 'countAsc', 'keyDesc')
   */
  private getCurrentSortString(): string {
    if (!this.sort || !this.sort.active || !this.sort.direction) {
      return '';
    }

    return (
      this.sort.active +
      this.sort.direction[0].toUpperCase() +
      this.sort.direction.slice(1)
    );
  }

  /**
   * Applies sort state from settings string using reactive approach.
   */
  private applySort(flamsort: string): void {
    if (!this.sort || this.dataSource.data.length === 0) return;

    const currentSortString = this.getCurrentSortString();
    if (currentSortString === flamsort) return;

    // Signal that we're applying sort programmatically
    this.applyingSort$.next(true);

    let newActive = '';
    let newDirection: '' | 'asc' | 'desc' = '';

    if (flamsort.endsWith('Asc')) {
      newDirection = 'asc';
      newActive = flamsort.split('Asc')[0];
    } else if (flamsort.endsWith('Desc')) {
      newDirection = 'desc';
      newActive = flamsort.split('Desc')[0];
    }

    if (newActive && newDirection) {
      const mockSortable = {
        id: newActive,
        start: newDirection as 'asc' | 'desc',
        disableClear: false,
      };
      this.sort.sort(mockSortable);

      // Reset the applying flag immediately after sort is triggered
      // The sort.sort() call is synchronous, so the flag can be reset right away
      this.applyingSort$.next(false);
    }

    this.cdr.markForCheck();
  }

  /**
   * Error boundary retry handler.
   *
   * Provides recovery mechanism for error boundary component.
   * Reloads component state and triggers change detection.
   */
  onRetry(): void {
    this.logger.info('Retrying FLAM analysis component initialization');
    this.ngOnInit();
    this.cdr.markForCheck();
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
   */
  private mapFlamToRow(flamRow: FLAMRow): any {
    return {
      key: flamRow.key,
      firstRow: flamRow.firstAppearance[0],
      firstColumn: flamRow.firstAppearance[1],
      lastRow: flamRow.lastAppearance[0],
      lastColumn: flamRow.lastAppearance[1],
      count: flamRow.count,
      color: (flamRow.color ?? '').trim(), // Trim whitespace for display
      hexColor:
        flamRow.color && this.delicaColors[flamRow.color.trim()]
          ? this.delicaColors[flamRow.color.trim()]
          : '',
    };
  }

  /**
   * Refreshes table data with current FLAM analysis and color mappings.
   *
   * Re-processes current FLAM data to apply updated color mappings
   * and hex color previews. Uses smart update logic to preserve sort state.
   */
  private refreshTableData(): void {
    const currentFlam = this.flamService.flam$.value;

    // Early return if no FLAM data to avoid disrupting table state
    if (Object.keys(currentFlam).length === 0) {
      return;
    }

    // Don't refresh if data source isn't initialized yet
    if (this.dataSource.data.length === 0) {
      this.logger.warn(
        'refreshTableData called before data source initialized - skipping to avoid disruption'
      );
      return;
    }

    const flamArray = Object.values(currentFlam).map((flamRow) =>
      this.mapFlamToRow(flamRow)
    );

    // Use smart update logic to preserve sort state when only colors change
    if (this.shouldRegenerateDataSource(flamArray)) {
      // Preserve current sort state before regenerating
      const currentSortActive = this.sort?.active;
      const currentSortDirection = this.sort?.direction;

      this.dataSource.data = [...flamArray];

      // Restore sort state after data regeneration
      if (this.sort && currentSortActive && currentSortDirection) {
        // Signal that we're applying sort programmatically
        this.applyingSort$.next(true);

        const mockSortable = {
          id: currentSortActive,
          start: currentSortDirection as 'asc' | 'desc',
          disableClear: false,
        };

        this.sort.sort(mockSortable);

        // Reset the applying flag immediately after sort is triggered
        // The sort.sort() call is synchronous, so the flag can be reset right away
        this.applyingSort$.next(false);
      }

      // Ensure sort is ready if we have data and MatSort
      if (this.sort && this.dataSource.data.length > 0) {
        this.dataSource.sort = this.sort;
        this.sortReady$.next(true);
      }
    } else {
      this.updateDataSourceInPlace(flamArray);
    }
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
      const input = this.colorInput.nativeElement;

      // Get the current FLAM row data to determine actual value
      const currentFlam = this.flamService.flam$.value;
      const currentRow = currentFlam[this.editingColorKey || ''];
      const actualValue = currentRow?.color || '';

      // Ensure input value matches the FLAM data
      if (input.value !== actualValue) {
        input.value = actualValue;
      }

      input.focus();

      // Determine cursor behavior based on whether auto-prefix was applied
      if (this.autoPrefixApplied) {
        // For auto-prefixed values, position cursor at end to allow immediate typing
        const value = input.value || '';
        input.setSelectionRange(value.length, value.length);
      } else {
        // For manually entered values, select all text (existing behavior)
        input.select();
      }
    }
  }

  /**
   * Applies auto-prefix to color codes based on settings configuration.
   *
   * @private
   * @param flamRow - FLAM row to potentially apply prefix to
   * @returns Promise<boolean> - Whether prefix was applied
   */
  private async applyAutoPrefixIfNeeded(flamRow: FLAMRow): Promise<boolean> {
    try {
      const colorModelPrefix = await firstValueFrom(
        this.store.select(selectColorModelPrefix)
      );

      if (colorModelPrefix && (!flamRow.color || flamRow.color.trim() === '')) {
        flamRow.color = colorModelPrefix;
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to apply auto-prefix', error);
      return false;
    }
  }

  /**
   * Updates FLAM row color assignment with persistence and validation.
   *
   * Handles comprehensive color update workflow including:
   * - FLAM service data synchronization
   * - Project database persistence via FLAM service
   * - Hex color preview integration with Delica color system
   * - Change detection triggers for reactive UI updates
   * - Automatic exit from inline editing mode
   *
   * @param flamRow - FLAM row with updated color assignment
   */
  updateFlamRowColor(flamRow: FLAMRow): void {
    // Trim whitespace from color value
    if (flamRow.color) {
      flamRow.color = flamRow.color.trim();
    }

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
   * @param flamRow - FLAM row to enter color editing mode
   */
  startEditingColor(flamRow: FLAMRow): void {
    // Apply auto-prefix for empty color fields and track result (fire-and-forget)
    this.applyAutoPrefixIfNeeded(flamRow).then((applied) => {
      this.autoPrefixApplied = applied;
    });

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
    this.autoPrefixApplied = false; // Reset auto-prefix flag
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
   * Resets all FLAM color code assignments with user confirmation.
   *
   * Provides bulk color management by clearing all color assignments
   * from the current FLAM analysis data. Changes are immediately
   * persisted to the project database and reflected in the UI.
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
  }
}

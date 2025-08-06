import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { ngfModule } from 'angular-file';
import { NGXLogger } from 'ngx-logger';
import { Observable, firstValueFrom, from, of } from 'rxjs';
import { map, switchMap, distinctUntilChanged, shareReplay } from 'rxjs/operators';

import { Position } from '../../../../core/models/position';
import { Project } from '../../../../core/models/project';
import { SettingsService } from '../../../../core/services';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { ProjectActions } from '../../../../core/store/actions/project-actions';
import { selectCurrentProject } from '../../../../core/store/selectors/project-selectors';
import { ProjectDbService } from '../../../../data/services';
import { ProjectService } from '../../services';
import { ErrorBoundaryComponent } from '../../../../shared/components/error-boundary/error-boundary.component';
import { ConfirmationDialogComponent, ConfirmationDialogData, ConfirmationResult } from '../../../../shared/components/confirmation-dialog';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

/**
 * Project Inspector Component for Project Information Display.
 *
 * Provides project overview with summary information, position tracking,
 * and image upload capabilities. Now focused on project management features
 * with FLAM analysis moved to dedicated `/flam-analysis` route.
 *
 * **Key Features:**
 * - **Project Summary**: Basic project information display
 * - **Position Tracking**: Current position display and reset functionality
 * - **Project Image Upload**: PNG image attachment with validation and persistence
 * - **Responsive Design**: Optimized for all screen sizes
 * - **Error Handling**: Comprehensive error boundary integration
 *
 * **State Integration:**
 * - ReactiveStateStore for application state management
 * - IndexedDB persistence for project data
 * - Settings service integration for user preferences
 *
 * @example
 * ```typescript
 * // In template:
 * <app-project-inspector></app-project-inspector>
 *
 * // The component automatically:
 * // 1. Loads current project data
 * // 2. Displays project summary
 * // 3. Shows current position
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
    MatButtonModule,
    MatDialogModule,
    ngfModule,
    ErrorBoundaryComponent,
  ],
  templateUrl: './project-inspector.component.html',
  styleUrl: './project-inspector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectInspectorComponent implements OnInit {
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

  /**
   * Component constructor with comprehensive dependency injection.
   *
   * Injects core services for project management, settings synchronization,
   * database persistence, and change detection management.
   *
   * @param settingsService - User preferences and configuration management
   * @param projectService - Project state and lifecycle management
   * @param logger - Structured logging service for debugging
   * @param cdr - Change detection reference for OnPush optimization
   * @param indexedDBService - Database persistence for projects
   * @param store - Centralized state management store
   * @param dialog - Material Dialog service for modals
   * @param errorHandler - Error handling and recovery service
   */
  constructor(
    public settingsService: SettingsService,
    public projectService: ProjectService,
    public logger: NGXLogger,
    private cdr: ChangeDetectorRef,
    private indexedDBService: ProjectDbService,
    private store: ReactiveStateStore,
    private dialog: MatDialog,
    private errorHandler: ErrorHandlerService
  ) {}

  /**
   * Component initialization.
   *
   * Performs basic initialization for project display functionality.
   * Sets up subscriptions for project readiness state.
   */
  ngOnInit() {
    this.projectService.ready$.subscribe(async () => {
      this.cdr.markForCheck();
    });
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
   * Handles error recovery for the error boundary component.
   *
   * Provides basic error recovery by triggering change detection
   * to refresh the component state after an error occurs.
   */
  onRetry(): void {
    this.cdr.markForCheck();
  }
}

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map, distinctUntilChanged } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';

import { ReactiveStateStore } from '../store/reactive-state-store';
import { MarkModeActions } from '../store/actions/mark-mode-actions';
import {
  selectCurrentMarkMode,
  selectPreviousMarkMode,
  selectMarkModeHistory,
  selectCanUndoMarkMode,
  selectIsDefaultMarkMode,
} from '../store/selectors/mark-mode-selectors';
import { selectCurrentProject } from '../store/selectors/project-selectors';
import { ProjectActions } from '../store/actions/project-actions';
import { Project, hasValidId } from '../models';
import { ErrorHandlerService } from './error-handler.service';
import { ProjectDbService } from '../../data/services/project-db.service';

/**
 * Service for managing mark mode state in the pattern tracking application.
 * Handles mode switching, history tracking, undo functionality, and project-based
 * persistence for bead marking states.
 *
 * Mark modes represent different states for pattern step interaction:
 * - 0: Default/neutral mode (no special marking)
 * - 1: First mark state (typically for starting beads)
 * - 2: Second mark state (progress tracking)
 * - 3+: Additional marking states as needed
 *
 * Features:
 * - Reactive mark mode state management
 * - Mode history tracking with undo capability
 * - Project-based persistent storage
 * - Integration with global application state
 * - Real-time mode change notifications
 * - Default mode restoration functionality
 * - Automatic mark mode synchronization with project data
 *
 * @example
 * ```typescript
 * // Basic usage
 * constructor(private markModeService: MarkModeService) {}
 *
 * // Subscribe to mode changes
 * this.markModeService.markModeChanged$.subscribe(mode => {
 *   this.updateUIForMode(mode);
 * });
 *
 * // Set specific modes (automatically saved to project)
 * this.markModeService.setMarkMode(1); // Set to first mark state
 * this.markModeService.updateMarkMode(2); // Update to second mark state
 *
 * // Mode management
 * this.markModeService.resetMarkMode(); // Return to default
 * this.markModeService.undoMarkMode(); // Revert to previous mode
 *
 * // Check mode state
 * this.markModeService.canUndo$.subscribe(canUndo => {
 *   this.undoButton.disabled = !canUndo;
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MarkModeService {
  /**
   * Observable stream of the current mark mode number.
   * Primary source for reactive UI updates when mark mode changes.
   *
   * @example
   * ```typescript
   * this.markModeService.markModeChanged$.subscribe(mode => {
   *   this.applyMarkModeStyles(mode);
   *   this.updateBeadColors(mode);
   * });
   * ```
   */
  markModeChanged$: Observable<number> = this.store.select(
    selectCurrentMarkMode
  );

  /**
   * Observable stream of the previous mark mode (undefined if no history).
   * Useful for implementing custom undo UI and understanding mode transitions.
   */
  previousMode$: Observable<number | undefined> = this.store.select(
    selectPreviousMarkMode
  );

  /**
   * Observable stream of the complete mark mode history array.
   * Provides access to full mode change sequence for advanced debugging.
   */
  history$: Observable<number[]> = this.store.select(selectMarkModeHistory);

  /**
   * Observable boolean indicating whether undo operation is available.
   * Enables/disables undo UI elements based on history state.
   */
  canUndo$: Observable<boolean> = this.store.select(selectCanUndoMarkMode);

  /**
   * Observable boolean indicating whether currently in default mode (0).
   * Useful for conditional UI rendering and mode-specific behaviors.
   */
  isDefault$: Observable<boolean> = this.store.select(selectIsDefaultMarkMode);

  /**
   * Creates an instance of MarkModeService.
   *
   * @param store - The reactive state store for mark mode state management
   * @param logger - NGX logger for debugging and error tracking
   * @param errorHandler - Service for handling and reporting errors
   * @param projectDbService - Service for persisting project data to database
   */
  constructor(
    private store: ReactiveStateStore,
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService,
    private projectDbService: ProjectDbService
  ) {
    this.initializeMarkModeSync();
  }

  /**
   * Updates the current mark mode with history tracking and project persistence.
   * Records the previous mode in history for undo functionality and automatically
   * saves the mark mode to the current project for cross-session continuity.
   * Use this method when you want full history tracking of mode changes.
   *
   * @param mode - The new mark mode number (typically 0-3, but supports any positive integer)
   *
   * @example
   * ```typescript
   * // Cycle through marking modes with history
   * let currentMode = 0;
   *
   * onStepClick() {
   *   currentMode = (currentMode + 1) % 4; // Cycle 0-3
   *   this.markModeService.updateMarkMode(currentMode);
   * }
   *
   * // Set specific mode based on user action
   * onMarkComplete() {
   *   this.markModeService.updateMarkMode(3); // Completion state
   * }
   * ```
   */
  updateMarkMode(mode: number): void {
    this.store.dispatch(MarkModeActions.updateMarkMode(mode));
    // Fire and forget the async save operation
    this.saveMarkModeToProject(mode).catch(error => {
      this.logger.error('Failed to save mark mode to project:', error);
    });
  }

  /**
   * Sets the mark mode directly without history tracking but with project persistence.
   * Simpler alternative to updateMarkMode() when history management isn't needed.
   * Use for initialization or when you want to avoid creating history entries.
   * Mark mode is automatically saved to the current project.
   *
   * @param mode - The mark mode number to set immediately
   *
   * @example
   * ```typescript
   * // Initialize mode without history
   * ngOnInit() {
   *   this.markModeService.setMarkMode(0); // Start in default mode
   * }
   *
   * // Quick mode switching without undo tracking
   * onQuickMark() {
   *   this.markModeService.setMarkMode(1); // Jump to mark mode 1
   * }
   * ```
   */
  setMarkMode(mode: number): void {
    this.store.dispatch(MarkModeActions.setMarkMode(mode));
    // Fire and forget the async save operation
    this.saveMarkModeToProject(mode).catch(error => {
      this.logger.error('Failed to save mark mode to project:', error);
    });
  }

  /**
   * Resets the mark mode to the default state (mode 0) with project persistence.
   * Provides a quick way to return to the neutral marking state.
   * Commonly used for clearing all markings or starting fresh.
   * Mark mode is automatically saved to the current project.
   *
   * @example
   * ```typescript
   * // Reset after completing a section
   * onSectionComplete() {
   *   this.markModeService.resetMarkMode();
   *   this.notificationService.success('Section completed!');
   * }
   *
   * // Reset on navigation
   * onNavigateToNewRow() {
   *   this.markModeService.resetMarkMode();
   * }
   *
   * // Emergency reset
   * onClearAllMarks() {
   *   this.markModeService.resetMarkMode();
   * }
   * ```
   */
  resetMarkMode(): void {
    this.store.dispatch(MarkModeActions.resetMarkMode());
    // Fire and forget the async save operation
    this.saveMarkModeToProject(0).catch(error => {
      this.logger.error('Failed to save mark mode to project:', error);
    });
  }

  /**
   * Reverts to the previous mark mode if available in history with project persistence.
   * Implements undo functionality for mark mode changes, providing user-friendly
   * correction of accidental mode switches. No-op if no previous mode exists.
   * Mark mode is automatically saved to the current project after undo.
   *
   * @example
   * ```typescript
   * // Undo button implementation
   * onUndoClick() {
   *   this.markModeService.undoMarkMode();
   * }
   *
   * // Keyboard shortcut for undo
   * @HostListener('keydown', ['$event'])
   * onKeyDown(event: KeyboardEvent) {
   *   if (event.ctrlKey && event.key === 'z') {
   *     this.markModeService.undoMarkMode();
   *   }
   * }
   *
   * // Conditional undo with validation
   * onUndoWithCheck() {
   *   this.markModeService.canUndo$.pipe(take(1)).subscribe(canUndo => {
   *     if (canUndo) {
   *       this.markModeService.undoMarkMode();
   *     }
   *   });
   * }
   * ```
   */
  undoMarkMode(): void {
    // Get current state to find previous mode
    const currentState = this.store.getState();
    const previousMode = currentState.markMode.previousMode;

    if (previousMode !== undefined) {
      this.store.dispatch(MarkModeActions.setMarkMode(previousMode));
      // Fire and forget the async save operation
      this.saveMarkModeToProject(previousMode).catch(error => {
        this.logger.error('Failed to save mark mode to project:', error);
      });
    }
  }

  /**
   * Initializes mark mode service with project-based state synchronization.
   * Sets up automatic mark mode loading when projects change and handles
   * initial state setup for the service.
   *
   * @private
   */
  private initializeMarkModeSync(): void {
    try {
      // Subscribe to project changes to load mark mode from each project
      this.store.select(selectCurrentProject).pipe(
        filter(project => hasValidId(project)),
        map(project => project.markMode ?? 0),
        distinctUntilChanged()
      ).subscribe(markMode => {
        this.loadMarkModeFromProject(markMode);
      });

      this.logger.debug('Mark mode service initialized with project-based synchronization');
    } catch (error) {
      this.logger.warn('Failed to initialize mark mode service with project sync');
      this.errorHandler.handleError(
        error,
        {
          operation: 'initializeMarkModeSync',
          details: 'Failed to initialize mark mode service with project synchronization',
        },
        'Mark mode settings may not work properly. Please refresh the page.',
        'medium'
      );
    }
  }

  /**
   * Loads mark mode from the current project and applies it to the store.
   * Called when a project is loaded or when the project's mark mode changes.
   *
   * @param markMode - The mark mode value from the project
   * @private
   */
  private loadMarkModeFromProject(markMode: number): void {
    try {
      // Validate mark mode value
      if (typeof markMode !== 'number' || markMode < 0) {
        this.logger.warn('Invalid mark mode value from project, using default:', markMode);
        markMode = 0;
      }

      // Set the mark mode in the store without triggering a save back to project
      this.store.dispatch(MarkModeActions.setMarkMode(markMode));
      this.logger.debug('Mark mode loaded from project:', markMode);
    } catch (error) {
      this.logger.error('Error loading mark mode from project:', error);
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadMarkModeFromProject',
          details: 'Failed to load mark mode from project',
          markMode: markMode,
        },
        'Unable to load mark mode from project. Using default mode.',
        'low'
      );
    }
  }

  /**
   * Saves the current mark mode to the active project.
   * Updates the project's markMode property and triggers a project update
   * in both the store and the database.
   *
   * @param markMode - The mark mode value to save to the project
   * @private
   */
  private async saveMarkModeToProject(markMode: number): Promise<void> {
    try {
      const currentState = this.store.getState();
      const currentProjectId = currentState.projects.currentProjectId;

      if (!currentProjectId) {
        this.logger.debug('No active project to save mark mode to');
        return;
      }

      // Get the current project from entities
      const currentProject = currentState.projects.entities[currentProjectId];
      
      if (!currentProject) {
        this.logger.debug('Current project not found in entities');
        return;
      }

      // Update the project with the new mark mode
      const updatedProject: Project = {
        ...currentProject,
        markMode: markMode
      };

      // Dispatch the project update to the store
      this.store.dispatch(ProjectActions.updateProjectSuccess(updatedProject));
      
      // Save to database
      await this.projectDbService.updateProject(updatedProject);
      
      this.logger.debug('Mark mode saved to project and database:', markMode);
    } catch (error) {
      this.logger.error('Error saving mark mode to project:', error);
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveMarkModeToProject',
          details: 'Failed to save mark mode to project',
          markMode: markMode,
        },
        'Unable to save mark mode to project. Mark mode may not persist.',
        'medium'
      );
    }
  }
}

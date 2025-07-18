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
 * Service for managing mark mode state and marked steps in the pattern tracking application.
 * Handles mode switching, history tracking, undo functionality, and project-based
 * persistence for individual step markings.
 *
 * Mark modes represent different states for pattern step interaction:
 * - 0: Default/neutral mode (no special marking)
 * - 1: First mark state (typically for starting beads)
 * - 2: Second mark state (progress tracking)
 * - 3+: Additional marking states as needed
 *
 * Features:
 * - Reactive mark mode state management for current active mode
 * - Mode history tracking with undo capability
 * - Project-based persistent storage for individual step markings
 * - Integration with global application state
 * - Real-time mode change notifications
 * - Default mode restoration functionality
 * - Individual step marking persistence across sessions
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
 * // Set specific modes (for the current active marking mode)
 * this.markModeService.setMarkMode(1); // Set to first mark state
 * this.markModeService.updateMarkMode(2); // Update to second mark state
 *
 * // Mark/unmark individual steps
 * this.markModeService.markStep(0, 3, 2); // Mark row 0, step 3 with mode 2
 * this.markModeService.unmarkStep(0, 3); // Remove marking from row 0, step 3
 *
 * // Check step marking
 * const stepMark = this.markModeService.getStepMark(0, 3); // Get mark for row 0, step 3
 *
 * // Mode management
 * this.markModeService.resetMarkMode(); // Return to default
 * this.markModeService.undoMarkMode(); // Revert to previous mode
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
    this.logger.debug('MarkModeService initialized');
  }

  /**
   * Updates the current mark mode with history tracking.
   * Records the previous mode in history for undo functionality.
   * Use this method when you want full history tracking of mode changes.
   * Note: This only affects the current active marking mode, not individual step markings.
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
  }

  /**
   * Sets the mark mode directly without history tracking.
   * Simpler alternative to updateMarkMode() when history management isn't needed.
   * Use for initialization or when you want to avoid creating history entries.
   * Note: This only affects the current active marking mode, not individual step markings.
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
  }

  /**
   * Resets the mark mode to the default state (mode 0).
   * Provides a quick way to return to the neutral marking state.
   * Commonly used for clearing all markings or starting fresh.
   * Note: This only affects the current active marking mode, not individual step markings.
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
  }

  /**
   * Reverts to the previous mark mode if available in history.
   * Implements undo functionality for mark mode changes, providing user-friendly
   * correction of accidental mode switches. No-op if no previous mode exists.
   * Note: This only affects the current active marking mode, not individual step markings.
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
    }
  }

  /**
   * Marks a specific step with the given mark mode value and persists to project.
   * Creates or updates the step marking using structured data format and automatically saves to the database.
   *
   * @param rowIndex - Zero-based index of the row containing the step
   * @param stepIndex - Zero-based index of the step within the row
   * @param markMode - The mark mode value to apply to the step (1-6, use 0 to unmark)
   *
   * @example
   * ```typescript
   * // Mark step for progress tracking
   * this.markModeService.markStep(0, 3, 2); // Mark row 0, step 3 with mode 2
   *
   * // Mark multiple steps
   * for (let i = 0; i < 5; i++) {
   *   this.markModeService.markStep(currentRow, i, 1);
   * }
   * ```
   */
  async markStep(rowIndex: number, stepIndex: number, markMode: number): Promise<void> {
    try {
      const currentState = this.store.getState();
      const currentProjectId = currentState.projects.currentProjectId;

      if (!currentProjectId) {
        this.logger.debug('No active project to save step marking to');
        return;
      }

      const currentProject = currentState.projects.entities[currentProjectId];
      
      if (!currentProject) {
        this.logger.debug('Current project not found in entities');
        return;
      }

      // Update the project with the new step marking using structured format
      const updatedMarkedSteps = { ...currentProject.markedSteps };
      
      if (markMode === 0) {
        // Remove the marking if mode is 0
        if (updatedMarkedSteps[rowIndex]) {
          const { [stepIndex]: removed, ...remainingSteps } = updatedMarkedSteps[rowIndex];
          if (Object.keys(remainingSteps).length === 0) {
            delete updatedMarkedSteps[rowIndex];
          } else {
            updatedMarkedSteps[rowIndex] = remainingSteps;
          }
        }
      } else {
        // Add or update the marking
        if (!updatedMarkedSteps[rowIndex]) {
          updatedMarkedSteps[rowIndex] = {};
        }
        updatedMarkedSteps[rowIndex] = { ...updatedMarkedSteps[rowIndex], [stepIndex]: markMode };
      }

      const updatedProject: Project = {
        ...currentProject,
        markedSteps: updatedMarkedSteps
      };

      // Dispatch the project update to the store
      this.store.dispatch(ProjectActions.updateProjectSuccess(updatedProject));
      
      // Save to database
      await this.projectDbService.updateProject(updatedProject);
      
      this.logger.debug(`Step marking saved: row ${rowIndex}, step ${stepIndex} = ${markMode}`);
    } catch (error) {
      this.logger.error('Error marking step:', error);
      this.errorHandler.handleError(
        error,
        {
          operation: 'markStep',
          details: 'Failed to mark step',
          rowIndex,
          stepIndex,
          markMode,
        },
        'Unable to save step marking. Marking may not persist.',
        'medium'
      );
    }
  }

  /**
   * Removes marking from a specific step and persists to project.
   * Convenience method equivalent to markStep(rowIndex, stepIndex, 0).
   *
   * @param rowIndex - Zero-based index of the row containing the step
   * @param stepIndex - Zero-based index of the step within the row
   *
   * @example
   * ```typescript
   * // Remove marking from step
   * this.markModeService.unmarkStep(0, 3); // Remove marking from row 0, step 3
   * ```
   */
  async unmarkStep(rowIndex: number, stepIndex: number): Promise<void> {
    await this.markStep(rowIndex, stepIndex, 0);
  }

  /**
   * Gets the current mark mode value for a specific step.
   * Returns 0 if the step is not marked.
   *
   * @param rowIndex - Zero-based index of the row containing the step
   * @param stepIndex - Zero-based index of the step within the row
   * @returns The mark mode value for the step (0 if unmarked)
   *
   * @example
   * ```typescript
   * // Check step marking
   * const stepMark = this.markModeService.getStepMark(0, 3);
   * if (stepMark > 0) {
   *   console.log(`Step is marked with mode ${stepMark}`);
   * }
   * ```
   */
  getStepMark(rowIndex: number, stepIndex: number): number {
    try {
      const currentState = this.store.getState();
      const currentProjectId = currentState.projects.currentProjectId;

      if (!currentProjectId) {
        return 0;
      }

      const currentProject = currentState.projects.entities[currentProjectId];
      
      if (!currentProject?.markedSteps) {
        return 0;
      }

      return currentProject.markedSteps[rowIndex]?.[stepIndex] ?? 0;
    } catch (error) {
      this.logger.error('Error getting step mark:', error);
      return 0;
    }
  }

  /**
   * Gets all marked steps for the current project.
   * Returns a copy of the marked steps object to prevent direct mutation.
   *
   * @returns Object mapping row indices to step index mappings with mark mode values
   *
   * @example
   * ```typescript
   * // Get all marked steps
   * const markedSteps = this.markModeService.getAllMarkedSteps();
   * Object.entries(markedSteps).forEach(([rowIndex, stepMap]) => {
   *   Object.entries(stepMap).forEach(([stepIndex, markMode]) => {
   *     console.log(`Row ${rowIndex}, Step ${stepIndex}: Mark Mode ${markMode}`);
   *   });
   * });
   * ```
   */
  getAllMarkedSteps(): { [rowIndex: number]: { [stepIndex: number]: number } } {
    try {
      const currentState = this.store.getState();
      const currentProjectId = currentState.projects.currentProjectId;

      if (!currentProjectId) {
        return {};
      }

      const currentProject = currentState.projects.entities[currentProjectId];
      
      // Deep copy the marked steps structure
      const markedSteps = currentProject?.markedSteps || {};
      const copy: { [rowIndex: number]: { [stepIndex: number]: number } } = {};
      
      Object.entries(markedSteps).forEach(([rowIndex, stepMap]) => {
        copy[Number(rowIndex)] = { ...stepMap };
      });
      
      return copy;
    } catch (error) {
      this.logger.error('Error getting all marked steps:', error);
      return {};
    }
  }

  /**
   * Clears all marked steps from the current project.
   *
   * @example
   * ```typescript
   * // Clear all markings
   * this.markModeService.clearAllMarkedSteps();
   * ```
   */
  async clearAllMarkedSteps(): Promise<void> {
    try {
      const currentState = this.store.getState();
      const currentProjectId = currentState.projects.currentProjectId;

      if (!currentProjectId) {
        this.logger.debug('No active project to clear marked steps from');
        return;
      }

      const currentProject = currentState.projects.entities[currentProjectId];
      
      if (!currentProject) {
        this.logger.debug('Current project not found in entities');
        return;
      }

      const updatedProject: Project = {
        ...currentProject,
        markedSteps: {}
      };

      // Dispatch the project update to the store
      this.store.dispatch(ProjectActions.updateProjectSuccess(updatedProject));
      
      // Save to database
      await this.projectDbService.updateProject(updatedProject);
      
      this.logger.debug('All marked steps cleared');
    } catch (error) {
      this.logger.error('Error clearing marked steps:', error);
      this.errorHandler.handleError(
        error,
        {
          operation: 'clearAllMarkedSteps',
          details: 'Failed to clear all marked steps',
        },
        'Unable to clear step markings. Some markings may persist.',
        'medium'
      );
    }
  }

  /**
   * Gets an observable stream for a specific step's mark mode that updates when project data changes.
   * This enables reactive updates to step components when marked steps are modified.
   *
   * @param rowIndex - Zero-based index of the row containing the step
   * @param stepIndex - Zero-based index of the step within the row
   * @returns Observable that emits the current mark mode value for the step
   *
   * @example
   * ```typescript
   * // Subscribe to step mark changes for reactive UI updates
   * this.markModeService.getStepMark$(0, 3).subscribe(markMode => {
   *   this.stepMarked = markMode;
   *   this.updateStepVisuals();
   * });
   * ```
   */
  getStepMark$(rowIndex: number, stepIndex: number): Observable<number> {
    return this.store.select(selectCurrentProject).pipe(
      filter(project => project !== null),
      map(project => project?.markedSteps?.[rowIndex]?.[stepIndex] ?? 0),
      distinctUntilChanged()
    );
  }
}

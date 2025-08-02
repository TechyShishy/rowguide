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
import { SafeAccess } from '../models/model-factory';
import { ErrorHandlerService } from './error-handler.service';
import { ProjectDbService } from '../../data/services/project-db.service';

/**
 * Service for managing mark mode state and marked steps/rows in the pattern tracking application.
 * Handles mode switching, history tracking, undo functionality, and project-based
 * persistence for individual step and row markings.
 *
 * Mark modes represent different states for pattern step/row interaction:
 * - 0: Default/neutral mode (no special marking)
 * - 1: First mark state (typically for starting beads or progress tracking)
 * - 2: Second mark state (progress tracking or errors)
 * - 3+: Additional marking states as needed
 *
 * Features:
 * - Reactive mark mode state management for current active mode
 * - Mode history tracking with undo capability
 * - Project-based persistent storage for individual step and row markings
 * - Integration with global application state
 * - Real-time mode change notifications
 * - Default mode restoration functionality
 * - Individual step and row marking persistence across sessions
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
 * // Mark/unmark entire rows
 * this.markModeService.markRow(2, 3); // Mark row 2 with mode 3
 * this.markModeService.unmarkRow(2); // Remove marking from row 2
 *
 * // Check markings
 * const stepMark = this.markModeService.getStepMark(0, 3); // Get mark for row 0, step 3
 * const rowMark = this.markModeService.getRowMark(2); // Get mark for row 2
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
   * Observable boolean indicating whether item marking (both steps and rows) is currently enabled.
   * Returns true when in an active mark mode (> 0), false when in default mode (0).
   * Enables components to reactively respond to marking availability for both step and row marking.
   *
   * @example
   * ```typescript
   * this.markModeService.canMarkItems$.subscribe(canMark => {
   *   this.itemClickBehavior = canMark ? 'mark' : 'navigate';
   *   this.updateCursorStyle();
   * });
   * ```
   */
  canMarkItems$: Observable<boolean> = this.store.select(selectCurrentMarkMode).pipe(
    map(mode => mode > 0),
    distinctUntilChanged()
  );

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
   * Checks if item marking (both steps and rows) is currently enabled (active mark mode > 0).
   * Returns true when in an active mark mode, false when in default mode (0).
   *
   * @returns Boolean indicating whether item marking is currently allowed
   *
   * @example
   * ```typescript
   * // Check before performing marking operation
   * if (this.markModeService.canMarkItems()) {
   *   await this.markModeService.toggleStepMark(0, 3);
   *   // or
   *   await this.markModeService.toggleRowMark(2);
   * } else {
   *   this.handleNavigationClick();
   * }
   * ```
   *
   * @see {@link canMarkItems$} For reactive observable version
   */
  canMarkItems(): boolean {
    const currentState = this.store.getState();
    return currentState.markMode.currentMode > 0;
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
   * Toggles a step's marking state between unmarked (0) and the current active mark mode.
   * Implements the core toggle logic for step interactions in mark mode.
   * 
   * If the step is currently marked with the active mode, it becomes unmarked (0).
   * If the step is unmarked or marked with a different mode, it gets marked with the current active mode.
   *
   * @param rowIndex - Zero-based index of the row containing the step
   * @param stepIndex - Zero-based index of the step within the row
   * @returns Promise resolving to the new mark mode value that was applied
   *
   * @example
   * ```typescript
   * // User clicks step in mark mode
   * const newMarkMode = await this.markModeService.toggleStepMark(0, 3);
   * console.log(`Step is now marked with mode: ${newMarkMode}`);
   * 
   * // Toggle sequence with current mark mode = 2:
   * await this.toggleStepMark(0, 3); // Step unmarked → marked with 2, returns 2
   * await this.toggleStepMark(0, 3); // Step marked with 2 → unmarked, returns 0
   * await this.toggleStepMark(0, 3); // Step unmarked → marked with 2, returns 2
   * ```
   */
  async toggleStepMark(rowIndex: number, stepIndex: number): Promise<number> {
    const currentState = this.store.getState();
    const currentMarkMode = currentState.markMode.currentMode;
    
    // Don't toggle if not in an active mark mode
    if (currentMarkMode === 0) {
      return 0;
    }
    
    const currentStepMark = this.getStepMark(rowIndex, stepIndex);
    const newMarkMode = currentStepMark === currentMarkMode ? 0 : currentMarkMode;
    
    await this.markStep(rowIndex, stepIndex, newMarkMode);
    
    this.logger.debug(`Step toggle completed: row ${rowIndex}, step ${stepIndex}, ${currentStepMark} → ${newMarkMode}`);
    return newMarkMode;
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
   * Marks multiple steps with the current active mark mode in a single operation.
   * Efficient for batch marking operations like marking an entire row or range.
   *
   * @param steps - Array of step coordinates to mark
   * @returns Promise resolving to the number of successfully marked steps
   *
   * @example
   * ```typescript
   * // Mark multiple steps at once
   * const stepsToMark = [
   *   { rowIndex: 0, stepIndex: 1 },
   *   { rowIndex: 0, stepIndex: 2 },
   *   { rowIndex: 1, stepIndex: 0 }
   * ];
   * const markedCount = await this.markModeService.markMultipleSteps(stepsToMark);
   * console.log(`Successfully marked ${markedCount} steps`);
   * ```
   */
  async markMultipleSteps(steps: Array<{ rowIndex: number; stepIndex: number }>): Promise<number> {
    const currentState = this.store.getState();
    const currentMarkMode = currentState.markMode.currentMode;
    
    if (currentMarkMode === 0) {
      this.logger.debug('Cannot batch mark steps: not in active mark mode');
      return 0;
    }

    let successCount = 0;
    for (const { rowIndex, stepIndex } of steps) {
      await this.markStep(rowIndex, stepIndex, currentMarkMode);
      successCount++;
    }

    this.logger.debug(`Batch marking completed: ${successCount}/${steps.length} steps marked`);
    return successCount;
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

  // ================================
  // ROW MARKING METHODS
  // ================================

  /**
   * Marks a specific row with the given mark mode value and persists to project.
   * Creates or updates the row marking using structured data format and automatically saves to the database.
   *
   * @param rowIndex - Zero-based index of the row to mark
   * @param markMode - The mark mode value to apply to the row (1-6, use 0 to unmark)
   *
   * @example
   * ```typescript
   * // Mark row for progress tracking
   * this.markModeService.markRow(2, 3); // Mark row 2 with mode 3
   *
   * // Mark multiple rows
   * for (let i = 0; i < 5; i++) {
   *   this.markModeService.markRow(i, 1);
   * }
   * ```
   */
  async markRow(rowIndex: number, markMode: number): Promise<void> {
    try {
      const currentState = this.store.getState();
      const currentProjectId = currentState.projects.currentProjectId;

      if (!currentProjectId) {
        this.logger.debug('No active project to save row marking to');
        return;
      }

      const currentProject = currentState.projects.entities[currentProjectId];
      
      if (!currentProject) {
        this.logger.debug('Current project not found in entities');
        return;
      }

      // Update the project with the new row marking using SafeAccess
      let updatedProject: Project;
      
      if (markMode === 0) {
        // Remove the marking if mode is 0
        const updatedMarkedRows = { ...currentProject.markedRows };
        delete updatedMarkedRows[rowIndex];
        updatedProject = {
          ...currentProject,
          markedRows: updatedMarkedRows
        };
      } else {
        // Add or update the marking using SafeAccess
        const updatedProjectResult = SafeAccess.setRowMark(currentProject, rowIndex, markMode);
        if (!updatedProjectResult) {
          this.logger.error('Failed to set row mark: SafeAccess returned null');
          return;
        }
        updatedProject = updatedProjectResult;
      }

      // Dispatch the project update to the store
      this.store.dispatch(ProjectActions.updateProjectSuccess(updatedProject));
      
      // Save to database
      await this.projectDbService.updateProject(updatedProject);
      
      this.logger.debug(`Row marking saved: row ${rowIndex} = ${markMode}`);
    } catch (error) {
      this.logger.error('Error marking row:', error);
      this.errorHandler.handleError(
        error,
        {
          operation: 'markRow',
          details: 'Failed to mark row',
          rowIndex,
          markMode,
        },
        'Unable to save row marking. Marking may not persist.',
        'medium'
      );
    }
  }

  /**
   * Removes marking from a specific row and persists to project.
   * Convenience method equivalent to markRow(rowIndex, 0).
   *
   * @param rowIndex - Zero-based index of the row to unmark
   *
   * @example
   * ```typescript
   * // Remove marking from row
   * this.markModeService.unmarkRow(2); // Remove marking from row 2
   * ```
   */
  async unmarkRow(rowIndex: number): Promise<void> {
    await this.markRow(rowIndex, 0);
  }

  /**
   * Toggles a row's marking state between unmarked (0) and the current active mark mode.
   * Implements the core toggle logic for row interactions in mark mode.
   * 
   * If the row is currently marked with the active mode, it becomes unmarked (0).
   * If the row is unmarked or marked with a different mode, it gets marked with the current active mode.
   *
   * @param rowIndex - Zero-based index of the row to toggle
   * @returns Promise resolving to the new mark mode value that was applied
   *
   * @example
   * ```typescript
   * // User clicks row header in mark mode
   * const newMarkMode = await this.markModeService.toggleRowMark(2);
   * console.log(`Row is now marked with mode: ${newMarkMode}`);
   * 
   * // Toggle sequence with current mark mode = 2:
   * await this.toggleRowMark(2); // Row unmarked → marked with 2, returns 2
   * await this.toggleRowMark(2); // Row marked with 2 → unmarked, returns 0
   * await this.toggleRowMark(2); // Row unmarked → marked with 2, returns 2
   * ```
   */
  async toggleRowMark(rowIndex: number): Promise<number> {
    const currentState = this.store.getState();
    const currentMarkMode = currentState.markMode.currentMode;
    
    // Don't toggle if not in an active mark mode
    if (currentMarkMode === 0) {
      return 0;
    }
    
    const currentRowMark = this.getRowMark(rowIndex);
    const newMarkMode = currentRowMark === currentMarkMode ? 0 : currentMarkMode;
    
    await this.markRow(rowIndex, newMarkMode);
    
    this.logger.debug(`Row toggle completed: row ${rowIndex}, ${currentRowMark} → ${newMarkMode}`);
    return newMarkMode;
  }

  /**
   * Gets the current mark mode value for a specific row.
   * Returns 0 if the row is not marked.
   *
   * @param rowIndex - Zero-based index of the row
   * @returns The mark mode value for the row (0 if unmarked)
   *
   * @example
   * ```typescript
   * // Check row marking
   * const rowMark = this.markModeService.getRowMark(2);
   * if (rowMark > 0) {
   *   console.log(`Row is marked with mode ${rowMark}`);
   * }
   * ```
   */
  getRowMark(rowIndex: number): number {
    try {
      const currentState = this.store.getState();
      const currentProjectId = currentState.projects.currentProjectId;

      if (!currentProjectId) {
        return 0;
      }

      const currentProject = currentState.projects.entities[currentProjectId];
      
      if (!currentProject) {
        return 0;
      }

      return SafeAccess.getRowMark(currentProject, rowIndex);
    } catch (error) {
      this.logger.error('Error getting row mark:', error);
      return 0;
    }
  }

  /**
   * Gets all marked rows for the current project.
   * Returns a copy of the marked rows object to prevent direct mutation.
   *
   * @returns Object mapping row indices to mark mode values
   *
   * @example
   * ```typescript
   * // Get all marked rows
   * const markedRows = this.markModeService.getAllMarkedRows();
   * Object.entries(markedRows).forEach(([rowIndex, markMode]) => {
   *   console.log(`Row ${rowIndex}: Mark Mode ${markMode}`);
   * });
   * ```
   */
  getAllMarkedRows(): { [rowIndex: number]: number } {
    try {
      const currentState = this.store.getState();
      const currentProjectId = currentState.projects.currentProjectId;

      if (!currentProjectId) {
        return {};
      }

      const currentProject = currentState.projects.entities[currentProjectId];
      
      if (!currentProject) {
        return {};
      }

      return SafeAccess.getMarkedRows(currentProject);
    } catch (error) {
      this.logger.error('Error getting all marked rows:', error);
      return {};
    }
  }

  /**
   * Clears all marked rows from the current project.
   *
   * @example
   * ```typescript
   * // Clear all row markings
   * this.markModeService.clearAllMarkedRows();
   * ```
   */
  async clearAllMarkedRows(): Promise<void> {
    try {
      const currentState = this.store.getState();
      const currentProjectId = currentState.projects.currentProjectId;

      if (!currentProjectId) {
        this.logger.debug('No active project to clear marked rows from');
        return;
      }

      const currentProject = currentState.projects.entities[currentProjectId];
      
      if (!currentProject) {
        this.logger.debug('Current project not found in entities');
        return;
      }

      const updatedProject: Project = {
        ...currentProject,
        markedRows: {}
      };

      // Dispatch the project update to the store
      this.store.dispatch(ProjectActions.updateProjectSuccess(updatedProject));
      
      // Save to database
      await this.projectDbService.updateProject(updatedProject);
      
      this.logger.debug('All marked rows cleared');
    } catch (error) {
      this.logger.error('Error clearing marked rows:', error);
      this.errorHandler.handleError(
        error,
        {
          operation: 'clearAllMarkedRows',
          details: 'Failed to clear all marked rows',
        },
        'Unable to clear row markings. Some markings may persist.',
        'medium'
      );
    }
  }

  /**
   * Gets an observable stream for a specific row's mark mode that updates when project data changes.
   * This enables reactive updates to row components when marked rows are modified.
   *
   * @param rowIndex - Zero-based index of the row
   * @returns Observable that emits the current mark mode value for the row
   *
   * @example
   * ```typescript
   * // Subscribe to row mark changes for reactive UI updates
   * this.markModeService.getRowMark$(2).subscribe(markMode => {
   *   this.rowMarked = markMode;
   *   this.updateRowVisuals();
   * });
   * ```
   */
  getRowMark$(rowIndex: number): Observable<number> {
    return this.store.select(selectCurrentProject).pipe(
      filter(project => project !== null),
      map(project => SafeAccess.getRowMark(project!, rowIndex)),
      distinctUntilChanged()
    );
  }
}

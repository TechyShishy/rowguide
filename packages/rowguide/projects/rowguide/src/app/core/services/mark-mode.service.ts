import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
import { MarkModeState } from '../store/reducers/mark-mode-reducer';
import { ErrorHandlerService } from './error-handler.service';

/**
 * Service for managing mark mode state in the pattern tracking application.
 * Handles mode switching, history tracking, undo functionality, and persistence
 * for bead marking states across sessions.
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
 * - Persistent storage using localStorage
 * - Integration with global application state
 * - Real-time mode change notifications
 * - Default mode restoration functionality
 * - Automatic state persistence on changes
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
 * // Set specific modes (automatically persisted)
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
   */
  constructor(
    private store: ReactiveStateStore,
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService
  ) {
    this.initializeMarkMode();
  }

  /**
   * Updates the current mark mode with history tracking and state persistence.
   * Records the previous mode in history for undo functionality and automatically
   * persists the state to localStorage for cross-session continuity.
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
    this.saveMarkModeToStorage();
  }

  /**
   * Sets the mark mode directly without history tracking but with persistence.
   * Simpler alternative to updateMarkMode() when history management isn't needed.
   * Use for initialization or when you want to avoid creating history entries.
   * State is automatically persisted to localStorage.
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
    this.saveMarkModeToStorage();
  }

  /**
   * Resets the mark mode to the default state (mode 0) with persistence.
   * Provides a quick way to return to the neutral marking state.
   * Commonly used for clearing all markings or starting fresh.
   * State is automatically persisted to localStorage.
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
    this.saveMarkModeToStorage();
  }

  /**
   * Reverts to the previous mark mode if available in history with persistence.
   * Implements undo functionality for mark mode changes, providing user-friendly
   * correction of accidental mode switches. No-op if no previous mode exists.
   * State is automatically persisted to localStorage after undo.
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
      this.saveMarkModeToStorage();
    }
  }

  /**
   * Initializes mark mode service with persistent state loading.
   * Attempts to load previous mark mode state from localStorage and
   * applies it to the store. If no stored state exists or loading fails,
   * uses default state values.
   *
   * @private
   */
  private initializeMarkMode(): void {
    try {
      this.loadMarkModeFromStorage();
      this.logger.debug('Mark mode service initialized with persistent state');
    } catch (error) {
      this.logger.warn('Failed to initialize mark mode from storage, using defaults');
      this.errorHandler.handleError(
        error,
        {
          operation: 'initializeMarkMode',
          details: 'Failed to initialize mark mode from localStorage',
          storageType: 'localStorage',
          storageKey: 'markMode',
        },
        'Mark mode settings could not be restored. Using default settings.',
        'low'
      );
    }
  }

  /**
   * Loads mark mode state from localStorage and applies it to the store.
   * Handles missing storage, invalid JSON, and provides fallback to default values.
   * Follows the same pattern as SettingsService for consistency.
   *
   * @private
   */
  private loadMarkModeFromStorage(): void {
    try {
      const storedData = localStorage.getItem('markMode');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        
        // Validate the stored data structure
        if (parsed && typeof parsed === 'object' && typeof parsed.currentMode === 'number') {
          // Create a valid MarkModeState object with defaults for missing properties
          const markModeState: MarkModeState = {
            currentMode: parsed.currentMode ?? 0,
            previousMode: parsed.previousMode,
            history: Array.isArray(parsed.history) ? parsed.history : [],
            lastUpdated: parsed.lastUpdated ?? Date.now(),
            changeCount: parsed.changeCount ?? 0,
          };
          
          // Apply the loaded state to the store
          this.store.dispatch(MarkModeActions.setMarkMode(markModeState.currentMode));
          this.logger.debug('Mark mode state loaded from storage:', markModeState);
        } else {
          this.logger.warn('Invalid mark mode data structure in storage, using defaults');
        }
      } else {
        this.logger.debug('No stored mark mode data found, using defaults');
      }
    } catch (error) {
      this.logger.error('Error loading mark mode from storage:', error);
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadMarkModeFromStorage',
          details: 'Failed to load mark mode from localStorage',
          storageType: 'localStorage',
          storageKey: 'markMode',
        },
        'Unable to load your mark mode settings. Default settings will be used.',
        'medium'
      );
    }
  }

  /**
   * Saves the current mark mode state to localStorage.
   * Handles serialization and storage errors with appropriate error reporting.
   * Follows the same pattern as SettingsService for consistency.
   *
   * @private
   */
  private saveMarkModeToStorage(): void {
    try {
      const currentState = this.store.getState();
      const markModeState = currentState.markMode;
      
      // Store the complete mark mode state
      localStorage.setItem('markMode', JSON.stringify(markModeState));
      this.logger.debug('Mark mode state saved to storage:', markModeState);
    } catch (error) {
      this.logger.error('Error saving mark mode to storage:', error);
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveMarkModeToStorage',
          details: 'Failed to save mark mode to localStorage',
          storageType: 'localStorage',
          storageKey: 'markMode',
        },
        'Unable to save your mark mode settings. They may not persist after refreshing.',
        'medium'
      );
    }
  }
}

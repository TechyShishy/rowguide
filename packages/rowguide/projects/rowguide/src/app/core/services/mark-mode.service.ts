import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ReactiveStateStore } from '../store/reactive-state-store';
import { MarkModeActions } from '../store/actions/mark-mode-actions';
import { 
  selectCurrentMarkMode,
  selectPreviousMarkMode,
  selectMarkModeHistory,
  selectCanUndoMarkMode,
  selectIsDefaultMarkMode
} from '../store/selectors/mark-mode-selectors';

@Injectable({
  providedIn: 'root',
})
export class MarkModeService {
  // Store-based observables replace Subject
  markModeChanged$: Observable<number> = this.store.select(selectCurrentMarkMode);
  
  // Additional observables for enhanced functionality
  previousMode$: Observable<number | undefined> = this.store.select(selectPreviousMarkMode);
  history$: Observable<number[]> = this.store.select(selectMarkModeHistory);
  canUndo$: Observable<boolean> = this.store.select(selectCanUndoMarkMode);
  isDefault$: Observable<boolean> = this.store.select(selectIsDefaultMarkMode);

  constructor(private store: ReactiveStateStore) {}

  /**
   * Update the current mark mode
   * @param mode The new mark mode number
   */
  updateMarkMode(mode: number): void {
    this.store.dispatch(MarkModeActions.updateMarkMode(mode));
  }

  /**
   * Set the mark mode (simpler version of update)
   * @param mode The mark mode number to set
   */
  setMarkMode(mode: number): void {
    this.store.dispatch(MarkModeActions.setMarkMode(mode));
  }

  /**
   * Reset mark mode to default (0)
   */
  resetMarkMode(): void {
    this.store.dispatch(MarkModeActions.resetMarkMode());
  }

  /**
   * Undo to previous mark mode (if available)
   */
  undoMarkMode(): void {
    // Get current state to find previous mode
    const currentState = this.store.getState();
    const previousMode = currentState.markMode.previousMode;
    
    if (previousMode !== undefined) {
      this.store.dispatch(MarkModeActions.setMarkMode(previousMode));
    }
  }
}

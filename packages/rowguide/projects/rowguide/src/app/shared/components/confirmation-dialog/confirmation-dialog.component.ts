import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

/**
 * Data structure for confirmation dialog configuration.
 *
 * Provides flexible configuration for confirmation dialogs with
 * customizable text, buttons, and optional "don't ask again" functionality.
 */
export interface ConfirmationDialogData {
  /** Dialog title displayed in the header */
  title: string;

  /** Main message explaining the action and consequences */
  message: string;

  /** Text for the confirmation button (defaults to 'Confirm') */
  confirmText?: string;

  /** Text for the cancel button (defaults to 'Cancel') */
  cancelText?: string;

  /** Whether to show the "Don't ask again" checkbox */
  showDontAskAgain?: boolean;

  /** Material icon name to display in the dialog */
  icon?: string;

  /** Additional CSS class for styling customization */
  customClass?: string;
}

/**
 * Result structure returned when dialog is closed.
 *
 * Contains the user's choice and preference for future confirmations.
 */
export interface ConfirmationResult {
  /** Whether the user confirmed or cancelled the action */
  result: boolean;

  /** Whether the user chose to skip future confirmations */
  dontAskAgain: boolean;
}

/**
 * ConfirmationDialogComponent - Reusable Safety Confirmation Dialog
 *
 * A sophisticated Angular Material dialog component for confirming potentially
 * destructive or important actions. Provides clear messaging, accessible design,
 * and optional "don't ask again" functionality for power users.
 *
 * **Features:**
 * - **Configurable messaging**: Customize title, message, and button text
 * - **Safety-first design**: Cancel button is default focus for safety
 * - **Accessibility**: Full keyboard navigation and screen reader support
 * - **User preference**: Optional "don't ask again" checkbox with persistence
 * - **Material Design**: Follows Angular Material design guidelines
 * - **Flexible styling**: Support for custom CSS classes
 *
 * @example
 * ```typescript
 * // Basic usage
 * const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
 *   width: '400px',
 *   data: {
 *     title: 'Confirm Deletion',
 *     message: 'Are you sure you want to delete this item? This action cannot be undone.',
 *     confirmText: 'Delete',
 *     cancelText: 'Cancel',
 *     icon: 'warning'
 *   }
 * });
 *
 * dialogRef.afterClosed().subscribe(result => {
 *   if (result?.result) {
 *     // User confirmed the action
 *     this.performDeletion();
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With "don't ask again" functionality
 * const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
 *   data: {
 *     title: 'Reset Position',
 *     message: 'Reset your progress to the beginning?',
 *     showDontAskAgain: true
 *   }
 * });
 *
 * dialogRef.afterClosed().subscribe(result => {
 *   if (result?.result) {
 *     if (result.dontAskAgain) {
 *       localStorage.setItem('skipResetConfirmation', 'true');
 *     }
 *     this.resetPosition();
 *   }
 * });
 * ```
 *
 * @see {@link ConfirmationDialogData} For configuration options
 * @see {@link ConfirmationResult} For result structure
 * @since 1.0.0
 */
@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule
  ],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss'
})
export class ConfirmationDialogComponent {
  /**
   * User's choice for "don't ask again" functionality.
   *
   * Tracks whether the user wants to skip future confirmation dialogs
   * of the same type. Defaults to false for safety.
   */
  dontAskAgain = false;

  /**
   * Creates an instance of ConfirmationDialogComponent.
   *
   * @param dialogRef - Reference to the dialog for closing and result communication
   * @param data - Configuration data for dialog content and behavior
   */
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {
    // Set default values for optional properties with proper undefined handling
    this.data = {
      title: data.title,
      message: data.message,
      confirmText: data.confirmText || 'Confirm',
      cancelText: data.cancelText || 'Cancel',
      showDontAskAgain: data.showDontAskAgain ?? false,
      icon: data.icon || 'help_outline',
      customClass: data.customClass
    };
  }

  /**
   * Handles dialog cancellation.
   *
   * Closes the dialog with a negative result and the current
   * "don't ask again" preference. This is the safe default action.
   *
   * **Accessibility**: This method is called when:
   * - Cancel button is clicked
   * - Escape key is pressed
   * - Dialog backdrop is clicked (if enabled)
   *
   * @example
   * ```typescript
   * // Called automatically by dialog interactions
   * onCancel() // → { result: false, dontAskAgain: false }
   * ```
   */
  cancel(): void {
    const result = {
      result: false,
      dontAskAgain: this.dontAskAgain
    } as ConfirmationResult;
    this.dialogRef.close(result);
  }

  /**
   * Handles dialog confirmation.
   *
   * Closes the dialog with a positive result and the current
   * "don't ask again" preference. This triggers the protected action.
   *
   * **Security Note**: This method should only be called after
   * explicit user confirmation via button click or Enter key.
   *
   * @example
   * ```typescript
   * // Called when user clicks confirm button
   * onConfirm() // → { result: true, dontAskAgain: true }
   * ```
   */
  confirm(): void {
    const result = {
      result: true,
      dontAskAgain: this.dontAskAgain
    } as ConfirmationResult;
    this.dialogRef.close(result);
  }

  /**
   * Handles keyboard navigation within the dialog.
   *
   * Provides additional keyboard shortcuts for improved accessibility:
   * - Enter: Confirm action (when not focused on Cancel)
   * - Escape: Cancel action (handled by Material Dialog)
   *
   * **Accessibility**: Ensures keyboard-only users can efficiently
   * navigate and use the confirmation dialog.
   *
   * @param event - Keyboard event from user interaction
   */
  onKeyDown(event: KeyboardEvent): void {
    // Handle Enter key for quick confirmation
    // Only if focus is not on the Cancel button (for safety)
    if (event.key === 'Enter' && !this.isCancelButtonFocused(event)) {
      this.confirm();
      event.preventDefault();
    }
  }

  /**
   * Checks if the Cancel button is currently focused.
   *
   * Used to prevent accidental confirmation when Enter is pressed
   * while the Cancel button has focus. This maintains the safety-first
   * approach where Cancel is the default safe action.
   *
   * @param event - Keyboard event to check target
   * @returns True if Cancel button is focused, false otherwise
   *
   * @private
   */
  private isCancelButtonFocused(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    return target?.classList.contains('cancel-button') ||
           target?.getAttribute('data-action') === 'cancel';
  }
}

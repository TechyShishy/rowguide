import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { skipWhile } from 'rxjs/operators';

import { NotificationService } from '../../../core/services';

/**
 * Notification component for displaying user feedback messages
 *
 * This component provides a centralized notification display system using Material Design
 * snackbars. It integrates seamlessly with the NotificationService to automatically
 * display messages from anywhere in the application, providing consistent user feedback
 * for operations, errors, and informational messages.
 *
 * @example
 * ```typescript
 * // Basic usage - component automatically handles notifications
 * <app-notification></app-notification>
 *
 * // Notifications are triggered via NotificationService from any component:
 * constructor(private notificationService: NotificationService) {}
 *
 * showSuccess(): void {
 *   this.notificationService.success('Project saved successfully!');
 * }
 *
 * showError(): void {
 *   this.notificationService.error('Failed to load project data');
 * }
 *
 * showCustom(): void {
 *   this.notificationService.queueNotification('Custom message', 'info');
 * }
 * ```
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-notification',
  imports: [],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
})
export class NotificationComponent {
  /**
   * Material Design snackbar service for displaying notification messages.
   *
   * Uses Angular's inject() function for modern dependency injection,
   * providing access to Material Design snackbar functionality for
   * consistent notification display across the application.
   *
   * @private
   * @since 1.0.0
   */
  private _snackBar = inject(MatSnackBar);

  /**
   * Creates an instance of NotificationComponent.
   *
   * Establishes the foundation for notification display by injecting
   * the NotificationService dependency. The actual subscription setup
   * is handled in ngOnInit to ensure proper component lifecycle management.
   *
   * @param notificationService - Centralized service for managing application notifications
   *
   * @example
   * ```typescript
   * // Component is typically used in app-root template
   * <app-notification></app-notification>
   *
   * // NotificationService is automatically injected and ready for use
   * constructor(private notificationService: NotificationService) {
   *   // Service ready for message streaming in ngOnInit
   * }
   * ```
   *
   * @since 1.0.0
   */
  constructor(private notificationService: NotificationService) {}
  /**
   * Initializes notification message streaming and snackbar integration.
   *
   * Establishes a subscription to the NotificationService message stream,
   * filtering out empty messages and automatically displaying valid notifications
   * using Material Design snackbars. The skipWhile operator ensures only
   * meaningful messages are processed, preventing unnecessary snackbar displays.
   *
   * @example
   * ```typescript
   * // Called automatically by Angular during component initialization
   * ngOnInit(): void {
   *   // Subscription automatically established to message stream
   *   // Snackbar displays are handled automatically
   * }
   *
   * // Notifications triggered elsewhere appear automatically:
   * this.notificationService.success('Operation completed');
   * // → Snackbar appears with "Operation completed" and "Dismiss" action
   * ```
   *
   * @since 1.0.0
   */
  ngOnInit() {
    this.notificationService.message$
      .pipe(skipWhile((message) => message === ''))
      .subscribe((message) => {
        this._snackBar.open(message, 'Dismiss');
      });
  }
}

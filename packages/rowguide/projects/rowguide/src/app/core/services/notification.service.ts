import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ReactiveStateStore } from '../store/reactive-state-store';
import { NotificationActions, NotificationPayload } from '../store/actions/notification-actions';
import {
  selectCurrentNotification,
  selectCurrentNotificationMessage,
  selectHasNotification,
} from '../store/selectors/notification-selectors';

/**
 * Service responsible for managing user notifications throughout the application.
 * Provides a centralized notification system with reactive patterns, queue management,
 * and integration with the global state store.
 *
 * Features:
 * - Reactive notification streams for UI components
 * - Automatic notification dismissal with configurable timeouts
 * - Notification queuing for sequential display
 * - Type-specific notifications (info, success, warning, error)
 * - Integration with MatSnackBar for consistent UI presentation
 *
 * @example
 * ```typescript
 * // Basic usage
 * constructor(private notificationService: NotificationService) {}
 *
 * // Show different notification types
 * this.notificationService.success('Project saved successfully!');
 * this.notificationService.error('Failed to load project', 0); // No auto-dismiss
 * this.notificationService.warning('Unsaved changes detected');
 * this.notificationService.info('Processing...');
 *
 * // Queue multiple notifications
 * this.notificationService.queueNotification('First message');
 * this.notificationService.queueNotification('Second message');
 *
 * // React to notification state
 * this.notificationService.hasNotification$.subscribe(hasNotification => {
 *   if (hasNotification) {
 *     // Update UI state
 *   }
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  /**
   * Observable stream of the current notification payload.
   * Emits null when no notification is active.
   *
   * @example
   * ```typescript
   * this.notificationService.currentNotification$.subscribe(notification => {
   *   if (notification) {
   *     console.log(`${notification.type}: ${notification.message}`);
   *   }
   * });
   * ```
   */
  currentNotification$: Observable<NotificationPayload | null> =
    this.store.select(selectCurrentNotification);

  /**
   * Observable stream of the current notification message text.
   * Emits empty string when no notification is active.
   */
  message$ = this.store.select(selectCurrentNotificationMessage);

  /**
   * Observable boolean indicating whether a notification is currently displayed.
   * Useful for conditional UI rendering and state management.
   */
  hasNotification$ = this.store.select(selectHasNotification);

  /**
   * Creates an instance of NotificationService.
   *
   * @param store - The reactive state store for notification state management
   */
  constructor(private store: ReactiveStateStore) {}

  /**
   * Displays a notification message with specified type and auto-dismiss behavior.
   * Core method for notification display that handles state management and timing.
   *
   * @param message - The notification message to display to the user
   * @param type - The notification type affecting styling and user perception
   *   - 'info': General information (blue styling)
   *   - 'success': Successful operations (green styling)
   *   - 'warning': Important alerts (orange styling)
   *   - 'error': Error conditions (red styling)
   * @param duration - Auto-dismiss timeout in milliseconds (0 = manual dismiss only)
   *
   * @example
   * ```typescript
   * // Standard success notification (auto-dismisses after 3 seconds)
   * this.notificationService.snackbar('Data saved successfully', 'success');
   *
   * // Error notification that stays visible until manually dismissed
   * this.notificationService.snackbar('Connection failed', 'error', 0);
   *
   * // Warning with custom timeout
   * this.notificationService.snackbar('Session expires soon', 'warning', 10000);
   * ```
   */
  snackbar(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = 3000
  ): void {
    const notification: NotificationPayload = {
      message,
      type,
      duration,
      timestamp: Date.now(),
    };

    this.store.dispatch(NotificationActions.showNotification(notification));

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      setTimeout(() => {
        this.clearNotification();
      }, duration);
    }
  }

  /**
   * Immediately clears the currently displayed notification.
   * Does not affect queued notifications, which will display in sequence.
   *
   * @example
   * ```typescript
   * // Manual dismissal
   * this.notificationService.clearNotification();
   *
   * // Conditional clearing
   * if (errorResolved) {
   *   this.notificationService.clearNotification();
   * }
   * ```
   */
  clearNotification(): void {
    this.store.dispatch(NotificationActions.clearNotification());
  }

  /**
   * Adds a notification to the display queue for sequential presentation.
   * Queued notifications are displayed after the current notification is dismissed.
   * Maintains user experience by preventing notification overlap.
   *
   * @param message - The notification message text
   * @param type - Notification severity level (defaults to 'info')
   * @param duration - Auto-dismiss timeout in milliseconds
   *
   * @example
   * ```typescript
   * // Queue multiple related notifications
   * this.notificationService.queueNotification('Starting import...');
   * this.notificationService.queueNotification('Validating data...');
   * this.notificationService.queueNotification('Import complete!', 'success');
   *
   * // Queue with custom timings
   * this.notificationService.queueNotification('Processing...', 'info', 1000);
   * this.notificationService.queueNotification('Almost done...', 'info', 2000);
   * ```
   */
  queueNotification(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = 3000
  ): void {
    const notification: NotificationPayload = {
      message,
      type,
      duration,
      timestamp: Date.now(),
    };

    this.store.dispatch(NotificationActions.queueNotification(notification));
  }

  /**
   * Clears all notifications including the current display and entire queue.
   * Provides complete notification system reset for scenarios like navigation
   * or error recovery where accumulated notifications should be dismissed.
   *
   * @example
   * ```typescript
   * // Clear all notifications during route change
   * ngOnDestroy() {
   *   this.notificationService.clearAllNotifications();
   * }
   *
   * // Reset notifications after critical error
   * if (criticalError) {
   *   this.notificationService.clearAllNotifications();
   *   this.notificationService.error('System error: Please refresh');
   * }
   * ```
   */
  clearAllNotifications(): void {
    this.store.dispatch(NotificationActions.clearAllNotifications());
  }

  /**
   * Displays a success notification with green styling and celebratory tone.
   * Convenience method for positive user feedback after successful operations.
   *
   * @param message - Success message describing the completed action
   * @param duration - Auto-dismiss duration (default: 3000ms for quick positive feedback)
   *
   * @example
   * ```typescript
   * // Standard success notifications
   * this.notificationService.success('Project saved successfully!');
   * this.notificationService.success('Import completed');
   * this.notificationService.success('Settings updated', 2000);
   * ```
   */
  success(message: string, duration: number = 3000): void {
    this.snackbar(message, 'success', duration);
  }

  /**
   * Displays an error notification with red styling and urgent presentation.
   * Convenience method for critical error communication requiring user attention.
   * Uses longer default duration due to importance of error messages.
   *
   * @param message - Error description that helps users understand the problem
   * @param duration - Auto-dismiss duration (default: 5000ms for adequate reading time)
   *
   * @example
   * ```typescript
   * // Standard error notifications
   * this.notificationService.error('Failed to save project');
   * this.notificationService.error('Connection timeout occurred');
   * this.notificationService.error('Critical error: Please restart', 0); // Manual dismiss
   * ```
   */
  error(message: string, duration: number = 5000): void {
    this.snackbar(message, 'error', duration);
  }

  /**
   * Displays a warning notification with orange styling for important alerts.
   * Convenience method for non-critical issues that require user awareness.
   * Balanced duration between info and error for moderate importance.
   *
   * @param message - Warning description explaining the cautionary situation
   * @param duration - Auto-dismiss duration (default: 4000ms for moderate attention)
   *
   * @example
   * ```typescript
   * // Standard warning notifications
   * this.notificationService.warning('Unsaved changes will be lost');
   * this.notificationService.warning('Session expires in 5 minutes');
   * this.notificationService.warning('Large file may cause delays');
   * ```
   */
  warning(message: string, duration: number = 4000): void {
    this.snackbar(message, 'warning', duration);
  }

  /**
   * Displays an informational notification with blue styling for general communication.
   * Convenience method for neutral information sharing and status updates.
   * Standard duration appropriate for general information consumption.
   *
   * @param message - Informational content for user awareness
   * @param duration - Auto-dismiss duration (default: 3000ms for standard info)
   *
   * @example
   * ```typescript
   * // Standard info notifications
   * this.notificationService.info('Loading project data...');
   * this.notificationService.info('Processing complete');
   * this.notificationService.info('New feature available');
   * ```
   */
  info(message: string, duration: number = 3000): void {
    this.snackbar(message, 'info', duration);
  }
}

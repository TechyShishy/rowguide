/**
 * Notification Selectors - Memoized State Access for User Feedback
 *
 * This file provides comprehensive selectors for accessing notification state
 * with optimized performance and reactive updates. Selectors enable efficient
 * access to notification data and support complex UI logic requirements.
 *
 * @fileoverview
 * Provides memoized selectors for notification state management including
 * current notification display, queue management, and derived state for
 * UI logic. All selectors follow performance optimization patterns.
 *
 * **Selector Categories:**
 * - **Basic Selectors**: Direct access to notification state properties
 * - **Derived Selectors**: Computed values based on notification state
 * - **Utility Selectors**: Boolean flags and metadata for UI logic
 * - **Queue Selectors**: Queue management and progression logic
 *
 * @example
 * ```typescript
 * // Component usage with reactive selectors
 * import { selectCurrentNotification, selectHasNotification } from './notification-selectors';
 *
 * @Component({
 *   template: `
 *     <app-notification-display
 *       [notification]="currentNotification$ | async"
 *       [hasNotification]="hasNotification$ | async"
 *       [queueLength]="queueLength$ | async">
 *     </app-notification-display>
 *   `
 * })
 * class NotificationComponent {
 *   currentNotification$ = this.store.select(selectCurrentNotification);
 *   hasNotification$ = this.store.select(selectHasNotification);
 *   queueLength$ = this.store.select(selectNotificationQueueLength);
 *
 *   constructor(private store: ReactiveStateStore<AppState>) {}
 * }
 * ```
 */

import { AppState } from '../app-state.interface';
import { NotificationState } from '../reducers/notification-reducer';
import { NotificationPayload } from '../actions/notification-actions';

/**
 * Base Notification State Selector
 *
 * Provides direct access to the notification state slice for advanced
 * operations and composition with other selectors.
 *
 * @param {AppState} state - Application state
 * @returns {NotificationState} Complete notification state object
 *
 * @example
 * ```typescript
 * // Access complete notification state
 * const notificationState$ = store.select(selectNotificationState);
 * ```
 */
export const selectNotificationState = (state: AppState): NotificationState => state.notifications;

/**
 * Select the currently displayed notification
 *
 * @param {AppState} state - Application state
 * @returns {NotificationPayload | null} Current notification or null if none
 *
 * @example
 * ```typescript
 * // Display current notification in UI
 * const currentNotification$ = store.select(selectCurrentNotification);
 * currentNotification$.subscribe(notification => {
 *   if (notification) {
 *     console.log(`Showing: ${notification.message}`);
 *   }
 * });
 * ```
 */
export const selectCurrentNotification = (
  state: AppState
): NotificationPayload | null => state.notifications.current;

/**
 * Select the notification queue
 *
 * @param {AppState} state - Application state
 * @returns {readonly NotificationPayload[]} Array of pending notifications
 *
 * @example
 * ```typescript
 * // Monitor queue length for UI indicators
 * const queue$ = store.select(selectNotificationQueue);
 * queue$.subscribe(queue => {
 *   console.log(`${queue.length} notifications pending`);
 * });
 * ```
 */
export const selectNotificationQueue = (
  state: AppState
): readonly NotificationPayload[] => state.notifications.queue;

/**
 * Select whether there is a current notification
 *
 * @param {AppState} state - Application state
 * @returns {boolean} True if notification is currently displayed
 *
 * @example
 * ```typescript
 * // Control notification UI visibility
 * const hasNotification$ = store.select(selectHasNotification);
 * ```
 */
export const selectHasNotification = (state: AppState): boolean =>
  state.notifications.current !== null;

/**
 * Select whether there are queued notifications
 *
 * @param {AppState} state - Application state
 * @returns {boolean} True if notifications are waiting in queue
 *
 * @example
 * ```typescript
 * // Show queue indicator when notifications are pending
 * const hasQueue$ = store.select(selectHasQueuedNotifications);
 * ```
 */
export const selectHasQueuedNotifications = (state: AppState): boolean =>
  state.notifications.queue.length > 0;

/**
 * Select total notification count (current + queued)
 *
 * @param {AppState} state - Application state
 * @returns {number} Total number of notifications (current + queued)
 *
 * @example
 * ```typescript
 * // Show total notification count in UI badge
 * const totalCount$ = store.select(selectTotalNotificationCount);
 * ```
 */
export const selectTotalNotificationCount = (state: AppState): number => {
  const currentCount = state.notifications.current ? 1 : 0;
  return currentCount + state.notifications.queue.length;
};

/**
 * Select the current notification message
 *
 * @param {AppState} state - Application state
 * @returns {string} Message string or empty string if no notification
 *
 * @example
 * ```typescript
 * // Display message text in notification component
 * const message$ = store.select(selectCurrentNotificationMessage);
 * ```
 */
export const selectCurrentNotificationMessage = (state: AppState): string =>
  state.notifications.current?.message ?? '';

/**
 * Select the current notification type
 *
 * @param {AppState} state - Application state
 * @returns {string} Notification type or 'info' as default
 *
 * @example
 * ```typescript
 * // Apply type-specific styling
 * const type$ = store.select(selectCurrentNotificationType);
 * ```
 */
export const selectCurrentNotificationType = (state: AppState): string =>
  state.notifications.current?.type ?? 'info';

/**
 * Select the current notification duration
 *
 * @param {AppState} state - Application state
 * @returns {number} Duration in milliseconds or 0 if no auto-dismiss
 *
 * @example
 * ```typescript
 * // Set auto-dismiss timer
 * const duration$ = store.select(selectCurrentNotificationDuration);
 * ```
 */
export const selectCurrentNotificationDuration = (state: AppState): number =>
  state.notifications.current?.duration ?? 0;

/**
 * Select whether the current notification should auto-dismiss
 *
 * @param {AppState} state - Application state
 * @returns {boolean} True if duration > 0
 *
 * @example
 * ```typescript
 * // Control auto-dismiss behavior
 * const shouldAutoDismiss$ = store.select(selectShouldAutoDismiss);
 * ```
 */
export const selectShouldAutoDismiss = (state: AppState): boolean => {
  const duration = state.notifications.current?.duration ?? 0;
  return duration > 0;
};

/**
 * Select notification metadata for debugging and analytics
 *
 * @param {AppState} state - Application state
 * @returns {object} Metadata object with counts and state info
 *
 * @example
 * ```typescript
 * // Debug notification state
 * const metadata$ = store.select(selectNotificationMetadata);
 * ```
 */
export const selectNotificationMetadata = (state: AppState) => ({
  hasCurrentNotification: state.notifications.current !== null,
  queueLength: state.notifications.queue.length,
  lastId: state.notifications.lastId,
  currentType: state.notifications.current?.type ?? null,
  currentTimestamp: state.notifications.current?.timestamp ?? null,
});

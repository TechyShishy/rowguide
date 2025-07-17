/**
 * Notification Actions for ReactiveStateStore
 *
 * This module defines all actions related to notification state management in the Redux-style
 * state store. Notifications provide user feedback through temporary messages displayed in the UI.
 *
 * ## Action Categories
 *
 * - **Display Actions**: SHOW_NOTIFICATION for immediate display
 * - **Queue Actions**: QUEUE_NOTIFICATION for sequential notification handling
 * - **Dismissal Actions**: CLEAR_NOTIFICATION, CLEAR_ALL_NOTIFICATIONS for cleanup
 * - **Auto-Dismiss Actions**: AUTO_DISMISS_NOTIFICATION for automatic timeout handling
 *
 * ## Notification Types
 *
 * - `info`: General information messages (blue styling)
 * - `success`: Success confirmations (green styling)
 * - `warning`: Warning messages (yellow/orange styling)
 * - `error`: Error messages (red styling)
 *
 * ## Duration Management
 *
 * - `0`: No auto-dismiss (manual dismissal only)
 * - `> 0`: Auto-dismiss after specified milliseconds
 * - Default: 5000ms (5 seconds) for most notifications
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Show immediate success notification
 * const action = NotificationActions.showNotification({
 *   message: 'Project saved successfully',
 *   type: 'success',
 *   duration: 3000
 * });
 * store.dispatch(action);
 *
 * // Queue notification for sequential display
 * store.dispatch(NotificationActions.queueNotification({
 *   message: 'Processing file...',
 *   type: 'info'
 * }));
 *
 * // Clear all notifications
 * store.dispatch(NotificationActions.clearAllNotifications());
 * ```
 *
 * @module NotificationActions
 * @since 2.0.0
 */

import { StateAction } from '../reactive-state-store';

/**
 * Notification severity levels for styling and user attention
 *
 * Each type corresponds to specific UI styling and user attention patterns:
 * - info: Neutral information (blue theme)
 * - success: Positive feedback (green theme)
 * - warning: Caution messages (yellow/orange theme)
 * - error: Critical issues (red theme)
 *
 * @type {NotificationType}
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification data structure
 *
 * Defines the complete structure for notification messages including
 * content, styling, and lifecycle management.
 *
 * @interface NotificationPayload
 */
export interface NotificationPayload {
  /** The notification message text to display */
  message: string;
  /** The notification type for styling and priority (default: 'info') */
  type?: NotificationType;
  /** Duration in milliseconds before auto-dismiss (0 = no auto-dismiss) */
  duration?: number;
  /** Timestamp when notification was created (auto-generated) */
  timestamp?: number;
}

/**
 * Notification domain action types
 *
 * String constants for Redux action types following the pattern:
 * '[Domain] Action Description'
 *
 * @enum {string}
 */
export enum NotificationActionTypes {
  /** Display a notification immediately */
  SHOW_NOTIFICATION = '[Notification] Show Notification',
  /** Clear the current notification */
  CLEAR_NOTIFICATION = '[Notification] Clear Notification',
  /** Add notification to queue for sequential display */
  QUEUE_NOTIFICATION = '[Notification] Queue Notification',
  /** Clear current notification and entire queue */
  CLEAR_ALL_NOTIFICATIONS = '[Notification] Clear All Notifications',
  /** Auto-dismiss notification after timeout */
  AUTO_DISMISS_NOTIFICATION = '[Notification] Auto Dismiss Notification',
}

/**
 * Notification action interfaces
 *
 * Type-safe action interfaces for all notification operations.
 * Each action extends StateAction and includes strongly-typed payload.
 */

/**
 * Action to display a notification immediately
 *
 * Used for immediate notification display, typically for user feedback
 * about completed operations or critical messages.
 *
 * @interface ShowNotificationAction
 * @extends StateAction
 */
export interface ShowNotificationAction extends StateAction {
  readonly type: NotificationActionTypes.SHOW_NOTIFICATION;
  readonly payload: {
    readonly notification: NotificationPayload;
  };
}

/**
 * Action to clear the current notification
 *
 * Used for manual notification dismissal by user interaction
 * or programmatic clearing.
 *
 * @interface ClearNotificationAction
 * @extends StateAction
 */
export interface ClearNotificationAction extends StateAction {
  readonly type: NotificationActionTypes.CLEAR_NOTIFICATION;
}

/**
 * Action to add notification to queue for sequential display
 *
 * Used when multiple notifications need to be displayed in sequence
 * to prevent overwhelming the user with simultaneous messages.
 *
 * @interface QueueNotificationAction
 * @extends StateAction
 */
export interface QueueNotificationAction extends StateAction {
  readonly type: NotificationActionTypes.QUEUE_NOTIFICATION;
  readonly payload: {
    readonly notification: NotificationPayload;
  };
}

/**
 * Action to clear all notifications (current and queued)
 *
 * Used for bulk notification clearing, typically during
 * navigation or critical error recovery.
 *
 * @interface ClearAllNotificationsAction
 * @extends StateAction
 */
export interface ClearAllNotificationsAction extends StateAction {
  readonly type: NotificationActionTypes.CLEAR_ALL_NOTIFICATIONS;
}

/**
 * Action for automatic notification dismissal
 *
 * Dispatched by timeout mechanism when notification duration expires.
 * Typically handled by middleware or effects system.
 *
 * @interface AutoDismissNotificationAction
 * @extends StateAction
 */
export interface AutoDismissNotificationAction extends StateAction {
  readonly type: NotificationActionTypes.AUTO_DISMISS_NOTIFICATION;
}

/**
 * Union type for all notification actions
 *
 * Type-safe union for Redux reducer and middleware processing.
 * Ensures exhaustive handling of all notification actions.
 *
 * @type {NotificationAction}
 */
export type NotificationAction =
  | ShowNotificationAction
  | ClearNotificationAction
  | QueueNotificationAction
  | ClearAllNotificationsAction
  | AutoDismissNotificationAction;

/**
 * Notification action creators
 *
 * Factory functions for creating type-safe notification actions.
 * These functions ensure consistent action structure and automatic
 * timestamp generation.
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Show success notification
 * store.dispatch(NotificationActions.showNotification({
 *   message: 'Project saved successfully',
 *   type: 'success',
 *   duration: 3000
 * }));
 *
 * // Show error notification (no auto-dismiss)
 * store.dispatch(NotificationActions.showNotification({
 *   message: 'Failed to save project',
 *   type: 'error',
 *   duration: 0
 * }));
 *
 * // Queue notification for batch processing
 * store.dispatch(NotificationActions.queueNotification({
 *   message: 'Processing file 1 of 3...',
 *   type: 'info'
 * }));
 *
 * // Clear all notifications
 * store.dispatch(NotificationActions.clearAllNotifications());
 * ```
 *
 * @namespace NotificationActions
 */
export const NotificationActions = {
  /**
   * Create action to display a notification immediately
   *
   * @param {NotificationPayload} notification - Notification data
   * @returns {ShowNotificationAction} Action to show notification
   *
   * @example
   * ```typescript
   * // Success notification with auto-dismiss
   * const action = NotificationActions.showNotification({
   *   message: 'Project saved successfully',
   *   type: 'success',
   *   duration: 3000
   * });
   *
   * // Error notification without auto-dismiss
   * const action = NotificationActions.showNotification({
   *   message: 'Failed to validate input',
   *   type: 'error',
   *   duration: 0
   * });
   * ```
   */
  showNotification: (notification: NotificationPayload): ShowNotificationAction => ({
    type: NotificationActionTypes.SHOW_NOTIFICATION,
    payload: { notification },
  }),

  /**
   * Create action to clear the current notification
   *
   * @returns {ClearNotificationAction} Action to clear notification
   *
   * @example
   * ```typescript
   * // Clear notification on user dismiss
   * const action = NotificationActions.clearNotification();
   * store.dispatch(action);
   * ```
   */
  clearNotification: (): ClearNotificationAction => ({
    type: NotificationActionTypes.CLEAR_NOTIFICATION,
  }),

  /**
   * Create action to queue a notification for sequential display
   *
   * @param {NotificationPayload} notification - Notification to queue
   * @returns {QueueNotificationAction} Action to queue notification
   *
   * @example
   * ```typescript
   * // Queue multiple notifications for batch processing
   * const notifications = [
   *   { message: 'Starting import...', type: 'info' },
   *   { message: 'Parsing file...', type: 'info' },
   *   { message: 'Validating data...', type: 'info' }
   * ];
   *
   * notifications.forEach(notification => {
   *   store.dispatch(NotificationActions.queueNotification(notification));
   * });
   * ```
   */
  queueNotification: (notification: NotificationPayload): QueueNotificationAction => ({
    type: NotificationActionTypes.QUEUE_NOTIFICATION,
    payload: { notification },
  }),

  /**
   * Create action to clear all notifications (current and queued)
   *
   * @returns {ClearAllNotificationsAction} Action to clear all notifications
   *
   * @example
   * ```typescript
   * // Clear all notifications on navigation
   * const action = NotificationActions.clearAllNotifications();
   * store.dispatch(action);
   * ```
   */
  clearAllNotifications: (): ClearAllNotificationsAction => ({
    type: NotificationActionTypes.CLEAR_ALL_NOTIFICATIONS,
  }),

  /**
   * Create action for automatic notification dismissal
   *
   * Typically called by timeout mechanism or middleware.
   * Not commonly used directly by components.
   *
   * @returns {AutoDismissNotificationAction} Action for auto-dismiss
   *
   * @example
   * ```typescript
   * // Auto-dismiss after timeout (handled by middleware)
   * setTimeout(() => {
   *   store.dispatch(NotificationActions.autoDismissNotification());
   * }, notification.duration);
   * ```
   */
  autoDismissNotification: (): AutoDismissNotificationAction => ({
    type: NotificationActionTypes.AUTO_DISMISS_NOTIFICATION,
  }),
} as const;

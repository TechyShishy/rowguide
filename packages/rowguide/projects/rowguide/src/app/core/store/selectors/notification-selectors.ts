/**
 * @fileoverview Notification Selectors for ReactiveStateStore
 *
 * This file provides selectors for accessing notification state.
 * Selectors offer efficient access to notification state values and
 * enable components to reactively subscribe to specific notification data.
 *
 * Selector Categories:
 * - Basic selectors: Direct access to notification state properties
 * - Derived selectors: Computed values based on notification state
 * - Utility selectors: Boolean flags and metadata for UI logic
 */

import { AppState } from '../app-state.interface';
import { NotificationState } from '../reducers/notification-reducer';
import { NotificationPayload } from '../actions/notification-actions';

/**
 * Base selector to access notification state slice
 */
export const selectNotificationState = (state: AppState): NotificationState => state.notifications;

/**
 * Select the currently displayed notification
 * @returns Current notification or null if none
 */
export const selectCurrentNotification = (state: AppState): NotificationPayload | null => 
  state.notifications.current;

/**
 * Select the notification queue
 * @returns Array of pending notifications
 */
export const selectNotificationQueue = (state: AppState): readonly NotificationPayload[] => 
  state.notifications.queue;

/**
 * Select whether there is a current notification
 * @returns True if notification is currently displayed
 */
export const selectHasNotification = (state: AppState): boolean => 
  state.notifications.current !== null;

/**
 * Select whether there are queued notifications
 * @returns True if notifications are waiting in queue
 */
export const selectHasQueuedNotifications = (state: AppState): boolean => 
  state.notifications.queue.length > 0;

/**
 * Select total notification count (current + queued)
 * @returns Total number of notifications
 */
export const selectTotalNotificationCount = (state: AppState): number => {
  const currentCount = state.notifications.current ? 1 : 0;
  return currentCount + state.notifications.queue.length;
};

/**
 * Select the current notification message
 * @returns Message string or empty string if no notification
 */
export const selectCurrentNotificationMessage = (state: AppState): string => 
  state.notifications.current?.message ?? '';

/**
 * Select the current notification type
 * @returns Notification type or 'info' as default
 */
export const selectCurrentNotificationType = (state: AppState): string => 
  state.notifications.current?.type ?? 'info';

/**
 * Select the current notification duration
 * @returns Duration in milliseconds or 0 if no auto-dismiss
 */
export const selectCurrentNotificationDuration = (state: AppState): number => 
  state.notifications.current?.duration ?? 0;

/**
 * Select whether the current notification should auto-dismiss
 * @returns True if duration > 0
 */
export const selectShouldAutoDismiss = (state: AppState): boolean => {
  const duration = state.notifications.current?.duration ?? 0;
  return duration > 0;
};

/**
 * Select notification metadata for debugging and analytics
 * @returns Metadata object with counts and state info
 */
export const selectNotificationMetadata = (state: AppState) => ({
  hasCurrentNotification: state.notifications.current !== null,
  queueLength: state.notifications.queue.length,
  lastId: state.notifications.lastId,
  currentType: state.notifications.current?.type ?? null,
  currentTimestamp: state.notifications.current?.timestamp ?? null,
});

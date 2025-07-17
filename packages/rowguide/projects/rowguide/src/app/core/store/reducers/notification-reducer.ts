/**
 * Notification Reducer for ReactiveStateStore
 *
 * This reducer manages notification state following Redux patterns.
 * It handles showing, clearing, and queuing notifications for user feedback.
 *
 * State Management:
 * - current: Currently displayed notification (null if none)
 * - queue: Array of pending notifications for sequential display
 * - lastId: Auto-incrementing ID for notification tracking
 */

import {
  NotificationAction,
  NotificationActionTypes,
  NotificationPayload,
} from '../actions/notification-actions';

/**
 * Notification state structure
 */
export interface NotificationState {
  readonly current: NotificationPayload | null;
  readonly queue: readonly NotificationPayload[];
  readonly lastId: number;
}

/**
 * Initial notification state - no notifications displayed
 */
export const initialNotificationState: NotificationState = {
  current: null,
  queue: [],
  lastId: 0,
};

/**
 * Notification reducer function
 *
 * Handles all notification-related state transitions with immutable updates.
 * Follows Redux patterns for predictable state management.
 *
 * @param state - Current notification state (defaults to initial state)
 * @param action - Notification action to process
 * @returns New notification state
 */
export function notificationReducer(
  state: NotificationState = initialNotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case NotificationActionTypes.SHOW_NOTIFICATION: {
      const notification = {
        ...action.payload.notification,
        timestamp: action.payload.notification.timestamp ?? Date.now(),
      };

      return {
        ...state,
        current: notification,
        lastId: state.lastId + 1,
      };
    }

    case NotificationActionTypes.CLEAR_NOTIFICATION: {
      // If there are queued notifications, show the next one
      if (state.queue.length > 0) {
        const [nextNotification, ...remainingQueue] = state.queue;
        return {
          ...state,
          current: nextNotification,
          queue: remainingQueue,
        };
      }

      // No queue, clear current notification
      return {
        ...state,
        current: null,
      };
    }

    case NotificationActionTypes.QUEUE_NOTIFICATION: {
      const notification = {
        ...action.payload.notification,
        timestamp: action.payload.notification.timestamp ?? Date.now(),
      };

      // If no current notification, show immediately
      if (!state.current) {
        return {
          ...state,
          current: notification,
          lastId: state.lastId + 1,
        };
      }

      // Add to queue
      return {
        ...state,
        queue: [...state.queue, notification],
        lastId: state.lastId + 1,
      };
    }

    case NotificationActionTypes.CLEAR_ALL_NOTIFICATIONS: {
      return {
        ...state,
        current: null,
        queue: [],
      };
    }

    case NotificationActionTypes.AUTO_DISMISS_NOTIFICATION: {
      // Same behavior as clear - auto-dismiss triggers the same logic
      if (state.queue.length > 0) {
        const [nextNotification, ...remainingQueue] = state.queue;
        return {
          ...state,
          current: nextNotification,
          queue: remainingQueue,
        };
      }

      return {
        ...state,
        current: null,
      };
    }

    default:
      return state;
  }
}

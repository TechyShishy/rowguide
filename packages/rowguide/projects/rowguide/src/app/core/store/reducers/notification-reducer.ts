/**
 * Notification Reducer - User Feedback State Management
 *
 * This reducer manages notification state following Redux patterns with
 * comprehensive queue management, sequential display, and automatic
 * dismissal functionality for optimal user experience.
 *
 * @fileoverview
 * Handles showing, clearing, and queuing notifications for user feedback
 * with sophisticated queue management, priority handling, and automatic
 * progression through notification sequences.
 *
 * **State Management Features:**
 * - **Current Display**: Single notification display with priority handling
 * - **Queue Management**: Sequential notification processing with FIFO behavior
 * - **Auto-Dismissal**: Automatic notification clearing with configurable timing
 * - **ID Tracking**: Unique notification identification for debugging
 *
 * **Notification Flow:**
 * 1. New notification arrives
 * 2. If no current notification, display immediately
 * 3. If current notification exists, add to queue
 * 4. When current notification dismissed, show next from queue
 * 5. Repeat until queue is empty
 *
 * @example
 * ```typescript
 * // Basic reducer usage
 * import { notificationReducer } from './notification-reducer';
 *
 * // State transitions
 * const newState = notificationReducer(currentState, action);
 *
 * // Notification management examples
 * const showState = notificationReducer(state, {
 *   type: NotificationActionTypes.SHOW_NOTIFICATION,
 *   payload: { notification: { message: 'Success!', type: 'success' } }
 * });
 *
 * const queueState = notificationReducer(state, {
 *   type: NotificationActionTypes.QUEUE_NOTIFICATION,
 *   payload: { notification: { message: 'Processing...', type: 'info' } }
 * });
 *
 * const clearState = notificationReducer(state, {
 *   type: NotificationActionTypes.CLEAR_NOTIFICATION,
 *   payload: {}
 * });
 * ```
 */

import {
  NotificationAction,
  NotificationActionTypes,
  NotificationPayload,
} from '../actions/notification-actions';

/**
 * Notification State Structure
 *
 * Defines the complete notification state with queue management,
 * current display tracking, and unique ID generation for debugging.
 *
 * @example
 * ```typescript
 * // State structure example
 * const exampleState: NotificationState = {
 *   current: {
 *     id: 'notif-123',
 *     message: 'Project saved successfully',
 *     type: 'success',
 *     duration: 3000,
 *     timestamp: 1642608000
 *   },
 *   queue: [
 *     {
 *       id: 'notif-124',
 *       message: 'Processing next file...',
 *       type: 'info',
 *       duration: 0
 *     }
 *   ],
 *   lastId: 124
 * };
 * ```
 */
export interface NotificationState {
  readonly current: NotificationPayload | null;
  readonly queue: readonly NotificationPayload[];
  readonly lastId: number;
}

/**
 * Initial Notification State
 *
 * Provides clean initial state for notification management.
 * No notifications displayed and empty queue on application start.
 *
 * @example
 * ```typescript
 * // Usage in store initialization
 * const store = new ReactiveStateStore({
 *   notifications: initialNotificationState,
 *   // ... other state slices
 * });
 * ```
 */
export const initialNotificationState: NotificationState = {
  current: null,
  queue: [],
  lastId: 0,
};

/**
 * Notification Reducer Function
 *
 * Handles all notification-related state transitions with immutable updates.
 * Follows Redux patterns for predictable state management with comprehensive
 * queue management and automatic progression.
 *
 * @param {NotificationState} state - Current notification state (defaults to initial state)
 * @param {NotificationAction} action - Action object with type and payload
 * @returns {NotificationState} New immutable state after applying action
 *
 * @example
 * ```typescript
 * // Reducer usage examples
 * const newState = notificationReducer(currentState, action);
 *
 * // Handle notification display
 * const displayState = notificationReducer(state, {
 *   type: NotificationActionTypes.SHOW_NOTIFICATION,
 *   payload: { notification: { message: 'Success', type: 'success' } }
 * });
 *
 * // Handle queue management
 * const queuedState = notificationReducer(state, {
 *   type: NotificationActionTypes.QUEUE_NOTIFICATION,
 *   payload: { notification: { message: 'Info', type: 'info' } }
 * });
 * ```
 */
export function notificationReducer(
  state: NotificationState = initialNotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case NotificationActionTypes.SHOW_NOTIFICATION: {
      /**
       * Show Notification Handler
       *
       * Displays a notification immediately, replacing any current notification.
       * Automatically generates timestamp if not provided and increments ID counter.
       */
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
      /**
       * Clear Notification Handler
       *
       * Clears the current notification and automatically progresses to the next
       * queued notification if available. Implements FIFO queue behavior.
       */
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
      /**
       * Queue Notification Handler
       *
       * Adds notification to queue for sequential display. If no current
       * notification exists, displays immediately. Otherwise, adds to queue
       * for later display when current notification is dismissed.
       */
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
      /**
       * Clear All Notifications Handler
       *
       * Clears both current notification and entire queue.
       * Used for application reset or emergency notification clearing.
       */
      return {
        ...state,
        current: null,
        queue: [],
      };
    }

    case NotificationActionTypes.AUTO_DISMISS_NOTIFICATION: {
      /**
       * Auto-Dismiss Notification Handler
       *
       * Handles automatic notification dismissal with same behavior as
       * manual clear. Progresses to next queued notification if available.
       */
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

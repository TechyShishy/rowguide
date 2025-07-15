/**
 * @fileoverview Notification Actions for ReactiveStateStore
 *
 * This file defines all actions related to notification state management.
 * Notifications are user-facing messages that appear temporarily in the UI
 * to provide feedback about operations, errors, or status updates.
 *
 * Action Types:
 * - SHOW_NOTIFICATION: Display a new notification with message, type, and duration
 * - CLEAR_NOTIFICATION: Remove the current notification
 * - QUEUE_NOTIFICATION: Add notification to queue for sequential display
 * - CLEAR_ALL_NOTIFICATIONS: Clear current notification and queue
 */

import { StateAction } from '../reactive-state-store';

/**
 * Notification severity levels for styling and user attention
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification data structure
 */
export interface NotificationPayload {
  message: string;
  type?: NotificationType;
  duration?: number; // milliseconds, 0 = no auto-dismiss
  timestamp?: number;
}

/**
 * Notification domain action types
 */
export enum NotificationActionTypes {
  SHOW_NOTIFICATION = '[Notification] Show Notification',
  CLEAR_NOTIFICATION = '[Notification] Clear Notification', 
  QUEUE_NOTIFICATION = '[Notification] Queue Notification',
  CLEAR_ALL_NOTIFICATIONS = '[Notification] Clear All Notifications',
  AUTO_DISMISS_NOTIFICATION = '[Notification] Auto Dismiss Notification',
}

/**
 * Notification action interfaces
 */
export interface ShowNotificationAction extends StateAction {
  readonly type: NotificationActionTypes.SHOW_NOTIFICATION;
  readonly payload: {
    readonly notification: NotificationPayload;
  };
}

export interface ClearNotificationAction extends StateAction {
  readonly type: NotificationActionTypes.CLEAR_NOTIFICATION;
}

export interface QueueNotificationAction extends StateAction {
  readonly type: NotificationActionTypes.QUEUE_NOTIFICATION;
  readonly payload: {
    readonly notification: NotificationPayload;
  };
}

export interface ClearAllNotificationsAction extends StateAction {
  readonly type: NotificationActionTypes.CLEAR_ALL_NOTIFICATIONS;
}

export interface AutoDismissNotificationAction extends StateAction {
  readonly type: NotificationActionTypes.AUTO_DISMISS_NOTIFICATION;
}

/**
 * Union type for all notification actions
 */
export type NotificationAction =
  | ShowNotificationAction
  | ClearNotificationAction
  | QueueNotificationAction
  | ClearAllNotificationsAction
  | AutoDismissNotificationAction;

/**
 * Action creators for notification operations
 */
export const NotificationActions = {
  showNotification: (notification: NotificationPayload): ShowNotificationAction => ({
    type: NotificationActionTypes.SHOW_NOTIFICATION,
    payload: { notification },
  }),

  clearNotification: (): ClearNotificationAction => ({
    type: NotificationActionTypes.CLEAR_NOTIFICATION,
  }),

  queueNotification: (notification: NotificationPayload): QueueNotificationAction => ({
    type: NotificationActionTypes.QUEUE_NOTIFICATION,
    payload: { notification },
  }),

  clearAllNotifications: (): ClearAllNotificationsAction => ({
    type: NotificationActionTypes.CLEAR_ALL_NOTIFICATIONS,
  }),

  autoDismissNotification: (): AutoDismissNotificationAction => ({
    type: NotificationActionTypes.AUTO_DISMISS_NOTIFICATION,
  }),
} as const;

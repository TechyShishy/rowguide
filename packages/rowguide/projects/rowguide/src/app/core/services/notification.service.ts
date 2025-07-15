import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ReactiveStateStore } from '../store/reactive-state-store';
import { NotificationActions, NotificationPayload } from '../store/actions/notification-actions';
import { 
  selectCurrentNotification,
  selectCurrentNotificationMessage,
  selectHasNotification 
} from '../store/selectors/notification-selectors';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Store-based observables replace BehaviorSubject
  currentNotification$: Observable<NotificationPayload | null> = this.store.select(selectCurrentNotification);
  message$ = this.store.select(selectCurrentNotificationMessage);
  hasNotification$ = this.store.select(selectHasNotification);

  constructor(private store: ReactiveStateStore) {}

  /**
   * Display a notification message
   * @param message - The message to display
   * @param type - Notification type (info, success, warning, error)
   * @param duration - Auto-dismiss duration in milliseconds (0 = no auto-dismiss)
   */
  snackbar(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 3000): void {
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
   * Clear the current notification
   */
  clearNotification(): void {
    this.store.dispatch(NotificationActions.clearNotification());
  }

  /**
   * Queue a notification for display after current one
   * @param message - The message to queue
   * @param type - Notification type
   * @param duration - Auto-dismiss duration
   */
  queueNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 3000): void {
    const notification: NotificationPayload = {
      message,
      type,
      duration,
      timestamp: Date.now(),
    };

    this.store.dispatch(NotificationActions.queueNotification(notification));
  }

  /**
   * Clear all notifications including queue
   */
  clearAllNotifications(): void {
    this.store.dispatch(NotificationActions.clearAllNotifications());
  }

  /**
   * Show success notification
   */
  success(message: string, duration: number = 3000): void {
    this.snackbar(message, 'success', duration);
  }

  /**
   * Show error notification
   */
  error(message: string, duration: number = 5000): void {
    this.snackbar(message, 'error', duration);
  }

  /**
   * Show warning notification
   */
  warning(message: string, duration: number = 4000): void {
    this.snackbar(message, 'warning', duration);
  }

  /**
   * Show info notification
   */
  info(message: string, duration: number = 3000): void {
    this.snackbar(message, 'info', duration);
  }
}

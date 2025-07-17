import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';

import {
  ErrorHandlerService,
  AppError,
  ErrorNotification,
} from '../../../core/services/error-handler.service';

/**
 * Error boundary component for graceful error display and recovery
 *
 * This component provides comprehensive error handling capabilities with severity-based
 * styling, user-friendly messaging, and recovery mechanisms. It integrates seamlessly
 * with the ErrorHandlerService to provide consistent error presentation across the
 * application while supporting accessibility and Material Design principles.
 *
 * @example
 * ```typescript
 * // Basic usage wrapping content
 * <app-error-boundary
 *   [showDetails]="true"
 *   [canDismiss]="true"
 *   (retryClicked)="handleRetry()"
 *   (dismissed)="handleDismiss()">
 *   <app-my-component></app-my-component>
 * </app-error-boundary>
 *
 * // Programmatic error display
 * &#64;ViewChild(ErrorBoundaryComponent) errorBoundary!: ErrorBoundaryComponent;
 *
 * showCustomError(): void {
 *   this.errorBoundary.showError(
 *     'Failed to load project data',
 *     'Loading Error',
 *     'Please check your connection',
 *     'high',
 *     'HttpError: 404 Not Found'
 *   );
 * }
 * ```
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './error-boundary.component.html',
  styleUrl: './error-boundary.component.scss',
})
export class ErrorBoundaryComponent implements OnDestroy {
  /**
   * Controls whether technical error details are shown to users.
   * When enabled, displays collapsible technical details section.
   *
   * @default false
   * @example
   * ```html
   * <app-error-boundary [showDetails]="isDevelopmentMode">
   *   <!-- content -->
   * </app-error-boundary>
   * ```
   */
  @Input() showDetails = false;

  /**
   * Controls whether users can dismiss non-critical errors.
   * Critical errors cannot be dismissed regardless of this setting.
   *
   * @default true
   * @example
   * ```html
   * <app-error-boundary [canDismiss]="false">
   *   <!-- Force users to retry critical operations -->
   * </app-error-boundary>
   * ```
   */
  @Input() canDismiss = true;

  /**
   * Customizable label for the retry action button.
   *
   * @default 'Try Again'
   * @example
   * ```html
   * <app-error-boundary [retryLabel]="'Reload Data'">
   *   <!-- content -->
   * </app-error-boundary>
   * ```
   */
  @Input() retryLabel = 'Try Again';

  /**
   * Emitted when the user clicks the retry button.
   * Parent components should handle this to implement recovery logic.
   *
   * @example
   * ```typescript
   * onRetry(): void {
   *   this.loadProjectData();
   * }
   * ```
   */
  @Output() retryClicked = new EventEmitter<void>();

  /**
   * Emitted when the user dismisses a dismissible error.
   * Parent components can use this to perform cleanup or logging.
   *
   * @example
   * ```typescript
   * onErrorDismissed(): void {
   *   this.logErrorResolution('user_dismissed');
   * }
   * ```
   */
  @Output() dismissed = new EventEmitter<void>();

  /** Current error display state */
  hasError = false;

  /** User-friendly error message displayed prominently */
  errorMessage = '';

  /** Error title, auto-generated based on severity if not provided */
  errorTitle = 'Something went wrong';

  /** Optional subtitle providing additional context */
  errorSubtitle = '';

  /** Technical error details shown when showDetails is enabled */
  errorDetails = '';

  /** Error severity affecting styling and dismissal capability */
  errorSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  /** Subject for managing component lifecycle and preventing memory leaks */
  private destroy$ = new Subject<void>();

  /**
   * Creates an instance of ErrorBoundaryComponent.
   *
   * Establishes a subscription to the ErrorHandlerService notification stream
   * to automatically display errors that occur anywhere in the application.
   * The subscription is properly cleaned up on component destruction to prevent
   * memory leaks.
   *
   * @param errorHandler - Service for centralized error handling and notifications
   *
   * @example
   * ```typescript
   * // Component automatically subscribes to error notifications
   * // No manual setup required - errors are displayed automatically
   * constructor(private errorHandler: ErrorHandlerService) {
   *   // Subscription established automatically
   * }
   * ```
   *
   * @since 1.0.0
   */
  constructor(private errorHandler: ErrorHandlerService) {
    this.errorHandler
      .getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        if (notification) {
          this.showError(notification.message);
        }
      });
  }

  /**
   * Performs cleanup when the component is destroyed.
   *
   * Completes the destroy$ subject to unsubscribe from all observables
   * and prevent memory leaks. This is critical for long-lived applications
   * where components are frequently created and destroyed.
   *
   * @example
   * ```typescript
   * // Called automatically by Angular when component is destroyed
   * // No manual intervention required
   * ngOnDestroy(): void {
   *   // All subscriptions automatically cleaned up
   * }
   * ```
   *
   * @since 1.0.0
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Displays an error with comprehensive styling and user options.
   *
   * This method configures the error display with severity-based styling,
   * customizable messaging, and appropriate interaction options. Critical
   * errors automatically disable the dismiss capability to ensure user
   * attention and proper error resolution.
   *
   * @param message - Primary error message displayed to users
   * @param title - Optional error title, auto-generated from severity if not provided
   * @param subtitle - Optional subtitle for additional context
   * @param severity - Error severity affecting styling and dismiss capability
   * @param details - Optional technical details shown when showDetails is enabled
   *
   * @example
   * ```typescript
   * // Basic error display
   * this.showError('Failed to save project');
   *
   * // Comprehensive error with all options
   * this.showError(
   *   'Unable to connect to server',
   *   'Connection Error',
   *   'Please check your internet connection',
   *   'high',
   *   'HttpError: ERR_NETWORK_CHANGED'
   * );
   *
   * // Critical error (cannot be dismissed)
   * this.showError(
   *   'Database corruption detected',
   *   undefined,
   *   undefined,
   *   'critical',
   *   'IndexedDB transaction failed'
   * );
   * ```
   *
   * @since 1.0.0
   */
  showError(
    message: string,
    title?: string,
    subtitle?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    details?: string
  ): void {
    this.hasError = true;
    this.errorMessage = message;
    this.errorTitle = title || this.getDefaultTitle(severity);
    this.errorSubtitle = subtitle || '';
    this.errorSeverity = severity;
    this.errorDetails = details || '';
    this.canDismiss = severity !== 'critical';
  }

  /**
   * Handles retry action and emits retry event for parent components.
   *
   * Clears the current error state and emits the retryClicked event,
   * allowing parent components to implement custom retry logic.
   * This method provides a clean recovery mechanism for temporary
   * failures and user-recoverable errors.
   *
   * @example
   * ```typescript
   * // In parent component
   * onRetryClicked(): void {
   *   this.loadProjectData()
   *     .subscribe({
   *       next: (data) => console.log('Retry successful'),
   *       error: (error) => this.errorBoundary.showError(error.message)
   *     });
   * }
   * ```
   *
   * Emits retryClicked - Event emitted for parent component handling
   * @since 1.0.0
   */
  retry(): void {
    this.hasError = false;
    this.retryClicked.emit();
  }

  /**
   * Dismisses the current error and clears notifications.
   *
   * Hides the error display, emits the dismissed event for parent
   * component handling, and clears the notification from the
   * ErrorHandlerService. Only available for non-critical errors.
   *
   * @example
   * ```typescript
   * // In parent component
   * onErrorDismissed(): void {
   *   this.logUserAction('error_dismissed');
   *   this.resetComponentState();
   * }
   * ```
   *     * Emits dismissed - Event emitted for parent component handling
   * @since 1.0.0
   */
  dismiss(): void {
    this.hasError = false;
    this.dismissed.emit();
    this.errorHandler.clearNotification();
  }

  /**
   * Generates appropriate error titles based on severity levels.
   *
   * Provides consistent, user-friendly titles that reflect the
   * severity and urgency of different error types. Used when
   * no custom title is provided to showError().
   *
   * @param severity - Error severity level
   * @returns User-friendly title text appropriate for the severity
   *
   * @example
   * ```typescript
   * // Internal usage in showError()
   * const title = this.getDefaultTitle('critical'); // Returns "Critical Error"
   * const title = this.getDefaultTitle('low');      // Returns "Notice"
   * ```
   *
   * @private
   * @since 1.0.0
   */
  private getDefaultTitle(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'Critical Error';
      case 'high':
        return 'Error';
      case 'medium':
        return 'Something went wrong';
      case 'low':
        return 'Notice';
      default:
        return 'Something went wrong';
    }
  }
}

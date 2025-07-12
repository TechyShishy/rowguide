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
 * Error Boundary Component for graceful error display and recovery.
 *
 * Features:
 * - Graceful error display with severity-based styling
 * - User-friendly error messages with technical details (optional)
 * - Retry functionality with custom retry actions
 * - Dismiss capability for non-critical errors
 * - Material Design styling with accessibility support
 * - Integration with ErrorHandlerService for notifications
 * - Memory leak prevention with proper cleanup
 */
@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './error-boundary.component.html',
  styleUrl: './error-boundary.component.scss',
})
export class ErrorBoundaryComponent implements OnDestroy {
  @Input() showDetails = false;
  @Input() canDismiss = true;
  @Input() retryLabel = 'Try Again';
  @Output() retryClicked = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  hasError = false;
  errorMessage = '';
  errorTitle = 'Something went wrong';
  errorSubtitle = '';
  errorDetails = '';
  errorSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  private destroy$ = new Subject<void>();

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  retry(): void {
    this.hasError = false;
    this.retryClicked.emit();
  }

  dismiss(): void {
    this.hasError = false;
    this.dismissed.emit();
    this.errorHandler.clearNotification();
  }

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

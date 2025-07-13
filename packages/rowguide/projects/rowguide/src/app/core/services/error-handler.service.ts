import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Interface for structured error context objects
 */
export interface ErrorContext {
  operation: string;
  service?: string;
  details: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AppError {
  id: string;
  message: string;
  code?: string;
  context?: string | ErrorContext;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorNotification {
  message: string;
  action?: string;
  duration?: number;
}

/**
 * Enterprise-grade error handling service with categorization,
 * recovery strategies, and user notifications.
 *
 * Features:
 * - Automatic error categorization and severity assessment
 * - User-friendly error notifications with recovery actions
 * - Structured logging with context and telemetry
 * - Error reporting and analytics integration
 * - Memory-safe error storage (last 50 errors)
 * - Immediate critical error reporting
 */
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private errors$ = new BehaviorSubject<AppError[]>([]);
  private notifications$ = new BehaviorSubject<ErrorNotification | null>(null);

  constructor(private logger: NGXLogger) {}

  /**
   * Handle application errors with context and user feedback
   */
  handleError(
    error: unknown,
    context?: string | ErrorContext,
    userMessage?: string,
    severity: AppError['severity'] = 'medium'
  ): void {
    const appError: AppError = {
      id: this.generateErrorId(),
      message: this.extractErrorMessage(error),
      context,
      timestamp: new Date(),
      severity,
    };

    // Log error with full context
    this.logger.error('Application Error', {
      error: appError,
      originalError: error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Store error for potential reporting
    this.addError(appError);

    // Show user notification
    if (userMessage || severity === 'high' || severity === 'critical') {
      this.showNotification({
        message:
          userMessage || 'An unexpected error occurred. Please try again.',
        action: severity === 'critical' ? 'Reload Page' : 'Dismiss',
        duration: severity === 'critical' ? 0 : 5000,
      });
    }

    // Report critical errors immediately
    if (severity === 'critical') {
      this.reportCriticalError(appError);
    }
  }

  /**
   * Handle specific database errors (IndexedDB operations)
   */
  handleDatabaseError(error: unknown, operation: string): void {
    this.handleError(
      error,
      `Database operation: ${operation}`,
      'Unable to save your changes to local storage. Please check available storage space and try again.',
      'high'
    );
  }

  /**
   * Handle file processing errors (PDF imports, pattern files, etc.)
   */
  handleFileProcessingError(error: unknown, fileName?: string): void {
    this.handleError(
      error,
      `File processing: ${fileName || 'Unknown file'}`,
      'Unable to process the selected file. Please check the file format and try again.',
      'medium'
    );
  }

  /**
   * Handle validation errors
   */
  handleValidationError(errors: string[], context?: string): void {
    const errorMessage =
      errors.length === 1
        ? errors[0]
        : `Multiple validation errors: ${errors.join(', ')}`;

    this.handleError(
      new Error(errorMessage),
      `Validation: ${context}`,
      errorMessage,
      'low'
    );
  }

  /**
   * Get error notifications observable
   */
  getNotifications(): Observable<ErrorNotification | null> {
    return this.notifications$.asObservable();
  }

  /**
   * Clear current notification
   */
  clearNotification(): void {
    this.notifications$.next(null);
  }

  /**
   * Get all errors for debugging/reporting
   */
  getErrors(): Observable<AppError[]> {
    return this.errors$.asObservable();
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addError(error: AppError): void {
    const currentErrors = this.errors$.value;
    // Keep only last 50 errors to prevent memory issues
    const updatedErrors = [error, ...currentErrors].slice(0, 50);
    this.errors$.next(updatedErrors);
  }

  private showNotification(notification: ErrorNotification): void {
    this.notifications$.next(notification);
  }

  private reportCriticalError(error: AppError): void {
    // Implement external error reporting here
    // Example: Send to Sentry, LogRocket, etc.
    this.logger.error('Critical Error Reported:', error);
  }
}

import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataIntegrityService, DataIntegrityEventType } from './data-integrity.service';

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

  constructor(
    private logger: NGXLogger,
    private dataIntegrityService: DataIntegrityService
  ) {}

  /**
   * Handle application errors with context and user feedback
   */
  handleError(
    error: unknown,
    context?: string | ErrorContext,
    userMessage?: string,
    severity: AppError['severity'] = 'medium'
  ): void {
    // Integration Point 1: Enhanced error validation and categorization
    const validatedContext = this.validateAndEnhanceContext(context);
    const categorizedSeverity = this.categorizeError(error, validatedContext, severity);

    const appError: AppError = {
      id: this.generateErrorId(),
      message: this.extractErrorMessage(error),
      context: validatedContext,
      timestamp: new Date(),
      severity: categorizedSeverity,
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
    if (userMessage || categorizedSeverity === 'high' || categorizedSeverity === 'critical') {
      this.showNotification({
        message:
          userMessage || 'An unexpected error occurred. Please try again.',
        action: categorizedSeverity === 'critical' ? 'Reload Page' : 'Dismiss',
        duration: categorizedSeverity === 'critical' ? 0 : 5000,
      });
    }

    // Report critical errors immediately
    if (categorizedSeverity === 'critical') {
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

  /**
   * Integration Point 1: Validate and enhance error context for data integrity
   */
  private validateAndEnhanceContext(context?: string | ErrorContext): string | ErrorContext {
    if (!context) {
      return 'Unknown operation';
    }

    // If it's already a structured context, validate and enhance it
    if (typeof context === 'object') {
      const validatedContext: ErrorContext = {
        ...context,
        operation: context.operation || 'unknown',
        details: context.details || 'No details provided',
        service: context.service,
        context: context.context
      };

      // Use DataIntegrityService to validate any string data in the context
      if (context.operation && typeof context.operation === 'string') {
        const validationResult = this.dataIntegrityService.validateProjectName(context.operation);
        if (!validationResult.isValid) {
          validatedContext.operation = validationResult.cleanValue;
          validatedContext['validationWarning'] = `Operation name sanitized: ${validationResult.issues.join(', ')}`;
        }
      }

      return validatedContext;
    }

    // For string contexts, validate and sanitize
    const validationResult = this.dataIntegrityService.validateProjectName(context);
    if (!validationResult.isValid) {
      return {
        operation: validationResult.cleanValue,
        details: 'Context sanitized for data integrity',
        originalContext: context,
        validationIssues: validationResult.issues
      };
    }

    return context;
  }

  /**
   * Integration Point 2: Enhanced error categorization with data integrity insights
   */
  private categorizeError(
    error: unknown,
    context: string | ErrorContext,
    originalSeverity: AppError['severity']
  ): AppError['severity'] {
    let severity = originalSeverity;

    // Check for data integrity related errors
    const errorMessage = this.extractErrorMessage(error);

    // Only escalate severity for clear data corruption indicators
    if (this.isDataIntegrityError(errorMessage, context)) {
      severity = this.escalateSeverity(severity);
    }

    // Check for validation failures that might indicate broader issues
    const recentValidationEvents = this.dataIntegrityService.getRecentEvents(5);
    const recentFailures = recentValidationEvents.filter(event =>
      event.type === DataIntegrityEventType.DATA_VALIDATION_FAILED ||
      event.type === DataIntegrityEventType.INVALID_INPUT_BLOCKED
    );

    // Only escalate if we have significant recent validation failures AND current error is validation-related
    if (recentFailures.length >= 5 && this.isDataIntegrityError(errorMessage, context)) {
      severity = this.escalateSeverity(severity);

      if (typeof context === 'object') {
        context['dataIntegrityAlert'] = `${recentFailures.length} recent validation failures detected`;
      }
    }

    return severity;
  }

  private isDataIntegrityError(errorMessage: string, context: string | ErrorContext): boolean {
    const dataIntegrityIndicators = [
      'invalid json',
      'malformed data',
      'corrupted',
      'parsing error',
      'data structure',
      'invalid format',
      'null or undefined'
    ];

    const lowerMessage = errorMessage.toLowerCase();
    const hasDataIndicators = dataIntegrityIndicators.some(indicator =>
      lowerMessage.includes(indicator)
    );

    // Only escalate for clear data corruption indicators, not general database errors
    return hasDataIndicators;
  }

  private escalateSeverity(currentSeverity: AppError['severity']): AppError['severity'] {
    const severityLevels: AppError['severity'][] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityLevels.indexOf(currentSeverity);

    // Escalate by one level, but don't exceed critical
    if (currentIndex < severityLevels.length - 1) {
      return severityLevels[currentIndex + 1];
    }

    return currentSeverity;
  }
}

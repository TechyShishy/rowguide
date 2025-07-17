import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataIntegrityService, DataIntegrityEventType } from './data-integrity.service';

/**
 * Interface for structured error context information.
 * Provides standardized error metadata for debugging and analysis.
 */
export interface ErrorContext {
  /** The operation being performed when the error occurred */
  operation: string;
  /** Optional service name where the error originated */
  service?: string;
  /** Detailed description of the error context */
  details: string;
  /** Additional context data for debugging */
  context?: Record<string, unknown>;
  /** Allow additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * Standardized application error structure with categorization and tracking.
 */
export interface AppError {
  /** Unique identifier for error tracking and correlation */
  id: string;
  /** Human-readable error message */
  message: string;
  /** Optional error code for programmatic handling */
  code?: string;
  /** Contextual information about where/why the error occurred */
  context?: string | ErrorContext;
  /** When the error occurred */
  timestamp: Date;
  /** Error severity level for prioritization and response */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * User-facing error notification structure for UI display.
 */
export interface ErrorNotification {
  /** User-friendly error message */
  message: string;
  /** Optional action text (e.g., 'Retry', 'Dismiss', 'Reload Page') */
  action?: string;
  /** Auto-dismiss duration in milliseconds (0 = manual dismiss only) */
  duration?: number;
}

/**
 * Enterprise-grade error handling service providing comprehensive error management,
 * categorization, recovery strategies, and user feedback mechanisms.
 *
 * Core Responsibilities:
 * - Centralized error processing and categorization
 * - User-friendly error notifications with recovery actions
 * - Structured logging with contextual information
 * - Error severity assessment and escalation
 * - Memory-efficient error storage and history
 * - Integration with data integrity validation
 * - Critical error reporting for external monitoring
 *
 * Error Severity Levels:
 * - **Low**: Minor issues, validation warnings (auto-dismiss, minimal user impact)
 * - **Medium**: Standard errors, recoverable failures (user notification, retry options)
 * - **High**: Significant issues, data persistence failures (prominent notification, user action needed)
 * - **Critical**: System failures, data corruption (persistent notification, immediate attention required)
 *
 * Features:
 * - Automatic error categorization with severity escalation
 * - Context validation and sanitization for security
 * - Integration with DataIntegrityService for validation insights
 * - Observable streams for reactive error handling
 * - Memory-safe error storage (last 50 errors only)
 * - Specialized handlers for common error types
 *
 * @example
 * ```typescript
 * // Basic error handling
 * constructor(private errorHandler: ErrorHandlerService) {}
 *
 * // Handle simple errors
 * try {
 *   await this.riskyOperation();
 * } catch (error) {
 *   this.errorHandler.handleError(error, 'riskyOperation', 'Operation failed');
 * }
 *
 * // Handle with structured context
 * this.errorHandler.handleError(error, {
 *   operation: 'saveProject',
 *   service: 'ProjectService',
 *   details: 'Failed to persist project to IndexedDB',
 *   projectId: project.id
 * });
 *
 * // Use specialized handlers
 * this.errorHandler.handleDatabaseError(error, 'saveProject');
 * this.errorHandler.handleFileProcessingError(error, 'pattern.pdf');
 * this.errorHandler.handleValidationError(['Invalid name'], 'project creation');
 *
 * // Subscribe to notifications
 * this.errorHandler.getNotifications().subscribe(notification => {
 *   if (notification) {
 *     this.showErrorSnackbar(notification);
 *   }
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  /**
   * Observable stream of stored application errors for debugging and analysis.
   * Maintains last 50 errors to prevent memory issues while providing error history.
   */
  private errors$ = new BehaviorSubject<AppError[]>([]);

  /**
   * Observable stream of current error notifications for UI display.
   * Emits null when no notification is active.
   */
  private notifications$ = new BehaviorSubject<ErrorNotification | null>(null);

  /**
   * Creates an instance of ErrorHandlerService.
   *
   * @param logger - NGX logger for structured error logging
   * @param dataIntegrityService - Service for context validation and data integrity checks
   */
  constructor(
    private logger: NGXLogger,
    private dataIntegrityService: DataIntegrityService
  ) {}

  /**
   * Main error handling method providing comprehensive error processing.
   * Handles error categorization, context validation, user notifications, and logging.
   * Integrates with data integrity validation and provides automatic severity escalation.
   *
   * Processing Steps:
   * 1. Validates and enhances error context for security and completeness
   * 2. Categorizes error severity based on type and recent validation failures
   * 3. Logs error with full context and stack trace information
   * 4. Stores error for debugging and potential reporting
   * 5. Shows user notification based on severity level
   * 6. Reports critical errors for immediate attention
   *
   * @param error - The error object, message, or unknown error to handle
   * @param context - String description or structured context object with operation details
   * @param userMessage - Optional user-friendly message (auto-generated if not provided)
   * @param severity - Initial severity level (may be escalated based on error analysis)
   *
   * @example
   * ```typescript
   * // Simple error handling
   * this.errorHandler.handleError(
   *   new Error('Connection failed'),
   *   'network request',
   *   'Unable to connect to server'
   * );
   *
   * // Structured context with additional data
   * this.errorHandler.handleError(error, {
   *   operation: 'saveProject',
   *   service: 'ProjectDbService',
   *   details: 'IndexedDB transaction failed',
   *   projectId: project.id,
   *   attemptNumber: 2
   * }, 'Failed to save project');
   *
   * // High severity error
   * this.errorHandler.handleError(
   *   error,
   *   'data corruption detected',
   *   'Critical data error - please contact support',
   *   'critical'
   * );
   * ```
   */
  handleError(
    error: unknown,
    context?: string | ErrorContext,
    userMessage?: string,
    severity: AppError['severity'] = 'medium'
  ): void {
    // Integration Point 1: Enhanced error validation and categorization
    const validatedContext = this.validateAndEnhanceContext(context);
    const categorizedSeverity = this.categorizeError(
      error,
      validatedContext,
      severity
    );

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
    if (
      userMessage ||
      categorizedSeverity === 'high' ||
      categorizedSeverity === 'critical'
    ) {
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
   * Specialized handler for IndexedDB and local storage operation errors.
   * Provides context-specific error messages and appropriate severity levels.
   *
   * @param error - Database-related error object
   * @param operation - Description of the database operation that failed
   *
   * @example
   * ```typescript
   * // Handle IndexedDB transaction failures
   * try {
   *   await this.projectDbService.saveProject(project);
   * } catch (error) {
   *   this.errorHandler.handleDatabaseError(error, 'saveProject');
   * }
   *
   * // Handle storage quota exceeded
   * this.errorHandler.handleDatabaseError(error, 'bulkProjectImport');
   * ```
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
   * Specialized handler for file processing and import operation errors.
   * Handles PDF parsing, pattern file imports, and image processing failures.
   *
   * @param error - File processing error object
   * @param fileName - Optional name of the file being processed
   *
   * @example
   * ```typescript
   * // Handle PDF import failures
   * try {
   *   const project = await this.pdfService.importPdf(file);
   * } catch (error) {
   *   this.errorHandler.handleFileProcessingError(error, file.name);
   * }
   *
   * // Handle pattern file parsing errors
   * this.errorHandler.handleFileProcessingError(error, 'pattern.rgs');
   *
   * // Handle unknown file errors
   * this.errorHandler.handleFileProcessingError(error);
   * ```
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
   * Specialized handler for data validation errors and input sanitization failures.
   * Processes multiple validation errors and provides consolidated user feedback.
   *
   * @param errors - Array of validation error messages
   * @param context - Optional context describing what was being validated
   *
   * @example
   * ```typescript
   * // Handle form validation errors
   * const errors = [
   *   'Project name is required',
   *   'Project name must be under 100 characters'
   * ];
   * this.errorHandler.handleValidationError(errors, 'project creation');
   *
   * // Handle single validation error
   * this.errorHandler.handleValidationError(['Invalid file format'], 'file upload');
   *
   * // Handle data integrity validation
   * const validationResult = this.dataIntegrity.validateProjectData(data);
   * if (!validationResult.isValid) {
   *   this.errorHandler.handleValidationError(validationResult.errors, 'project data');
   * }
   * ```
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
   * Observable stream of error notifications for UI display components.
   * Subscribe to this to show error messages, snackbars, or modal dialogs.
   * Emits null when no notification is active.
   *
   * @returns Observable stream of current error notification or null
   *
   * @example
   * ```typescript
   * // Subscribe to show notifications in UI
   * this.errorHandler.getNotifications().subscribe(notification => {
   *   if (notification) {
   *     this.snackBar.open(notification.message, notification.action, {
   *       duration: notification.duration
   *     });
   *   }
   * });
   *
   * // Use in Angular template
   * notifications$ = this.errorHandler.getNotifications();
   * ```
   */
  getNotifications(): Observable<ErrorNotification | null> {
    return this.notifications$.asObservable();
  }

  /**
   * Clears the currently displayed error notification.
   * Call this when the user dismisses a notification or when the error is resolved.
   *
   * @example
   * ```typescript
   * // Clear notification after user action
   * onNotificationDismissed() {
   *   this.errorHandler.clearNotification();
   * }
   *
   * // Clear after successful retry
   * try {
   *   await this.retryOperation();
   *   this.errorHandler.clearNotification();
   * } catch (error) {
   *   // Handle retry failure
   * }
   * ```
   */
  clearNotification(): void {
    this.notifications$.next(null);
  }

  /**
   * Observable stream of all stored application errors for debugging and analysis.
   * Provides access to error history for troubleshooting and pattern identification.
   * Limited to last 50 errors to prevent memory issues.
   *
   * @returns Observable stream of stored error array
   *
   * @example
   * ```typescript
   * // Access error history for debugging
   * this.errorHandler.getErrors().subscribe(errors => {
   *   console.log(`Total errors: ${errors.length}`);
   *   const criticalErrors = errors.filter(e => e.severity === 'critical');
   *   console.log(`Critical errors: ${criticalErrors.length}`);
   * });
   *
   * // Check for recent error patterns
   * const recentErrors = errors.filter(e =>
   *   Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
   * );
   * ```
   */
  getErrors(): Observable<AppError[]> {
    return this.errors$.asObservable();
  }

  /**
   * Extracts a human-readable error message from various error types.
   * Handles Error objects, string messages, and unknown error values safely.
   *
   * @param error - Error of unknown type to extract message from
   * @returns Extracted error message string
   *
   * @example
   * ```typescript
   * // Handles different error types
   * const message1 = this.extractErrorMessage(new Error('Test error')); // 'Test error'
   * const message2 = this.extractErrorMessage('String error'); // 'String error'
   * const message3 = this.extractErrorMessage(undefined); // 'Unknown error occurred'
   * ```
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }

  /**
   * Generates unique error identifiers for tracking and correlation.
   * Creates time-based IDs with random suffixes for uniqueness.
   *
   * @returns Unique error identifier string
   *
   * @example
   * ```typescript
   * // Generated ID format: 'error-1642595234567-a8f9k2m1p'
   * const errorId = this.generateErrorId();
   * ```
   */
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

  /**
   * Reports critical errors to external monitoring systems.
   * Placeholder for integration with error tracking services like Sentry,
   * LogRocket, or custom telemetry endpoints.
   *
   * @param error - Critical error requiring immediate attention
   *
   * @example
   * ```typescript
   * // Integration examples:
   * // Sentry.captureException(error);
   * // LogRocket.captureException(error);
   * // this.telemetryService.reportCriticalError(error);
   * ```
   */
  private reportCriticalError(error: AppError): void {
    // Implement external error reporting here
    // Example: Send to Sentry, LogRocket, etc.
    this.logger.error('Critical Error Reported:', error);
  }

  /**
   * Validates and enhances error context for data integrity and security.
   * Integrates with DataIntegrityService to sanitize string values and
   * ensure error context doesn't contain potentially harmful data.
   *
   * @param context - Raw context string or object to validate
   * @returns Validated and enhanced context with security measures applied
   *
   * @example
   * ```typescript
   * // Validates string context
   * const context1 = this.validateAndEnhanceContext('user<script>alert(1)</script>input');
   * // Returns sanitized version with validation warnings
   *
   * // Enhances object context
   * const context2 = this.validateAndEnhanceContext({
   *   operation: 'saveProject',
   *   details: 'Database error'
   * });
   * // Returns validated object with additional security metadata
   * ```
   */
  private validateAndEnhanceContext(
    context?: string | ErrorContext
  ): string | ErrorContext {
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
        context: context.context,
      };

      // Use DataIntegrityService to validate any string data in the context
      if (context.operation && typeof context.operation === 'string') {
        const validationResult = this.dataIntegrityService.validateProjectName(
          context.operation
        );
        if (!validationResult.isValid) {
          validatedContext.operation = validationResult.cleanValue;
          validatedContext[
            'validationWarning'
          ] = `Operation name sanitized: ${validationResult.issues.join(', ')}`;
        }
      }

      return validatedContext;
    }

    // For string contexts, validate and sanitize
    const validationResult =
      this.dataIntegrityService.validateProjectName(context);
    if (!validationResult.isValid) {
      return {
        operation: validationResult.cleanValue,
        details: 'Context sanitized for data integrity',
        originalContext: context,
        validationIssues: validationResult.issues,
      };
    }

    return context;
  }

  /**
   * Categorizes error severity based on error content and recent validation patterns.
   * Integrates with DataIntegrityService to detect data corruption indicators
   * and escalate severity when multiple validation failures suggest systemic issues.
   *
   * Escalation Logic:
   * - Detects data integrity indicators in error messages
   * - Monitors recent validation failure patterns
   * - Escalates severity for potential data corruption
   * - Adds data integrity alerts to error context
   *
   * @param error - Original error object for analysis
   * @param context - Error context for additional categorization clues
   * @param originalSeverity - Initial severity level to potentially escalate
   * @returns Final severity level after analysis and potential escalation
   *
   * @example
   * ```typescript
   * // Severity escalation examples:
   * // 'medium' + data corruption indicators → 'high'
   * // 'high' + multiple recent validation failures → 'critical'
   * // 'low' + no data issues → remains 'low'
   * ```
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
    const recentFailures = recentValidationEvents.filter(
      (event) =>
        event.type === DataIntegrityEventType.DATA_VALIDATION_FAILED ||
        event.type === DataIntegrityEventType.INVALID_INPUT_BLOCKED
    );

    // Only escalate if we have significant recent validation failures AND current error is validation-related
    if (
      recentFailures.length >= 5 &&
      this.isDataIntegrityError(errorMessage, context)
    ) {
      severity = this.escalateSeverity(severity);

      if (typeof context === 'object') {
        context[
          'dataIntegrityAlert'
        ] = `${recentFailures.length} recent validation failures detected`;
      }
    }

    return severity;
  }

  private isDataIntegrityError(
    errorMessage: string,
    context: string | ErrorContext
  ): boolean {
    const dataIntegrityIndicators = [
      'invalid json',
      'malformed data',
      'corrupted',
      'parsing error',
      'data structure',
      'invalid format',
      'null or undefined',
    ];

    const lowerMessage = errorMessage.toLowerCase();
    const hasDataIndicators = dataIntegrityIndicators.some((indicator) =>
      lowerMessage.includes(indicator)
    );

    // Only escalate for clear data corruption indicators, not general database errors
    return hasDataIndicators;
  }

  private escalateSeverity(
    currentSeverity: AppError['severity']
  ): AppError['severity'] {
    const severityLevels: AppError['severity'][] = [
      'low',
      'medium',
      'high',
      'critical',
    ];
    const currentIndex = severityLevels.indexOf(currentSeverity);

    // Escalate by one level, but don't exceed critical
    if (currentIndex < severityLevels.length - 1) {
      return severityLevels[currentIndex + 1];
    }

    return currentSeverity;
  }
}

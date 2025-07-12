/**
 * Data Integrity Service for Rowguide application.
 *
 * Focuses on actual threats for a single-user local application:
 * - Input validation to prevent app crashes and data corruption
 * - File operation safety for PDF imports and data exports
 * - IndexedDB data integrity validation
 * - Basic error boundaries for malformed data
 *
 * Does NOT include web security measures like XSS protection,
 * as they provide no value for local single-user deployment.
 */

import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

/**
 * Data integrity event types for debugging
 */
export enum DataIntegrityEventType {
  INVALID_INPUT_BLOCKED = 'invalid_input_blocked',
  DATA_VALIDATION_FAILED = 'data_validation_failed',
  FILE_OPERATION_ERROR = 'file_operation_error',
  CONFIGURATION_APPLIED = 'configuration_applied',
}

/**
 * Data integrity event for local debugging
 */
export interface DataIntegrityEvent {
  readonly type: DataIntegrityEventType;
  readonly message: string;
  readonly details?: any;
  readonly timestamp: Date;
}

/**
 * Input validation result focused on data integrity
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly cleanValue: string;
  readonly issues: string[];
  readonly originalValue: string;
}

/**
 * Configuration for data integrity checks
 */
export interface DataIntegrityConfig {
  readonly enableInputValidation: boolean;
  readonly enableLogging: boolean;
  readonly strictMode: boolean; // More aggressive validation
}

/**
 * Default configuration optimized for local single-user deployment
 */
const DEFAULT_CONFIG: DataIntegrityConfig = {
  enableInputValidation: true,
  enableLogging: true,
  strictMode: false, // Relaxed for local use
};

/**
 * Data integrity service for single-user local deployment
 *
 * Focuses on preventing app crashes and data corruption rather than
 * web security threats that don't apply to local single-user apps.
 */
@Injectable({ providedIn: 'root' })
export class DataIntegrityService {
  private readonly config: DataIntegrityConfig;
  private readonly eventLog: DataIntegrityEvent[] = [];
  private readonly maxLogSize = 50; // Small log for local debugging

  constructor(private logger: NGXLogger) {
    this.config = DEFAULT_CONFIG;
    this.initialize();
  }

  /**
   * Initialize data integrity measures for local deployment
   */
  private initialize(): void {
    this.logger.info(
      'Data integrity service initialized for local deployment',
      {
        validation: this.config.enableInputValidation,
        logging: this.config.enableLogging,
        strictMode: this.config.strictMode,
      }
    );

    this.logEvent(
      DataIntegrityEventType.CONFIGURATION_APPLIED,
      'Data integrity configuration applied for local deployment'
    );
  }

  /**
   * Validate project name to prevent crashes and data issues
   * No XSS protection needed - just data integrity
   */
  validateProjectName(name: string): ValidationResult {
    const issues: string[] = [];
    let cleanValue = name;

    if (!this.config.enableInputValidation) {
      return {
        isValid: true,
        cleanValue: name,
        issues: [],
        originalValue: name,
      };
    }

    try {
      // Basic data integrity checks
      if (typeof name !== 'string') {
        issues.push('Project name must be a string');
        cleanValue = String(name || '');
      }

      if (name.trim().length === 0) {
        issues.push('Project name cannot be empty');
      }

      if (name.length > 255) {
        issues.push('Project name too long (max 255 characters)');
        cleanValue = name.substring(0, 255);
      }

      // Remove null bytes and control characters that could cause issues
      const controlCharsRemoved = cleanValue.replace(/[\x00-\x1F\x7F]/g, '');
      if (controlCharsRemoved !== cleanValue) {
        issues.push('Removed control characters');
        cleanValue = controlCharsRemoved;
      }

      // Check for characters that might cause file system issues
      const invalidFileChars = /[<>:"/\\|?*]/g;
      if (invalidFileChars.test(cleanValue)) {
        issues.push('Removed characters that could cause file system issues');
        cleanValue = cleanValue.replace(invalidFileChars, '_');
      }

      if (issues.length > 0) {
        this.logEvent(
          DataIntegrityEventType.INVALID_INPUT_BLOCKED,
          'Project name validation issues found',
          {
            originalLength: name.length,
            cleanLength: cleanValue.length,
            issueCount: issues.length,
          }
        );
      }

      return {
        isValid: issues.length === 0,
        cleanValue,
        issues,
        originalValue: name,
      };
    } catch (error) {
      this.logger.error('Project name validation failed:', error);
      return {
        isValid: false,
        cleanValue: 'Untitled Project', // Safe fallback
        issues: ['Validation error - using safe fallback'],
        originalValue: name,
      };
    }
  }

  /**
   * Validate JSON data to prevent parsing errors
   */
  validateJsonData(data: string): {
    isValid: boolean;
    parsed?: any;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(data);
      return { isValid: true, parsed };
    } catch (error) {
      this.logEvent(
        DataIntegrityEventType.DATA_VALIDATION_FAILED,
        'Invalid JSON data detected',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown JSON error',
      };
    }
  }

  /**
   * Validate file path for safe file operations
   */
  validateFilePath(path: string): ValidationResult {
    const issues: string[] = [];
    let cleanValue = path;

    // Prevent directory traversal
    if (path.includes('..')) {
      issues.push('Directory traversal attempt blocked');
      cleanValue = path.replace(/\.\./g, '');
    }

    // Check for absolute paths that might escape sandbox
    if (
      path.startsWith('/') ||
      /^[A-Za-z]:/.test(path) ||
      path.startsWith('\\\\')
    ) {
      issues.push('Absolute path converted to relative');
      cleanValue = path.replace(/^([A-Za-z]:)?[/\\]+/, '').replace(/^\\\\/, '');
    }

    return {
      isValid: issues.length === 0,
      cleanValue,
      issues,
      originalValue: path,
    };
  }

  /**
   * Get recent integrity events for debugging
   */
  getRecentEvents(limit: number = 20): readonly DataIntegrityEvent[] {
    return this.eventLog.slice(0, Math.min(limit, this.eventLog.length));
  }

  /**
   * Clear event log (development utility)
   */
  clearEventLog(): void {
    this.eventLog.length = 0;
    this.logger.debug('Data integrity event log cleared');
  }

  /**
   * Log data integrity event with minimal overhead
   */
  private logEvent(
    type: DataIntegrityEventType,
    message: string,
    details?: any
  ): void {
    if (!this.config.enableLogging) {
      return;
    }

    const event: DataIntegrityEvent = {
      type,
      message,
      details,
      timestamp: new Date(),
    };

    this.eventLog.unshift(event);

    // Maintain small log size
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.splice(this.maxLogSize);
    }

    // Log validation failures and errors
    if (
      type === DataIntegrityEventType.DATA_VALIDATION_FAILED ||
      type === DataIntegrityEventType.FILE_OPERATION_ERROR
    ) {
      this.logger.warn(`Data Integrity [${type}]:`, message, details);
    } else {
      this.logger.debug(`Data Integrity [${type}]:`, message, details);
    }
  }
}

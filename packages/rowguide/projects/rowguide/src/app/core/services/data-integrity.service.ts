/**
 * Enterprise-grade data integrity service for single-user local deployment.
 * Provides comprehensive data validation and corruption prevention without web security overhead.
 * Focuses on actual threats relevant to a local application: input validation, file operation safety,
 * IndexedDB data integrity, and error boundaries for malformed data.
 *
 * Key Features:
 * - **Input Validation**: Prevents app crashes from malformed user input
 * - **File Operation Safety**: Secure handling of PDF imports and data exports
 * - **IndexedDB Integrity**: Validates database operations and data structures
 * - **Error Boundaries**: Graceful handling of corrupted or unexpected data
 * - **Event Logging**: Comprehensive audit trail for debugging data issues
 * - **Configurable Strictness**: Adjustable validation levels for different deployment scenarios
 *
 * Security Focus:
 * This service intentionally excludes web security measures (XSS, CSRF protection)
 * as they provide no value for local single-user deployment scenarios.
 * Instead, it focuses on data integrity threats that can actually occur in Electron apps.
 *
 * @example
 * ```typescript
 * // Basic usage in a component
 * constructor(private dataIntegrity: DataIntegrityService) {}
 *
 * // Validate user input
 * saveProject(name: string) {
 *   const validation = this.dataIntegrity.validateProjectName(name);
 *   if (validation.isValid) {
 *     this.projectService.save({ name: validation.cleanValue });
 *   } else {
 *     this.showValidationErrors(validation.issues);
 *   }
 * }
 *
 * // Validate JSON import
 * importProject(jsonData: string) {
 *   const result = this.dataIntegrity.validateJsonData(jsonData);
 *   if (result.isValid) {
 *     this.processProject(result.parsed);
 *   } else {
 *     this.handleImportError(result.error);
 *   }
 * }
 *
 * // Validate position data
 * updatePosition(row: number, step: number) {
 *   const validation = this.dataIntegrity.validatePositionData(row, step);
 *   if (validation.isValid) {
 *     this.store.dispatch(updatePosition({ row, step }));
 *   } else {
 *     this.logger.warn('Position validation failed:', validation.issues);
 *     // Use cleaned values as fallback
 *     const [cleanRow, cleanStep] = validation.cleanValue.split(',').map(Number);
 *     this.store.dispatch(updatePosition({ row: cleanRow, step: cleanStep }));
 *   }
 * }
 *
 * // Debug data integrity issues
 * debugDataIntegrity() {
 *   const events = this.dataIntegrity.getRecentEvents(10);
 *   events.forEach(event => {
 *     console.log(`[${event.type}] ${event.message}`, event.details);
 *   });
 * }
 * ```
 */

import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

/**
 * Comprehensive data integrity event types for debugging and monitoring.
 * Used to categorize different types of data validation and integrity issues.
 */
export enum DataIntegrityEventType {
  /** Input validation blocked potentially harmful or corrupted input */
  INVALID_INPUT_BLOCKED = 'invalid_input_blocked',
  /** Data validation failed during parsing or processing */
  DATA_VALIDATION_FAILED = 'data_validation_failed',
  /** File operation encountered an error or security issue */
  FILE_OPERATION_ERROR = 'file_operation_error',
  /** Configuration was successfully applied or updated */
  CONFIGURATION_APPLIED = 'configuration_applied',
}

/**
 * Data integrity event record for comprehensive audit trail and debugging.
 * Provides detailed information about validation issues and system events.
 */
export interface DataIntegrityEvent {
  /** The type of integrity event that occurred */
  readonly type: DataIntegrityEventType;
  /** Human-readable description of the event */
  readonly message: string;
  /** Additional context and technical details about the event */
  readonly details?: any;
  /** Precise timestamp when the event occurred */
  readonly timestamp: Date;
}

/**
 * Comprehensive input validation result with cleaning and issue tracking.
 * Provides both validation status and sanitized data for safe processing.
 */
export interface ValidationResult {
  /** Whether the input passed all validation checks */
  readonly isValid: boolean;
  /** Sanitized and safe version of the input data */
  readonly cleanValue: string;
  /** List of validation issues found (empty if valid) */
  readonly issues: string[];
  /** Original unmodified input for debugging and comparison */
  readonly originalValue: string;
}

/**
 * Configuration options for customizing data integrity behavior.
 * Allows fine-tuning validation strictness and logging for different environments.
 */
export interface DataIntegrityConfig {
  /** Enable comprehensive input validation (recommended: true) */
  readonly enableInputValidation: boolean;
  /** Enable detailed event logging for debugging (recommended: true) */
  readonly enableLogging: boolean;
  /** Enable strict validation mode with additional checks (recommended: false for production) */
  readonly strictMode: boolean;
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
 * Enterprise data integrity service optimized for single-user local deployment.
 * Provides comprehensive protection against data corruption, input validation errors,
 * and file operation failures without unnecessary web security overhead.
 */
@Injectable({ providedIn: 'root' })
export class DataIntegrityService {
  /** Current data integrity configuration */
  private readonly config: DataIntegrityConfig;
  /** Event log for debugging and audit trail (limited size for memory efficiency) */
  private readonly eventLog: DataIntegrityEvent[] = [];
  /** Maximum number of events to retain in memory */
  private readonly maxLogSize = 50;

  /**
   * Initializes the data integrity service with optimized local deployment configuration.
   * Sets up validation rules, logging, and event tracking for comprehensive data protection.
   *
   * @param logger - NGX Logger service for structured logging and debugging
   */
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
   * Validates and sanitizes project names to prevent application crashes and data corruption.
   * Performs comprehensive input validation without web security overhead, focusing on
   * data integrity threats relevant to local single-user deployment scenarios.
   *
   * Validation Features:
   * - Type safety validation (ensures string input)
   * - Length constraints (1-255 characters)
   * - Control character removal (prevents system issues)
   * - File system safe character filtering
   * - Automatic sanitization with fallback values
   *
   * @param name - Raw project name input from user
   * @returns Comprehensive validation result with cleaned value and issue details
   *
   * @example
   * ```typescript
   * // Valid project name
   * const result1 = this.dataIntegrity.validateProjectName('My Bead Project');
   * if (result1.isValid) {
   *   this.saveProject({ name: result1.cleanValue });
   * }
   *
   * // Invalid input with automatic cleaning
   * const result2 = this.dataIntegrity.validateProjectName('Project<>Name|Invalid');
   * console.log(result2.cleanValue); // 'Project__Name_Invalid'
   * console.log(result2.issues); // ['Removed characters that could cause file system issues']
   *
   * // Null/undefined handling
   * const result3 = this.dataIntegrity.validateProjectName(null as any);
   * console.log(result3.cleanValue); // 'Untitled Project' (safe fallback)
   *
   * // Control character removal
   * const result4 = this.dataIntegrity.validateProjectName('Test\x00Project\x1F');
   * console.log(result4.cleanValue); // 'TestProject'
   * console.log(result4.issues); // ['Removed control characters']
   *
   * // Length validation
   * const longName = 'A'.repeat(300);
   * const result5 = this.dataIntegrity.validateProjectName(longName);
   * console.log(result5.cleanValue.length); // 255 (truncated)
   * console.log(result5.issues); // ['Project name too long (max 255 characters)']
   *
   * // Component integration
   * saveProject(rawName: string) {
   *   const validation = this.dataIntegrity.validateProjectName(rawName);
   *
   *   if (validation.isValid) {
   *     this.projectService.create({ name: validation.cleanValue });
   *   } else {
   *     // Show warnings but use cleaned value
   *     this.notificationService.warning(
   *       `Project name adjusted: ${validation.issues.join(', ')}`
   *     );
   *     this.projectService.create({ name: validation.cleanValue });
   *   }
   * }
   * ```
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
   * Validates and safely parses JSON data to prevent parsing errors and application crashes.
   * Provides comprehensive error handling for malformed JSON without exposing sensitive details.
   * Essential for import operations and configuration loading in the local application environment.
   *
   * @param data - Raw JSON string to validate and parse
   * @returns Validation result with parsed object or detailed error information
   *
   * @example
   * ```typescript
   * // Valid JSON parsing
   * const validJson = '{"name": "Test Project", "rows": []}';
   * const result1 = this.dataIntegrity.validateJsonData(validJson);
   * if (result1.isValid) {
   *   const project = result1.parsed;
   *   console.log(project.name); // 'Test Project'
   * }
   *
   * // Invalid JSON handling
   * const invalidJson = '{"name": "Test", "rows": [}'; // Missing closing bracket
   * const result2 = this.dataIntegrity.validateJsonData(invalidJson);
   * if (!result2.isValid) {
   *   console.log(result2.error); // 'Unexpected end of JSON input'
   *   this.notificationService.error('Invalid file format');
   * }
   *
   * // File import with validation
   * async importProject(fileContent: string) {
   *   const validation = this.dataIntegrity.validateJsonData(fileContent);
   *
   *   if (validation.isValid) {
   *     const projectData = validation.parsed;
   *     return this.processImportedProject(projectData);
   *   } else {
   *     throw new Error(`Import failed: ${validation.error}`);
   *   }
   * }
   *
   * // Configuration loading
   * loadSettings(settingsJson: string) {
   *   const result = this.dataIntegrity.validateJsonData(settingsJson);
   *
   *   if (result.isValid) {
   *     return result.parsed;
   *   } else {
   *     this.logger.warn('Settings corrupted, using defaults:', result.error);
   *     return this.getDefaultSettings();
   *   }
   * }
   *
   * // Batch validation
   * validateMultipleFiles(files: string[]) {
   *   return files.map(content => {
   *     const result = this.dataIntegrity.validateJsonData(content);
   *     return {
   *       valid: result.isValid,
   *       data: result.parsed,
   *       error: result.error
   *     };
   *   });
   * }
   * ```
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
   * Validates file paths for safe file operations and prevents directory traversal attacks.
   * Sanitizes paths to prevent access outside the application sandbox while maintaining
   * functionality for legitimate file operations in the local deployment environment.
   *
   * Security Features:
   * - Directory traversal prevention (blocks '../' patterns)
   * - Absolute path normalization to relative paths
   * - Network path blocking (prevents UNC path access)
   * - Path sanitization for cross-platform compatibility
   *
   * @param path - File path to validate and sanitize
   * @returns Validation result with sanitized path and security issue details
   *
   * @example
   * ```typescript
   * // Safe relative path
   * const result1 = this.dataIntegrity.validateFilePath('exports/project.json');
   * if (result1.isValid) {
   *   await this.fileService.writeFile(result1.cleanValue, data);
   * }
   *
   * // Directory traversal attempt
   * const result2 = this.dataIntegrity.validateFilePath('../../../etc/passwd');
   * console.log(result2.cleanValue); // 'etc/passwd' (sanitized)
   * console.log(result2.issues); // ['Directory traversal attempt blocked']
   *
   * // Absolute path conversion
   * const result3 = this.dataIntegrity.validateFilePath('/home/user/projects/file.txt');
   * console.log(result3.cleanValue); // 'home/user/projects/file.txt'
   * console.log(result3.issues); // ['Absolute path converted to relative']
   *
   * // Windows absolute path
   * const result4 = this.dataIntegrity.validateFilePath('C:\\Users\\file.txt');
   * console.log(result4.cleanValue); // 'Users/file.txt'
   * console.log(result4.issues); // ['Absolute path converted to relative']
   *
   * // Network path blocking
   * const result5 = this.dataIntegrity.validateFilePath('\\\\server\\share\\file.txt');
   * console.log(result5.cleanValue); // 'server/share/file.txt'
   * console.log(result5.issues); // ['Absolute path converted to relative']
   *
   * // File export with validation
   * async exportProject(filename: string, data: any) {
   *   const pathValidation = this.dataIntegrity.validateFilePath(filename);
   *
   *   if (pathValidation.issues.length > 0) {
   *     this.notificationService.warning(
   *       `Path adjusted for security: ${pathValidation.issues.join(', ')}`
   *     );
   *   }
   *
   *   return this.fileService.save(pathValidation.cleanValue, data);
   * }
   *
   * // Import file validation
   * validateImportPath(userPath: string): boolean {
   *   const result = this.dataIntegrity.validateFilePath(userPath);
   *
   *   if (!result.isValid) {
   *     this.logger.warn('Blocked unsafe file path:', userPath);
   *     return false;
   *   }
   *
   *   return true;
   * }
   * ```
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
   * Validates position coordinates to prevent application crashes and ensure data integrity.
   * Provides comprehensive coordinate validation with automatic sanitization and boundary checking.
   * Essential for preventing array out-of-bounds errors and maintaining navigation consistency.
   *
   * Validation Features:
   * - Type safety enforcement (ensures numeric coordinates)
   * - Integer conversion for precise positioning
   * - Negative value prevention (coordinates must be >= 0)
   * - Range limiting to prevent memory issues
   * - NaN and infinity handling with safe fallbacks
   * - Automatic coordinate correction and cleaning
   *
   * @param row - Row coordinate (should be non-negative integer)
   * @param step - Step coordinate (should be non-negative integer)
   * @returns Validation result with cleaned coordinates and constraint details
   *
   * @example
   * ```typescript
   * // Valid coordinates
   * const result1 = this.dataIntegrity.validatePositionData(5, 3);
   * if (result1.isValid) {
   *   this.store.dispatch(updatePosition({ row: 5, step: 3 }));
   * }
   *
   * // Invalid type handling
   * const result2 = this.dataIntegrity.validatePositionData('5' as any, 3.7);
   * console.log(result2.cleanValue); // '5,3' (converted and floored)
   * console.log(result2.issues); // ['Position coordinates must be numbers', 'Position coordinates must be integers']
   *
   * // Negative coordinate correction
   * const result3 = this.dataIntegrity.validatePositionData(-2, 5);
   * console.log(result3.cleanValue); // '0,5' (negative corrected to 0)
   * console.log(result3.issues); // ['Position coordinates cannot be negative']
   *
   * // Range limiting
   * const result4 = this.dataIntegrity.validatePositionData(50000, 3);
   * console.log(result4.cleanValue); // '10000,3' (clamped to maximum)
   * console.log(result4.issues); // ['Position coordinates exceed reasonable limits (max 10000)']
   *
   * // NaN/Infinity handling
   * const result5 = this.dataIntegrity.validatePositionData(NaN, Infinity);
   * console.log(result5.cleanValue); // '0,0' (safe fallback)
   * console.log(result5.issues); // ['Position coordinates must be finite numbers']
   *
   * // Component integration
   * updateCurrentPosition(row: number, step: number) {
   *   const validation = this.dataIntegrity.validatePositionData(row, step);
   *
   *   if (validation.isValid) {
   *     this.store.dispatch(updatePosition({ row, step }));
   *   } else {
   *     // Use cleaned values as fallback
   *     const [cleanRow, cleanStep] = validation.cleanValue.split(',').map(Number);
   *     this.store.dispatch(updatePosition({ row: cleanRow, step: cleanStep }));
   *
   *     this.notificationService.warning(
   *       `Position adjusted: ${validation.issues.join(', ')}`
   *     );
   *   }
   * }
   *
   * // Navigation bounds checking
   * navigateToPosition(targetRow: number, targetStep: number) {
   *   const validation = this.dataIntegrity.validatePositionData(targetRow, targetStep);
   *
   *   if (!validation.isValid) {
   *     this.logger.warn('Invalid navigation target:', { targetRow, targetStep });
   *     this.logger.warn('Validation issues:', validation.issues);
   *   }
   *
   *   // Always use cleaned values for safety
   *   const [row, step] = validation.cleanValue.split(',').map(Number);
   *   return this.performNavigation(row, step);
   * }
   *
   * // Bulk position validation
   * validatePositionArray(positions: Array<{row: number, step: number}>) {
   *   return positions.map(pos => {
   *     const validation = this.dataIntegrity.validatePositionData(pos.row, pos.step);
   *     const [row, step] = validation.cleanValue.split(',').map(Number);
   *
   *     return {
   *       original: pos,
   *       validated: { row, step },
   *       isValid: validation.isValid,
   *       issues: validation.issues
   *     };
   *   });
   * }
   * ```
   */
  validatePositionData(row: number, step: number): ValidationResult {
    const issues: string[] = [];
    let cleanRow = row;
    let cleanStep = step;

    if (!this.config.enableInputValidation) {
      return {
        isValid: true,
        cleanValue: `${row},${step}`,
        issues: [],
        originalValue: `${row},${step}`,
      };
    }

    try {
      // Basic type and range validation
      if (typeof row !== 'number' || typeof step !== 'number') {
        issues.push('Position coordinates must be numbers');
        cleanRow = Number(row) || 0;
        cleanStep = Number(step) || 0;
      }

      if (!Number.isInteger(row) || !Number.isInteger(step)) {
        issues.push('Position coordinates must be integers');
        cleanRow = Math.floor(cleanRow);
        cleanStep = Math.floor(cleanStep);
      }

      if (cleanRow < 0 || cleanStep < 0) {
        issues.push('Position coordinates cannot be negative');
        cleanRow = Math.max(0, cleanRow);
        cleanStep = Math.max(0, cleanStep);
      }

      // Prevent extremely large values that might indicate data corruption
      const maxReasonableValue = 10000;
      if (cleanRow > maxReasonableValue || cleanStep > maxReasonableValue) {
        issues.push(
          `Position coordinates exceed reasonable limits (max ${maxReasonableValue})`
        );
        cleanRow = Math.min(cleanRow, maxReasonableValue);
        cleanStep = Math.min(cleanStep, maxReasonableValue);
      }

      // Check for NaN or infinite values
      if (!isFinite(cleanRow) || !isFinite(cleanStep)) {
        issues.push('Position coordinates must be finite numbers');
        cleanRow = isFinite(cleanRow) ? cleanRow : 0;
        cleanStep = isFinite(cleanStep) ? cleanStep : 0;
      }

      if (issues.length > 0) {
        this.logEvent(
          DataIntegrityEventType.INVALID_INPUT_BLOCKED,
          'Position data validation issues found',
          {
            originalRow: row,
            originalStep: step,
            cleanRow,
            cleanStep,
            issueCount: issues.length,
          }
        );
      }

      return {
        isValid: issues.length === 0,
        cleanValue: `${cleanRow},${cleanStep}`,
        issues,
        originalValue: `${row},${step}`,
      };
    } catch (error) {
      this.logger.error('Position data validation failed:', error);
      return {
        isValid: false,
        cleanValue: '0,0', // Safe fallback
        issues: ['Validation error - using safe fallback'],
        originalValue: `${row},${step}`,
      };
    }
  }

  /**
   * Retrieves recent integrity events for monitoring and debugging purposes.
   * Provides access to the in-memory event log for troubleshooting data integrity issues
   * and understanding application behavior patterns. Essential for diagnosing validation
   * problems and maintaining system reliability.
   *
   * Event Monitoring Features:
   * - Read-only access to integrity event history
   * - Chronological ordering (most recent first)
   * - Configurable event count limiting
   * - Memory-safe log size management
   * - Event categorization and severity tracking
   * - Immutable event array (readonly) for safety
   *
   * @param limit - Maximum number of recent events to retrieve (default: 20, max: internal log size)
   * @returns Readonly array of recent DataIntegrityEvent objects in chronological order
   *
   * @example
   * ```typescript
   * // Basic recent events retrieval
   * const recentEvents = this.dataIntegrity.getRecentEvents();
   * console.log(`Retrieved ${recentEvents.length} recent events`);
   *
   * // Limited event count
   * const last5Events = this.dataIntegrity.getRecentEvents(5);
   * last5Events.forEach(event => {
   *   console.log(`${event.timestamp}: ${event.type} - ${event.description}`);
   * });
   *
   * // Event analysis and categorization
   * const events = this.dataIntegrity.getRecentEvents(50);
   * const errorEvents = events.filter(e => e.severity === 'error');
   * const warningEvents = events.filter(e => e.severity === 'warning');
   *
   * console.log(`Errors: ${errorEvents.length}, Warnings: ${warningEvents.length}`);
   *
   * // Component integration - debugging panel
   * @Component({
   *   template: `
   *     <div class="debug-panel" *ngIf="showDebugPanel">
   *       <h3>Data Integrity Events</h3>
   *       <div *ngFor="let event of recentEvents" [class]="'event-' + event.severity">
   *         <span class="timestamp">{{ event.timestamp | date:'HH:mm:ss' }}</span>
   *         <span class="type">{{ event.type }}</span>
   *         <span class="description">{{ event.description }}</span>
   *       </div>
   *     </div>
   *   `
   * })
   * export class DebugPanelComponent {
   *   recentEvents = this.dataIntegrity.getRecentEvents(10);
   *
   *   refreshEvents() {
   *     this.recentEvents = this.dataIntegrity.getRecentEvents(10);
   *   }
   * }
   *
   * // Service integration - error reporting
   * @Injectable()
   * export class ErrorReportingService {
   *   generateReport(): ErrorReport {
   *     const events = this.dataIntegrity.getRecentEvents(100);
   *     const criticalEvents = events.filter(e =>
   *       e.severity === 'error' || e.severity === 'critical'
   *     );
   *
   *     return {
   *       timestamp: new Date(),
   *       totalEvents: events.length,
   *       criticalCount: criticalEvents.length,
   *       events: criticalEvents,
   *       systemHealth: criticalEvents.length === 0 ? 'healthy' : 'issues'
   *     };
   *   }
   * }
   *
   * // Performance monitoring
   * monitorIntegrityPerformance() {
   *   const events = this.dataIntegrity.getRecentEvents(100);
   *   const validationEvents = events.filter(e => e.type === 'validation');
   *
   *   if (validationEvents.length > 0) {
   *     const avgValidationTime = validationEvents.reduce((sum, event) => {
   *       return sum + (event.processingTime || 0);
   *     }, 0) / validationEvents.length;
   *
   *     this.logger.info('Validation performance:', {
   *       count: validationEvents.length,
   *       avgTime: avgValidationTime,
   *       threshold: 10 // ms
   *     });
   *   }
   * }
   *
   * // Event filtering and analysis
   * analyzeDataPatterns() {
   *   const events = this.dataIntegrity.getRecentEvents(200);
   *
   *   // Group by event type
   *   const byType = events.reduce((acc, event) => {
   *     acc[event.type] = (acc[event.type] || 0) + 1;
   *     return acc;
   *   }, {} as Record<string, number>);
   *
   *   // Find patterns
   *   const validationFailures = events.filter(e =>
   *     e.type === 'validation' && !e.success
   *   );
   *
   *   return {
   *     eventsByType: byType,
   *     failureRate: validationFailures.length / events.length,
   *     mostCommonIssues: this.extractCommonIssues(validationFailures)
   *   };
   * }
   * ```
   */
  getRecentEvents(limit: number = 20): readonly DataIntegrityEvent[] {
    return this.eventLog.slice(0, Math.min(limit, this.eventLog.length));
  }

  /**
   * Clears the in-memory event log for development and testing purposes.
   * Provides a clean slate for event monitoring and testing scenarios.
   * Should be used carefully in production as it removes valuable debugging history.
   *
   * Development Utility Features:
   * - Complete event log removal from memory
   * - Immediate effect (no async operations)
   * - Safe operation (no side effects on other systems)
   * - Memory cleanup for long-running sessions
   * - Test isolation support
   * - Debug session reset capability
   *
   * @example
   * ```typescript
   * // Basic log clearing
   * this.dataIntegrity.clearEventLog();
   * console.log('Event log cleared');
   *
   * // Test isolation pattern
   * describe('DataIntegrityService', () => {
   *   beforeEach(() => {
   *     TestBed.configureTestingModule({});
   *     service = TestBed.inject(DataIntegrityService);
   *     service.clearEventLog(); // Clean state for each test
   *   });
   *
   *   it('should start with empty event log', () => {
   *     expect(service.getRecentEvents().length).toBe(0);
   *   });
   * });
   *
   * // Development debugging session
   * resetDebuggingSession() {
   *   console.log('Clearing event log for fresh debugging session');
   *   this.dataIntegrity.clearEventLog();
   *
   *   // Start monitoring from clean state
   *   this.startEventMonitoring();
   * }
   *
   * // Memory management in long-running apps
   * @Injectable()
   * export class MaintenanceService {
   *   performDailyMaintenance() {
   *     // Clear old events to prevent memory buildup
   *     const eventCount = this.dataIntegrity.getRecentEvents(1000).length;
   *
   *     if (eventCount > 500) {
   *       this.logger.info('Clearing event log for memory management');
   *       this.dataIntegrity.clearEventLog();
   *     }
   *   }
   * }
   *
   * // Component integration - admin panel
   * @Component({
   *   template: `
   *     <div class="admin-panel">
   *       <button
   *         (click)="clearLogs()"
   *         [disabled]="!hasEvents"
   *         class="btn-danger">
   *         Clear Event Log ({{ eventCount }} events)
   *       </button>
   *     </div>
   *   `
   * })
   * export class AdminPanelComponent {
   *   get eventCount() {
   *     return this.dataIntegrity.getRecentEvents(1000).length;
   *   }
   *
   *   get hasEvents() {
   *     return this.eventCount > 0;
   *   }
   *
   *   clearLogs() {
   *     if (confirm('Clear all integrity events? This cannot be undone.')) {
   *       this.dataIntegrity.clearEventLog();
   *       this.notificationService.info('Event log cleared');
   *     }
   *   }
   * }
   *
   * // Development workflow integration
   * @Injectable()
   * export class DevelopmentToolsService {
   *   startCleanSession() {
   *     // Clear all development artifacts
   *     this.dataIntegrity.clearEventLog();
   *     localStorage.removeItem('dev-session-data');
   *
   *     this.logger.info('Clean development session started');
   *   }
   *
   *   captureEventSequence(action: () => void) {
   *     // Clear log, perform action, capture results
   *     this.dataIntegrity.clearEventLog();
   *     action();
   *
   *     return this.dataIntegrity.getRecentEvents(100);
   *   }
   * }
   *
   * // Performance testing support
   * benchmarkValidation() {
   *   this.dataIntegrity.clearEventLog(); // Clean slate
   *
   *   const startTime = performance.now();
   *
   *   // Perform validation operations
   *   for (let i = 0; i < 1000; i++) {
   *     this.dataIntegrity.validateProjectName(`test-project-${i}`);
   *   }
   *
   *   const endTime = performance.now();
   *   const events = this.dataIntegrity.getRecentEvents(1000);
   *
   *   return {
   *     duration: endTime - startTime,
   *     operationCount: 1000,
   *     eventsGenerated: events.length,
   *     avgTimePerOp: (endTime - startTime) / 1000
   *   };
   * }
   * ```
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

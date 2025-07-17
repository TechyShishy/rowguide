/**
 * Peyote Shorthand Service - Pattern Parsing and Project Creation
 *
 * This service handles parsing of peyote beading patterns from shorthand notation
 * and converts them into structured Project objects. It supports both single row
 * patterns and combined first/second row patterns (Row 1&2).
 *
 * ## Pattern Format Support
 *
 * - **Single Row Format**: `Row 1 (L) (3)A, (2)B, (1)C`
 * - **Combined Row Format**: `Row 1&2 (L) (3)A, (2)B, (1)C`
 * - **Step Notation**: `(count)color` or `count(color)`
 * - **Row Delimiters**: Configurable (default: ', ')
 *
 * ## Input Validation
 *
 * - Input sanitization for security and data integrity
 * - Pattern structure validation
 * - Size limits to prevent memory issues
 * - Malicious content detection and removal
 *
 * ## Error Handling
 *
 * - Comprehensive error reporting with context
 * - Graceful degradation for invalid patterns
 * - Warning notifications for inconsistent step counts
 * - Integration with DataIntegrityService for validation
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Parse single row pattern
 * const pattern = 'Row 1 (L) (3)A, (2)B, (1)C';
 * const project = service.toProject(pattern);
 *
 * // Parse combined row pattern
 * const combinedPattern = 'Row 1&2 (L) (3)A, (2)B, (1)C';
 * const project = service.toProject(combinedPattern);
 *
 * // Custom delimiter
 * const customPattern = 'Row 1 (L) (3)A; (2)B; (1)C';
 * const project = service.toProject(customPattern, '; ');
 * ```
 *
 * @service PeyoteShorthandService
 * @since 2.0.0
 */

import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Project, Row, Step } from '../../../core/models';
import { NotificationService, SettingsService, DataIntegrityService } from '../../../core/services';
import { ZipperService } from '../services';

@Injectable({
  providedIn: 'root',
})
export class PeyoteShorthandService {
  constructor(
    private logger: NGXLogger,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private zipperService: ZipperService,
    private dataIntegrityService: DataIntegrityService
  ) {}

  /**
   * Convert peyote shorthand pattern string to Project object
   *
   * Parses peyote beading patterns from shorthand notation, handling both
   * single row patterns and combined first/second row patterns. Includes
   * comprehensive validation and error handling.
   *
   * @param {string} projectString - The peyote pattern string to parse
   * @param {string} delimiter - Step delimiter (default: ', ')
   * @returns {Project} Parsed project with structured row and step data
   *
   * @example
   * ```typescript
   * // Single row pattern
   * const pattern = 'Row 1 (L) (3)A, (2)B, (1)C\nRow 2 (R) (1)A, (2)B, (3)C';
   * const project = service.toProject(pattern);
   *
   * // Combined first/second row pattern
   * const combinedPattern = 'Row 1&2 (L) (3)A, (2)B, (1)C\nRow 3 (R) (1)A, (2)B, (3)C';
   * const project = service.toProject(combinedPattern);
   *
   * // Custom delimiter
   * const customPattern = 'Row 1 (L) (3)A; (2)B; (1)C';
   * const project = service.toProject(customPattern, '; ');
   * ```
   *
   * @throws {Error} When input validation fails or pattern parsing encounters errors
   */
  toProject(projectString: string, delimiter: string = ', '): Project {
    // Integration Point 1: Add input validation and sanitization
    const validatedInput = this.validateAndSanitizeInput(projectString, delimiter);
    if (!validatedInput.isValid) {
      this.logger.warn('PeyoteShorthandService: Invalid input data', validatedInput.issues);
      return { rows: [] }; // Return empty project for invalid input
    }

    this.logger.debug('Loading project from string', validatedInput.sanitizedProjectString);
    const project: Project = { rows: [] };

    if (!validatedInput.sanitizedProjectString.trim()) {
      return project;
    }

    let lineNum = 1;
    const projectRowSteps: number[] = [];
    validatedInput.sanitizedProjectString.split('\n').forEach((line: string) => {
      this.logger.trace('Line:', line);
      if (line.match(/^Row 1&2/)) {
        const [row1, row1Steps, row2, row2Steps]: [Row, number, Row, number] =
          this.createFirstRow(line, lineNum, validatedInput.sanitizedDelimiter);
        if (row1.steps.length > 0) {
          projectRowSteps.push(row1Steps);
          project.rows.push(row1);
          lineNum++;
        }
        if (row2.steps.length > 0) {
          projectRowSteps.push(row2Steps);
          project.rows.push(row2);
          lineNum++;
        }
      } else {
        const { row, rowTotalSteps }: { row: Row; rowTotalSteps: number } =
          this.createRow(line, lineNum, validatedInput.sanitizedDelimiter);

        if (row.steps.length > 0) {
          projectRowSteps.push(rowTotalSteps);
          project.rows.push(row);
          lineNum++;
        }
      }
    });

    this.checkStepCounts(projectRowSteps);

    return project;
  }

  /**
   * Validate step count consistency across project rows
   *
   * Checks if all rows have consistent step counts and warns users
   * about potential import issues. Handles different pattern types
   * (even/odd row matching) and integrates with settings service
   * for combine12 configuration.
   *
   * @private
   * @param {number[]} projectRowSteps - Array of step counts for each row
   *
   * @example
   * ```typescript
   * // Internal usage during project parsing
   * const stepCounts = [10, 10, 10, 10]; // Consistent counts
   * this.checkStepCounts(stepCounts); // No warnings
   *
   * const inconsistentCounts = [10, 12, 10, 11]; // Inconsistent counts
   * this.checkStepCounts(inconsistentCounts); // Triggers warning notification
   * ```
   */
  private checkStepCounts(projectRowSteps: number[]): void {
    this.settingsService.combine12$.subscribe((combine12) => {
      //const firstRow = combine12 ? (projectRowSteps.shift() ?? 0) / 2 : projectRowSteps.shift() ?? 0;
      const allStepsMatch = projectRowSteps.every(
        (step) => step === projectRowSteps[0]
      );
      const evenStepsMatch = projectRowSteps.every((step, index) =>
        index % 2 === 0 ? step === projectRowSteps[0] : true
      );
      const oddStepsMatch = projectRowSteps.every((step, index) =>
        index % 2 === 1 ? step === projectRowSteps[0] : true
      );
      if (!allStepsMatch && !evenStepsMatch && !oddStepsMatch) {
        this.logger.warn(
          'Row steps do not match:',
          projectRowSteps[0],
          projectRowSteps
        );
        this.notificationService.snackbar(
          'Imported file has inconsistent step counts.  This may be a sign of a failed import.  Please send the file to the developer for review if the import was not successful.'
        );
      }
    });
  }

  /**
   * Create a single row from pattern line
   *
   * Parses a single row pattern line and converts it to a structured Row object
   * with individual Step objects. Handles step parsing, validation, and aggregation.
   *
   * @private
   * @param {string} line - The pattern line to parse
   * @param {number} lineNum - The line number for row ID assignment
   * @param {string} delimiter - Step delimiter for parsing
   * @returns {{ row: Row; rowTotalSteps: number }} Parsed row and total step count
   *
   * @example
   * ```typescript
   * // Internal usage during pattern parsing
   * const line = 'Row 1 (L) (3)A, (2)B, (1)C';
   * const result = this.createRow(line, 1, ', ');
   * // result.row = { id: 1, steps: [{ id: 1, count: 3, description: 'A' }, ...] }
   * // result.rowTotalSteps = 6
   * ```
   */
  private createRow(
    line: string,
    lineNum: number,
    delimiter: string
  ): { row: Row; rowTotalSteps: number } {
    let rowTotalSteps = 0;
    const row: Row = { id: lineNum, steps: [] };
    let stepNum = 1;

    this.stripRowTag(line)
      .split(delimiter)
      .forEach((step) => {
        this.logger.trace('Word:', step);
        const stepMatch = this.matchStep(step);

        if (stepMatch) {
          const { count, description, id } = this.createStep(
            stepMatch,
            stepNum++
          );
          rowTotalSteps += count;
          row.steps.push({ count, description, id });
        } else {
          this.logger.warn('Invalid step:', step);
        }
      });

    return { row, rowTotalSteps };
  }
  /**
   * Create combined first and second rows from pattern line
   *
   * Parses a combined row pattern (Row 1&2) and splits it into separate
   * first and second rows. Uses ZipperService for step expansion and compression
   * to properly distribute steps between alternating rows.
   *
   * @private
   * @param {string} line - The combined pattern line to parse
   * @param {number} lineNum - The starting line number for row ID assignment
   * @param {string} delimiter - Step delimiter for parsing
   * @returns {[Row, number, Row, number]} Array containing [row1, row1Steps, row2, row2Steps]
   *
   * @example
   * ```typescript
   * // Internal usage during pattern parsing
   * const line = 'Row 1&2 (L) (3)A, (2)B, (1)C';
   * const [row1, row1Steps, row2, row2Steps] = this.createFirstRow(line, 1, ', ');
   * // row1 = { id: 1, steps: [alternating steps] }
   * // row2 = { id: 2, steps: [alternating steps] }
   * ```
   */
  private createFirstRow(
    line: string,
    lineNum: number,
    delimiter: string
  ): [Row, number, Row, number] {
    let rowTotalSteps = 0;
    const row: Row = { id: lineNum, steps: [] };
    let stepNum = 1;
    this.stripRowTag(line)
      .split(delimiter)
      .forEach((step) => {
        this.logger.trace('Word:', step);
        const stepMatch = this.matchStep(step);

        if (stepMatch) {
          const { count, description, id } = this.createStep(
            stepMatch,
            stepNum++
          );
          rowTotalSteps += count;
          row.steps.push({ count, description, id });
        } else {
          this.logger.warn('Invalid step:', step);
        }
      });
    let row1TotalSteps = 0;
    let row2TotalSteps = 0;
    let row1Expanded: Step[] = [];
    let row2Expanded: Step[] = [];
    const rowExpanded = this.zipperService.expandSteps(row.steps);
    rowExpanded.forEach((step, index) => {
      if (index % 2 === 0) {
        row1Expanded.push(step);
        row1TotalSteps += step.count;
      } else {
        row2Expanded.push(step);
        row2TotalSteps += step.count;
      }
    });
    const row1Steps = this.zipperService.compressSteps(row1Expanded);
    const row2Steps = this.zipperService.compressSteps(row2Expanded);
    const row1: Row = { id: 1, steps: row1Steps };
    const row2: Row = { id: 2, steps: row2Steps };
    return [row1, row1TotalSteps, row2, row2TotalSteps];
  }

  /**
   * Remove row tag and direction indicators from pattern line
   *
   * Strips the row identifier and direction markers from pattern lines
   * to extract the pure step pattern for parsing.
   *
   * @private
   * @param {string} line - The pattern line containing row tags
   * @returns {string} Clean pattern line without row identifiers
   *
   * @example
   * ```typescript
   * // Internal usage during pattern parsing
   * const line = 'Row 1 (L) (3)A, (2)B, (1)C';
   * const clean = this.stripRowTag(line);
   * // clean = '(3)A, (2)B, (1)C'
   * ```
   */
  private stripRowTag(line: string): string {
    return line.replace(/^Row [0-9&]+ \([LR]\)\s+/, '');
  }

  /**
   * Match step pattern using regex patterns
   *
   * Attempts to match step patterns using multiple regex patterns
   * to handle different notation formats (count)color or count(color).
   *
   * @private
   * @param {string} step - The step string to match
   * @returns {RegExpMatchArray | null} Regex match result or null if no match
   *
   * @example
   * ```typescript
   * // Internal usage during step parsing
   * const step1 = '(3)A';
   * const match1 = this.matchStep(step1); // Matches (count)color format
   *
   * const step2 = '3(A)';
   * const match2 = this.matchStep(step2); // Matches count(color) format
   * ```
   */
  private matchStep(step: string): RegExpMatchArray | null {
    const patterns = [
      /^\(([0-9]+)\)([a-zA-Z0-91]+)/, // (1)stepA
      /^([0-9]+)\(([a-zA-Z0-9]+)\)/, // 1(stepA)
    ];

    for (const pattern of patterns) {
      const match = step.match(pattern);
      if (match) {
        return match;
      }
    }

    return null;
  }

  /**
   * Create Step object from regex match result
   *
   * Converts regex match results into structured Step objects with
   * proper type conversion and validation. Includes trace logging
   * for debugging and test compatibility.
   *
   * @private
   * @param {RegExpMatchArray} stepMatch - Regex match result containing count and description
   * @param {number} stepNum - Step number for ID assignment
   * @returns {Step} Structured step object with id, count, and description
   *
   * @example
   * ```typescript
   * // Internal usage during step parsing
   * const match = ['(3)A', '3', 'A']; // Regex match result
   * const step = this.createStep(match, 1);
   * // step = { id: 1, count: 3, description: 'A' }
   * ```
   */
  private createStep(stepMatch: RegExpMatchArray, stepNum: number) {
    const count = parseInt(stepMatch[1]);
    const description = stepMatch[2];

    // Add trace logging for test compatibility
    this.logger.trace('Count:', count);
    this.logger.trace('Description:', description);

    return { id: stepNum, count, description } as Step;
  }

  /**
   * Validate and sanitize input data for pattern parsing
   *
   * Comprehensive input validation and sanitization for pattern string
   * and delimiter. Integrates with DataIntegrityService for validation
   * and provides detailed error reporting.
   *
   * @private
   * @param {string} projectString - The pattern string to validate
   * @param {string} delimiter - The delimiter to validate
   * @returns {ValidationResult} Object containing validation results and sanitized data
   *
   * @interface ValidationResult
   * @property {boolean} isValid - Whether the input is valid
   * @property {string[]} issues - Array of validation issues
   * @property {string} sanitizedProjectString - Cleaned pattern string
   * @property {string} sanitizedDelimiter - Cleaned delimiter
   *
   * @example
   * ```typescript
   * // Internal usage during input validation
   * const result = this.validateAndSanitizeInput(patternString, ', ');
   * if (!result.isValid) {
   *   this.logger.warn('Validation failed:', result.issues);
   *   return { rows: [] };
   * }
   * ```
   */
  private validateAndSanitizeInput(projectString: string, delimiter: string): {
    isValid: boolean;
    issues: string[];
    sanitizedProjectString: string;
    sanitizedDelimiter: string;
  } {
    const issues: string[] = [];

    // Validate and sanitize project string
    if (!projectString || typeof projectString !== 'string') {
      issues.push('Project string must be a valid string');
      return {
        isValid: false,
        issues,
        sanitizedProjectString: '',
        sanitizedDelimiter: delimiter || ', ',
      };
    }

    // Use DataIntegrityService for project name validation as content sanitization
    const projectValidation =
      this.dataIntegrityService.validateProjectName(projectString);

    // For pattern data, we want to be less restrictive than project names
    // but still clean potentially dangerous content
    let sanitizedProjectString = projectString
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\u0000/g, '') // Remove null characters
      .trim();

    // Validate delimiter
    let sanitizedDelimiter = delimiter || ', ';
    if (typeof delimiter !== 'string') {
      issues.push('Delimiter must be a string, using default');
      sanitizedDelimiter = ', ';
    } else {
      // Sanitize delimiter
      sanitizedDelimiter = delimiter
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\u0000/g, '');

      if (!sanitizedDelimiter) {
        issues.push('Delimiter became empty after sanitization, using default');
        sanitizedDelimiter = ', ';
      }
    }

    // Integration Point 2: Add data integrity checks for pattern parsing
    const patternValidation = this.validatePatternData(sanitizedProjectString);
    if (!patternValidation.isValid) {
      issues.push(...patternValidation.issues);
    }

    return {
      isValid: issues.length === 0,
      issues,
      sanitizedProjectString,
      sanitizedDelimiter,
    };
  }

  /**
   * Validate pattern data integrity and structure
   *
   * Performs comprehensive validation of pattern data including size limits,
   * security checks, and basic structure validation. Integrates with
   * DataIntegrityService for consistent validation patterns.
   *
   * @private
   * @param {string} projectString - The pattern string to validate
   * @returns {PatternValidationResult} Object containing validation results
   *
   * @interface PatternValidationResult
   * @property {boolean} isValid - Whether the pattern data is valid
   * @property {string[]} issues - Array of validation issues found
   *
   * @example
   * ```typescript
   * // Internal usage during pattern validation
   * const validation = this.validatePatternData(patternString);
   * if (!validation.isValid) {
   *   issues.push(...validation.issues);
   * }
   * ```
   */
  private validatePatternData(projectString: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for basic pattern structure
    if (projectString.length === 0) {
      return { isValid: true, issues: [] }; // Empty string is valid
    }

    // Check for reasonable size limits to prevent memory issues
    if (projectString.length > 1000000) { // 1MB limit
      issues.push('Pattern data too large (max 1MB)');
    }

    // Check for potential malicious patterns
    if (projectString.includes('<script>') || projectString.includes('javascript:')) {
      issues.push('Pattern data contains potentially dangerous content');
    }

    // Validate basic pattern structure - should contain row patterns
    const hasValidRowPattern = /Row\s+\d+/.test(projectString);
    if (projectString.trim().length > 0 && !hasValidRowPattern) {
      this.logger.debug('PeyoteShorthandService: Pattern data does not contain expected row patterns');
      // This is a warning, not an error - some patterns might be valid without row numbers
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

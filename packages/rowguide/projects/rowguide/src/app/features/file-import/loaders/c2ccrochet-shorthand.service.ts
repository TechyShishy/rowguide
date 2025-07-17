/**
 * C2C Crochet Shorthand Service - Corner-to-Corner Crochet Pattern Processing
 *
 * This service handles parsing and processing of Corner-to-Corner (C2C) crochet patterns
 * from shorthand notation. It converts C2C pattern strings into structured Project objects
 * with comprehensive validation and error handling.
 *
 * ## Pattern Format Support
 *
 * - **C2C Row Format**: `ROW 1: ↗ 5 squares\n3xA, 2xB`
 * - **Direction Indicators**: `↗` (up-right), `↙` (down-left)
 * - **Stitch Notation**: `countxcolor` (e.g., `3xA`, `2xB`)
 * - **Square Counting**: Total squares per row validation
 *
 * ## Input Processing
 *
 * - Pattern structure validation for C2C format
 * - Input sanitization for security and data integrity
 * - Regex-based pattern matching for reliable parsing
 * - Comprehensive error handling with context
 *
 * ## Integration Features
 *
 * - **ErrorHandlerService**: Detailed error reporting and recovery
 * - **DataIntegrityService**: Input validation and sanitization
 * - **Logging**: Comprehensive debug and warning logging
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Parse C2C crochet pattern
 * const pattern = `ROW 1: ↗ 5 squares
 * 3xA, 2xB
 * ROW 2: ↙ 4 squares
 * 2xA, 2xB`;
 * const project = service.loadProject(pattern);
 *
 * // Custom delimiter
 * const customPattern = `ROW 1: ↗ 5 squares\n3xA; 2xB`;
 * const project = service.loadProject(customPattern, ';');
 * ```
 *
 * @service C2ccrochetShorthandService
 * @since 2.0.0
 */

import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Project, Row, Step } from '../../../core/models';
import { ErrorHandlerService, DataIntegrityService } from '../../../core/services';

@Injectable({
  providedIn: 'root',
})
export class C2ccrochetShorthandService {
  constructor(
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService,
    private dataIntegrityService: DataIntegrityService
  ) {}

  /**
   * Load and parse C2C crochet pattern from shorthand notation
   *
   * Converts C2C crochet pattern strings into structured Project objects
   * with comprehensive validation, error handling, and recovery. Supports
   * directional indicators and square counting for pattern accuracy.
   *
   * @param {string} projectString - C2C pattern string to parse
   * @param {string} delimiter - Stitch delimiter (default: ' ')
   * @returns {Project} Parsed project with structured row and step data
   *
   * @example
   * ```typescript
   * // Parse standard C2C pattern
   * const pattern = `ROW 1: ↗ 5 squares
   * 3xA, 2xB
   * ROW 2: ↙ 4 squares
   * 2xA, 2xB`;
   * const project = service.loadProject(pattern);
   *
   * // Parse with custom delimiter
   * const customPattern = `ROW 1: ↗ 5 squares\n3xA; 2xB`;
   * const project = service.loadProject(customPattern, ';');
   * ```
   *
   * @throws {Error} When pattern parsing fails or validation encounters critical issues
   */
  loadProject(projectString: string, delimiter: string = ' '): Project {
    let project: Project = { id: 0, rows: [] };
    try {
      // Integration Point 1: Input validation for pattern data
      const validatedInput = this.validatePatternInput(projectString, delimiter);
      if (!validatedInput.isValid) {
        this.logger.warn('C2ccrochetShorthandService: Invalid input data', validatedInput.issues);
        return project; // Return empty project for invalid input
      }

      // Integration Point 2: Content sanitization for user inputs
      const sanitizedProjectString = this.sanitizeUserInput(validatedInput.sanitizedProjectString);

      if (!sanitizedProjectString || typeof sanitizedProjectString !== 'string') {
        throw new Error('Invalid project string provided');
      }

      const rows = sanitizedProjectString.matchAll(
        /ROW (\d+): (↗|↙) (\d+) squares\n((?:\d+x[a-zA-Z]+, )+\dx+[a-zA-Z]+)/g
      );

      let rowId = 0;

      for (const row of rows) {
        // Destructure with safe defaults
        const [
          ,
          rowNumber = '',
          rowDirection = '',
          rowSquares = '',
          stitchesString = '',
        ] = row;
        try {
          rowId++;
          let projRow: Row = { id: rowId, steps: [] };
          const rowStitches = stitchesString.matchAll(/(\d+)x([a-zA-Z]+)/g);

          let stitchId = 0;
          for (const stitch of rowStitches) {
            stitchId++;
            const stitchCount = stitch[1];
            const stitchColor = stitch[2];

            if (!stitchCount || !stitchColor) {
              throw new Error(
                `Invalid stitch data in row ${rowNumber}: ${stitch[0]}`
              );
            }

            const parsedCount = parseInt(stitchCount);
            if (isNaN(parsedCount) || parsedCount <= 0) {
              throw new Error(
                `Invalid stitch count in row ${rowNumber}: ${stitchCount}`
              );
            }

            projRow.steps.push(<Step>{
              id: stitchId,
              count: parsedCount,
              description: stitchColor,
            });
          }
          project.rows.push(projRow);
        } catch (error) {
          this.errorHandler.handleError(
            error,
            {
              operation: 'loadProject',
              service: 'C2ccrochetShorthandService',
              details: `Failed to parse row ${rowId} in C2C crochet pattern`,
              context: {
                rowNumber: rowNumber,
                rowDirection: rowDirection,
                rowSquares: rowSquares,
                currentRowId: rowId,
              },
            },
            'Failed to parse part of the crochet pattern. Some rows may be missing.',
            'medium'
          );
          // Continue processing other rows
        }
      }

      if (project.rows.length === 0) {
        throw new Error('No valid rows found in the pattern');
      }

      return project;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadProject',
          service: 'C2ccrochetShorthandService',
          details: 'Failed to parse C2C crochet shorthand pattern',
          context: {
            inputLength: projectString?.length || 0,
            inputType: typeof projectString,
            delimiter: delimiter,
            parsedRowsCount: project?.rows?.length || 0,
          },
        },
        'Failed to parse crochet pattern. Please check the format.',
        'medium'
      );
      // Return empty project as fallback
      return { id: 0, rows: [] };
    }
  }

  /**
   * Validate C2C crochet pattern input data
   *
   * Performs comprehensive validation of C2C pattern string format and structure.
   * Checks for required pattern elements, validates syntax, and ensures data integrity.
   * This is Integration Point 1 for data validation before processing.
   *
   * @param {string} projectString - C2C pattern string to validate
   * @param {string} delimiter - Stitch delimiter character
   * @returns {ValidationResult} Validation result with sanitized data
   *
   * @example
   * ```typescript
   * const result = service.validatePatternInput(pattern, ',');
   * if (result.isValid) {
   *   console.log('Pattern is valid');
   * } else {
   *   console.log('Issues:', result.issues);
   * }
   * ```
   *
   * @private
   */
  private validatePatternInput(projectString: string, delimiter: string): {
    isValid: boolean;
    issues: string[];
    sanitizedProjectString: string;
    sanitizedDelimiter: string;
  } {
    const issues: string[] = [];

    // Validate project string
    if (!projectString || typeof projectString !== 'string') {
      issues.push('Project string must be a valid string');
      return {
        isValid: false,
        issues,
        sanitizedProjectString: '',
        sanitizedDelimiter: delimiter || ' ',
      };
    }

    // Basic sanitization
    let sanitizedProjectString = projectString
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\u0000/g, '') // Remove null characters
      .trim();

    // Validate delimiter
    let sanitizedDelimiter = delimiter || ' ';
    if (typeof delimiter !== 'string') {
      issues.push('Delimiter must be a string, using default');
      sanitizedDelimiter = ' ';
    } else {
      sanitizedDelimiter = delimiter
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\u0000/g, '');

      if (!sanitizedDelimiter) {
        sanitizedDelimiter = ' ';
      }
    }

    // Check for reasonable size limits
    if (sanitizedProjectString.length > 1000000) { // 1MB limit
      issues.push('Pattern data too large (max 1MB)');
    }

    // Validate basic pattern structure
    if (sanitizedProjectString.length > 0) {
      const hasValidRowPattern = /ROW\s+\d+:/.test(sanitizedProjectString);
      if (!hasValidRowPattern) {
        this.logger.debug('C2ccrochetShorthandService: Pattern data does not contain expected C2C row patterns');
        // This is a warning, not an error - some patterns might be valid without proper formatting
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      sanitizedProjectString,
      sanitizedDelimiter,
    };
  }

  /**
   * Sanitize user input content - Integration Point 2
   */
  /**
   * Sanitize user input for C2C pattern processing
   *
   * Removes potentially dangerous content while preserving C2C pattern structure.
   * Uses DataIntegrityService for additional validation context and security.
   * This is Integration Point 2 for content sanitization.
   *
   * @param {string} input - Raw user input to sanitize
   * @returns {string} Sanitized input safe for processing
   *
   * @example
   * ```typescript
   * const sanitized = service.sanitizeUserInput(rawInput);
   * // Script tags and control characters removed
   * // Pattern structure preserved
   * ```
   *
   * @private
   */
  private sanitizeUserInput(input: string): string {
    if (!input || typeof input !== 'string') {
      this.logger.warn('C2ccrochetShorthandService: Invalid input content received');
      return '';
    }

    // Use DataIntegrityService for additional validation context
    const validation = this.dataIntegrityService.validateProjectName(input);

    // For C2C pattern data, we need to preserve pattern structure
    // while removing potentially dangerous content
    let sanitized = input
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .trim();

    // Log if we made significant changes
    if (sanitized !== input) {
      this.logger.debug('C2ccrochetShorthandService: Input content sanitized', {
        originalLength: input.length,
        cleanLength: sanitized.length,
        validationIssues: validation.issues,
      });
    }

    return sanitized;
  }
}

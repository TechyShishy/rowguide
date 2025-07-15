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
   * Validate pattern input data - Integration Point 1
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

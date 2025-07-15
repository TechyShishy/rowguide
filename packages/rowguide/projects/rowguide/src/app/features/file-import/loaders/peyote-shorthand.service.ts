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

  private stripRowTag(line: string): string {
    return line.replace(/^Row [0-9&]+ \([LR]\)\s+/, '');
  }
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

  private createStep(stepMatch: RegExpMatchArray, stepNum: number) {
    const count = parseInt(stepMatch[1]);
    const description = stepMatch[2];

    // Add trace logging for test compatibility
    this.logger.trace('Count:', count);
    this.logger.trace('Description:', description);

    return { id: stepNum, count, description } as Step;
  }

  /**
   * Validate and sanitize input data - Integration Point 1
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
   * Validate pattern data integrity - Integration Point 2
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

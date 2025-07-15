import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Step, ModelFactory } from '../../../core/models';
import { ErrorHandlerService, DataIntegrityService } from '../../../core/services';

@Injectable({
  providedIn: 'root',
})
export class ZipperService {
  constructor(
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService,
    private dataIntegrityService: DataIntegrityService
  ) {}

  expandSteps(steps: Step[]): Step[] {
    try {
      // Integration Point 1: Validate step data before expansion
      const validationResult = this.validateStepData(steps, 'expandSteps');
      if (!validationResult.isValid) {
        this.logger.warn('ZipperService: Invalid step data for expansion', validationResult.issues);
        return []; // Return empty array for invalid data
      }

      if (!steps || !Array.isArray(steps)) {
        throw new Error('Invalid steps array provided');
      }

      const rowSteps: Step[] = [];
      // Filter out steps with invalid counts before processing
      const validSteps = steps.filter((step) => step.count > 0);

      validSteps.forEach((step, index) => {
        if (!step.description || typeof step.count !== 'number') {
          throw new Error(`Invalid step data at index ${index}`);
        }

        for (let i = 0; i < step.count; i++) {
          rowSteps.push(
            ModelFactory.createStep({
              id: index * step.count + i,
              count: 1,
              description: step.description,
            })
          );
        }
      });
      return rowSteps;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'expandSteps',
          details: 'Failed to expand step data',
          stepsCount: steps?.length,
          inputSteps: steps,
        },
        'Unable to process step data. The pattern may not display correctly.',
        'medium'
      );
      return []; // Return empty array as fallback
    }
  }

  compressSteps(steps: Step[]): Step[] {
    try {
      // Integration Point 2: Add data integrity checks for step transformations
      const validationResult = this.validateStepTransformations(steps, 'compressSteps');
      if (!validationResult.isValid) {
        this.logger.warn('ZipperService: Invalid step data for compression', validationResult.issues);
        return []; // Return empty array for invalid data
      }

      if (!steps || !Array.isArray(steps)) {
        throw new Error('Invalid steps array provided');
      }

      const rowSteps: Step[] = [];
      let currentStep: Step | null = null;
      let idCounter = 1;

      steps.forEach((step, index) => {
        if (!step.description || typeof step.count !== 'number') {
          throw new Error(`Invalid step data at index ${index}`);
        }

        if (!currentStep) {
          currentStep = ModelFactory.createStep({
            id: idCounter++,
            description: step.description,
            count: step.count,
          });
        } else if (currentStep.description === step.description) {
          currentStep.count += step.count;
        } else {
          rowSteps.push(currentStep);
          currentStep = ModelFactory.createStep({
            id: idCounter++,
            description: step.description,
            count: step.count,
          });
        }
      });

      if (currentStep) {
        rowSteps.push(currentStep);
      }

      return rowSteps;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'compressSteps',
          details: 'Failed to compress step data',
          stepsCount: steps?.length,
          inputSteps: steps,
        },
        'Unable to optimize step data. The pattern may appear uncompressed.',
        'medium'
      );
      return steps || []; // Return original steps as fallback
    }
  }

  zipperSteps(steps1: Step[], steps2: Step[]): Step[] {
    try {
      if (
        !steps1 ||
        !Array.isArray(steps1) ||
        !steps2 ||
        !Array.isArray(steps2)
      ) {
        throw new Error('Invalid steps arrays provided');
      }

      const expandedSteps1 = this.expandSteps(steps1);
      const expandedSteps2 = this.expandSteps(steps2);

      if (
        expandedSteps1.length !== expandedSteps2.length &&
        expandedSteps1.length !== expandedSteps2.length + 1 &&
        expandedSteps1.length !== expandedSteps2.length - 1
      ) {
        this.logger.warn('Row steps do not match:', steps1, steps2);
        this.errorHandler.handleError(
          new Error(
            `Step length mismatch: ${expandedSteps1.length} vs ${expandedSteps2.length}`
          ),
          {
            operation: 'zipperSteps',
            details: 'Row step counts do not match for zipper operation',
            expandedSteps1Length: expandedSteps1.length,
            expandedSteps2Length: expandedSteps2.length,
            steps1: steps1,
            steps2: steps2,
          },
          'Cannot combine rows with mismatched step counts. Try adjusting your pattern.',
          'medium'
        );
        return [];
      }

      const expandedZippedSteps: Step[] = [];
      const maxLength = Math.max(expandedSteps1.length, expandedSteps2.length);

      for (let index = 0; index < maxLength; index++) {
        // Add step from first array if it exists
        if (expandedSteps1[index]) {
          expandedZippedSteps.push(expandedSteps1[index]);
        }
        // Add step from second array if it exists
        if (expandedSteps2[index]) {
          expandedZippedSteps.push(expandedSteps2[index]);
        }
      }

      const zippedSteps = this.compressSteps(expandedZippedSteps);
      return zippedSteps;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'zipperSteps',
          details: 'Failed to combine row steps',
          steps1Count: steps1?.length,
          steps2Count: steps2?.length,
          steps1: steps1,
          steps2: steps2,
        },
        'Unable to combine pattern rows. Please check your step data.',
        'medium'
      );
      return [];
    }
  }

  /**
   * Validate step data before expansion - Integration Point 1
   */
  private validateStepData(steps: Step[], operation: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!steps) {
      issues.push('Steps array is null or undefined');
      return { isValid: false, issues };
    }

    if (!Array.isArray(steps)) {
      issues.push('Steps must be an array');
      return { isValid: false, issues };
    }

    // Check for reasonable array size to prevent memory issues
    if (steps.length > 10000) {
      issues.push('Steps array too large (max 10,000 steps)');
    }

    // Validate individual steps
    steps.forEach((step, index) => {
      if (!step) {
        issues.push(`Step at index ${index} is null or undefined`);
        return;
      }

      if (typeof step.id !== 'number' || step.id < 0) {
        issues.push(`Step at index ${index} has invalid id: ${step.id}`);
      }

      if (typeof step.count !== 'number' || step.count < 0 || !isFinite(step.count)) {
        issues.push(`Step at index ${index} has invalid count: ${step.count}`);
      }

      if (!step.description || typeof step.description !== 'string') {
        issues.push(`Step at index ${index} has invalid description: ${step.description}`);
      } else {
        // Use DataIntegrityService to validate step descriptions
        const descValidation = this.dataIntegrityService.validateProjectName(step.description);
        if (!descValidation.isValid) {
          this.logger.debug(`ZipperService: Step description sanitized at index ${index}`, {
            original: step.description,
            clean: descValidation.cleanValue,
            issues: descValidation.issues,
          });
        }
      }

      // Check for reasonable count limits to prevent infinite loops
      if (step.count > 1000 && operation === 'expandSteps') {
        issues.push(`Step at index ${index} has excessive count for expansion: ${step.count}`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate step transformations for data integrity - Integration Point 2
   */
  private validateStepTransformations(steps: Step[], operation: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // First run basic step validation
    const basicValidation = this.validateStepData(steps, operation);
    if (!basicValidation.isValid) {
      issues.push(...basicValidation.issues);
    }

    // Additional transformation-specific validation
    if (steps && Array.isArray(steps)) {
      // Check for potential overflow in count accumulation
      const totalCount = steps.reduce((sum, step) => {
        return sum + (typeof step.count === 'number' ? step.count : 0);
      }, 0);

      if (totalCount > 100000) {
        issues.push('Total step count too large for transformation (max 100,000)');
      }

      // Validate step sequence integrity
      const descriptions = steps.map(step => step.description).filter(desc => desc);
      const uniqueDescriptions = new Set(descriptions);

      if (descriptions.length > 0 && uniqueDescriptions.size === 0) {
        issues.push('No valid step descriptions found');
      }

      // Log transformation validation results
      this.logger.debug(`ZipperService: ${operation} validation completed`, {
        stepsCount: steps.length,
        totalCount,
        uniqueDescriptions: uniqueDescriptions.size,
        issuesFound: issues.length,
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

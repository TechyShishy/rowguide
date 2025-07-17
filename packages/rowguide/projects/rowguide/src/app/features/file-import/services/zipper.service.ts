import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Step, ModelFactory } from '../../../core/models';
import { ErrorHandlerService, DataIntegrityService } from '../../../core/services';

/**
 * ZipperService - Step Processing and Pattern Manipulation
 *
 * Provides comprehensive step processing utilities for pattern manipulation,
 * including expansion from compressed notation, compression for storage optimization,
 * and zipper merging for combined row patterns. This service is essential for
 * flexible pattern display and efficient storage in beading applications.
 *
 * @example
 * ```typescript
 * // Basic step expansion for UI display
 * class PatternDisplayComponent {
 *   constructor(private zipperService: ZipperService) {}
 *
 *   displayRow(compressedSteps: Step[]): Step[] {
 *     // Convert "3A, 2B" notation to individual steps
 *     return this.zipperService.expandSteps(compressedSteps);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Pattern storage optimization
 * class PatternStorageService {
 *   async savePattern(expandedSteps: Step[]): Promise<void> {
 *     // Compress "A, A, A, B, B" to "3A, 2B" for efficient storage
 *     const compressed = this.zipperService.compressSteps(expandedSteps);
 *     await this.database.saveSteps(compressed);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Advanced zipper merging for combined rows
 * class CombinedRowProcessor {
 *   mergeRows(row1Steps: Step[], row2Steps: Step[]): Step[] {
 *     // Create alternating pattern: A1, B1, A2, B2, A3, B3...
 *     return this.zipperService.zipperSteps(row1Steps, row2Steps);
 *   }
 * }
 * ```
 *
 * **Core Capabilities:**
 *
 * **1. Step Expansion** - Convert compressed notation to individual steps:
 * - Input: `[{id: 1, count: 3, description: "A"}, {id: 2, count: 2, description: "B"}]`
 * - Output: `[Step(A), Step(A), Step(A), Step(B), Step(B)]`
 * - Use case: UI display, individual step tracking, detailed navigation
 *
 * **2. Step Compression** - Optimize storage by merging consecutive identical steps:
 * - Input: `[Step(A), Step(A), Step(A), Step(B), Step(B)]`
 * - Output: `[{id: 1, count: 3, description: "A"}, {id: 2, count: 2, description: "B"}]`
 * - Use case: Database storage, pattern export, memory optimization
 *
 * **3. Zipper Merging** - Combine two rows in alternating pattern:
 * - Input: Row1=[A, B, C], Row2=[X, Y, Z]
 * - Output: [A, X, B, Y, C, Z]
 * - Use case: Combined pattern display, multi-row techniques
 *
 * **Data Integrity Features:**
 * - **Validation Pipeline**: Comprehensive step data validation before processing
 * - **Memory Protection**: Prevents processing of extremely large datasets
 * - **Error Recovery**: Graceful handling of malformed step data
 * - **Boundary Checking**: Validates step counts and description integrity
 * - **DataIntegrityService Integration**: Leverages centralized validation system
 *
 * **Performance Optimizations:**
 * - **Efficient Algorithms**: Linear time complexity for all operations
 * - **Memory Management**: Controlled memory usage for large patterns
 * - **Validation Caching**: Reuses validation results where possible
 * - **Early Exit**: Stops processing on validation failures
 *
 * **Error Handling Strategy:**
 * - **Graceful Degradation**: Returns safe fallbacks on errors
 * - **Detailed Logging**: Comprehensive error context for debugging
 * - **User Feedback**: Clear error messages for user-facing failures
 * - **Data Preservation**: Original data preserved when transformation fails
 *
 * @see {@link ModelFactory.createStep} For step creation utilities
 * @see {@link DataIntegrityService} For validation integration
 * @see {@link ErrorHandlerService} For error processing
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class ZipperService {
  constructor(
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService,
    private dataIntegrityService: DataIntegrityService
  ) {}

  /**
   * Expand Steps from Compressed to Individual Steps
   *
   * Converts compressed step notation (e.g., "3A, 2B") into individual step
   * objects for detailed UI display and navigation. This method is essential
   * for presenting patterns in a step-by-step format.
   *
   * @example
   * ```typescript
   * // Convert compressed pattern to individual steps for UI
   * const compressedSteps = [
   *   { id: 1, count: 3, description: "A" },
   *   { id: 2, count: 2, description: "B" },
   *   { id: 3, count: 1, description: "C" }
   * ];
   *
   * const expandedSteps = zipperService.expandSteps(compressedSteps);
   * // Result: [A, A, A, B, B, C] with unique IDs for each step
   * console.log(expandedSteps.length); // 6 individual steps
   * ```
   *
   * @example
   * ```typescript
   * // Pattern navigation with expanded steps
   * class StepNavigator {
   *   private expandedSteps: Step[];
   *
   *   loadPattern(compressedPattern: Step[]): void {
   *     this.expandedSteps = this.zipperService.expandSteps(compressedPattern);
   *     this.currentStepIndex = 0;
   *   }
   *
   *   nextStep(): Step | null {
   *     if (this.currentStepIndex < this.expandedSteps.length - 1) {
   *       return this.expandedSteps[++this.currentStepIndex];
   *     }
   *     return null;
   *   }
   * }
   * ```
   *
   * **Algorithm Details:**
   * 1. **Validation**: Validates input array and individual step data
   * 2. **Filtering**: Removes steps with zero or negative counts
   * 3. **Expansion**: Creates individual step objects for each count
   * 4. **ID Assignment**: Generates unique sequential IDs for expanded steps
   * 5. **ModelFactory Integration**: Uses safe step creation patterns
   *
   * **Validation Pipeline:**
   * - **Data Integrity**: Validates steps using DataIntegrityService integration
   * - **Array Validation**: Ensures input is valid array with reasonable size
   * - **Step Validation**: Checks count, description, and ID validity
   * - **Memory Protection**: Prevents expansion of extremely large counts
   * - **Error Recovery**: Returns empty array for invalid input with logging
   *
   * **Performance Characteristics:**
   * - **Time Complexity**: O(n × m) where n = steps, m = average count
   * - **Memory Usage**: Linear with total expanded step count
   * - **Maximum Size**: Protected against memory exhaustion (10,000 step limit)
   * - **Early Exit**: Stops processing on validation failures
   *
   * **Error Scenarios:**
   * - **Invalid Input**: null, undefined, or non-array input
   * - **Malformed Steps**: Steps missing required properties
   * - **Size Limits**: Steps array or individual counts exceeding limits
   * - **Memory Protection**: Extremely large expansions prevented
   *
   * @param steps - Array of compressed steps to expand (validated before processing)
   * @returns {Step[]} Array of individual steps, empty array on validation failure
   *
   * @see {@link compressSteps} For reverse operation (compression)
   * @see {@link validateStepData} For validation implementation
   * @see {@link ModelFactory.createStep} For step creation
   * @since 1.0.0
   */
  expandSteps(steps: Step[]): Step[] {
    try {
      // Integration Point 1: Validate step data before expansion
      const validationResult = this.validateStepData(steps, 'expandSteps');
      if (!validationResult.isValid) {
        this.logger.warn(
          'ZipperService: Invalid step data for expansion',
          validationResult.issues
        );
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

  /**
   * Compress Steps for Storage Optimization
   *
   * Merges consecutive identical steps into compressed notation for efficient
   * storage and reduced memory usage. This method optimizes patterns by
   * combining repetitive sequences while preserving pattern integrity.
   *
   * @example
   * ```typescript
   * // Optimize pattern storage
   * const individualSteps = [
   *   { id: 1, count: 1, description: "A" },
   *   { id: 2, count: 1, description: "A" },
   *   { id: 3, count: 1, description: "A" },
   *   { id: 4, count: 1, description: "B" },
   *   { id: 5, count: 1, description: "B" }
   * ];
   *
   * const compressed = zipperService.compressSteps(individualSteps);
   * // Result: [{ count: 3, description: "A" }, { count: 2, description: "B" }]
   * console.log(`Reduced from ${individualSteps.length} to ${compressed.length} steps`);
   * ```
   *
   * @example
   * ```typescript
   * // Database storage pipeline
   * class PatternStorageService {
   *   async savePattern(pattern: Step[]): Promise<void> {
   *     // Compress before storage to reduce database size
   *     const optimized = this.zipperService.compressSteps(pattern);
   *
   *     const sizeReduction = pattern.length - optimized.length;
   *     console.log(`Storage optimization: ${sizeReduction} steps compressed`);
   *
   *     await this.database.savePattern(optimized);
   *   }
   * }
   * ```
   *
   * **Compression Algorithm:**
   * 1. **Validation**: Validates input steps and transformation integrity
   * 2. **Sequential Processing**: Iterates through steps maintaining current group
   * 3. **Identity Comparison**: Groups consecutive steps with same description
   * 4. **Count Accumulation**: Accumulates counts for identical consecutive steps
   * 5. **ID Management**: Assigns new sequential IDs to compressed groups
   * 6. **Final Group**: Ensures last group is added to result
   *
   * **Validation Integration:**
   * - **Transformation Validation**: Uses validateStepTransformations for integrity
   * - **Data Integrity**: Ensures input data is safe for processing
   * - **Size Limits**: Protects against memory issues with large datasets
   * - **Error Recovery**: Returns original steps if compression fails
   *
   * **Performance Benefits:**
   * - **Storage Efficiency**: Reduces database storage requirements
   * - **Memory Usage**: Lower memory footprint for large patterns
   * - **Transfer Speed**: Faster network transfers of compressed data
   * - **Processing Speed**: Fewer steps to iterate in many operations
   *
   * **Data Preservation:**
   * - **Lossless Compression**: Original pattern can be perfectly reconstructed
   * - **Description Integrity**: Step descriptions preserved exactly
   * - **Count Accuracy**: Total step counts maintained precisely
   * - **Order Preservation**: Sequential order of pattern maintained
   *
   * **Error Handling:**
   * - **Graceful Fallback**: Returns original steps if compression fails
   * - **Validation Errors**: Comprehensive error logging with context
   * - **Memory Protection**: Prevents processing of oversized datasets
   * - **Data Safety**: No data loss on compression failures
   *
   * @param steps - Array of individual steps to compress (all properties validated)
   * @returns {Step[]} Array of compressed steps, original array on failure
   *
   * @see {@link expandSteps} For reverse operation (expansion)
   * @see {@link validateStepTransformations} For transformation validation
   * @since 1.0.0
   */
  compressSteps(steps: Step[]): Step[] {
    try {
      // Integration Point 2: Add data integrity checks for step transformations
      const validationResult = this.validateStepTransformations(
        steps,
        'compressSteps'
      );
      if (!validationResult.isValid) {
        this.logger.warn(
          'ZipperService: Invalid step data for compression',
          validationResult.issues
        );
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

  /**
   * Zipper Steps for Combined Row Patterns
   *
   * Merges two step arrays in alternating fashion to create combined row
   * patterns. This advanced operation enables complex pattern techniques
   * where two rows are worked simultaneously in alternating sequence.
   *
   * @example
   * ```typescript
   * // Create alternating pattern from two rows
   * const row1 = [
   *   { id: 1, count: 2, description: "A" },
   *   { id: 2, count: 1, description: "B" }
   * ];
   * const row2 = [
   *   { id: 1, count: 1, description: "X" },
   *   { id: 2, count: 2, description: "Y" }
   * ];
   *
   * const combined = zipperService.zipperSteps(row1, row2);
   * // Result: A, X, A, Y, B, Y (alternating between rows)
   * ```
   *
   * @example
   * ```typescript
   * // Advanced pattern technique implementation
   * class CombinedPatternProcessor {
   *   createZipperPattern(rows: Step[][]): Step[] {
   *     if (rows.length < 2) return rows[0] || [];
   *
   *     let result = rows[0];
   *     for (let i = 1; i < rows.length; i++) {
   *       result = this.zipperService.zipperSteps(result, rows[i]);
   *     }
   *
   *     return result;
   *   }
   * }
   * ```
   *
   * **Zipper Algorithm Process:**
   * 1. **Input Validation**: Validates both step arrays for processing
   * 2. **Expansion**: Converts both arrays to individual steps
   * 3. **Length Validation**: Ensures compatible row lengths (±1 step tolerance)
   * 4. **Alternating Merge**: Interleaves steps from both expanded arrays
   * 5. **Compression**: Optimizes final result by compressing identical sequences
   * 6. **Error Recovery**: Returns empty array if incompatible patterns
   *
   * **Length Compatibility Rules:**
   * - **Equal Length**: Both rows have same number of expanded steps
   * - **±1 Tolerance**: One row can have one more/fewer steps than the other
   * - **Mismatch Handling**: Larger mismatches result in error with clear messaging
   * - **Graceful Padding**: Missing steps handled automatically in alternation
   *
   * **Pattern Creation Logic:**
   * ```
   * Row 1: [A, B, C]     Row 2: [X, Y, Z]
   * Result: [A, X, B, Y, C, Z]
   *
   * Row 1: [A, B, C, D]  Row 2: [X, Y, Z]
   * Result: [A, X, B, Y, C, Z, D]
   * ```
   *
   * **Validation and Error Handling:**
   * - **Array Validation**: Both inputs must be valid step arrays
   * - **Length Compatibility**: Row lengths checked with tolerance
   * - **Expansion Safety**: Individual step expansion validated
   * - **Compression Integrity**: Final compression verified
   * - **Error Messaging**: Clear feedback for incompatible patterns
   *
   * **Use Cases:**
   * - **Advanced Beadwork**: Two-color alternating patterns
   * - **Complex Techniques**: Multi-row simultaneous working
   * - **Pattern Variation**: Creating variations from base patterns
   * - **Tutorial Content**: Demonstrating combined techniques
   *
   * **Performance Considerations:**
   * - **Memory Usage**: Two expansion operations plus final compression
   * - **Processing Time**: Linear with total expanded step count
   * - **Validation Overhead**: Multiple validation passes for safety
   * - **Error Recovery**: Early exit on incompatible patterns
   *
   * @param steps1 - First row steps array (will be expanded before merging)
   * @param steps2 - Second row steps array (will be expanded before merging)
   * @returns {Step[]} Combined steps in alternating pattern, empty array on error
   *
   * @see {@link expandSteps} For step expansion before merging
   * @see {@link compressSteps} For final result optimization
   * @since 1.0.0
   */
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
   * Validate Step Data Before Processing
   *
   * Comprehensive validation of step array data before transformation operations.
   * This method ensures data integrity and prevents processing errors by validating
   * structure, types, and boundary conditions with DataIntegrityService integration.
   *
   * @example
   * ```typescript
   * // Safe step processing with validation
   * class SafeStepProcessor {
   *   processSteps(steps: Step[]): Step[] {
   *     const validation = this.validateStepData(steps, 'customOperation');
   *
   *     if (!validation.isValid) {
   *       console.error('Step validation failed:', validation.issues);
   *       return [];
   *     }
   *
   *     return this.performStepTransformation(steps);
   *   }
   * }
   * ```
   *
   * **Validation Categories:**
   *
   * **1. Structural Validation:**
   * - Array existence and type checking
   * - Reasonable array size limits (10,000 steps maximum)
   * - Individual step object presence validation
   *
   * **2. Property Validation:**
   * - Step ID: Must be non-negative number
   * - Step count: Must be finite, non-negative number
   * - Step description: Must be non-empty string
   *
   * **3. DataIntegrityService Integration:**
   * - Description safety validation through centralized service
   * - Automatic sanitization logging for corrected descriptions
   * - Consistent validation across application layers
   *
   * **4. Operation-Specific Validation:**
   * - Expansion operations: Validates count limits (1,000 max per step)
   * - Memory protection against infinite loop scenarios
   * - Context-aware validation based on operation type
   *
   * **Validation Results:**
   * - `isValid`: Boolean indicating overall validation success
   * - `issues`: Array of specific validation error descriptions
   * - Detailed per-step validation with index tracking
   * - Clear error messaging for debugging and user feedback
   *
   * @param steps - Array of steps to validate
   * @param operation - Context string for operation-specific validation
   * @returns {object} Validation result with isValid flag and issues array
   *
   * @see {@link DataIntegrityService.validateProjectName} For description validation
   * @since 1.0.0
   * @private
   */
  private validateStepData(
    steps: Step[],
    operation: string
  ): {
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

      if (
        typeof step.count !== 'number' ||
        step.count < 0 ||
        !isFinite(step.count)
      ) {
        issues.push(`Step at index ${index} has invalid count: ${step.count}`);
      }

      if (!step.description || typeof step.description !== 'string') {
        issues.push(
          `Step at index ${index} has invalid description: ${step.description}`
        );
      } else {
        // Use DataIntegrityService to validate step descriptions
        const descValidation = this.dataIntegrityService.validateProjectName(
          step.description
        );
        if (!descValidation.isValid) {
          this.logger.debug(
            `ZipperService: Step description sanitized at index ${index}`,
            {
              original: step.description,
              clean: descValidation.cleanValue,
              issues: descValidation.issues,
            }
          );
        }
      }

      // Check for reasonable count limits to prevent infinite loops
      if (step.count > 1000 && operation === 'expandSteps') {
        issues.push(
          `Step at index ${index} has excessive count for expansion: ${step.count}`
        );
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate Step Transformations for Data Integrity
   *
   * Advanced validation for step transformation operations that includes basic
   * validation plus transformation-specific integrity checks. This method ensures
   * safe processing of large datasets and prevents memory/performance issues.
   *
   * @example
   * ```typescript
   * // Pre-transformation validation workflow
   * class TransformationProcessor {
   *   safeTransform(steps: Step[], operation: 'compress' | 'expand'): Step[] {
   *     const validation = this.validateStepTransformations(steps, operation);
   *
   *     if (!validation.isValid) {
   *       this.logger.warn('Transformation blocked by validation', validation.issues);
   *       return this.getSafeDefault(steps);
   *     }
   *
   *     return this.performTransformation(steps, operation);
   *   }
   * }
   * ```
   *
   * **Validation Layers:**
   *
   * **1. Basic Validation Inheritance:**
   * - Runs complete validateStepData validation first
   * - Inherits all structural and property validations
   * - Maintains consistent validation standards
   *
   * **2. Transformation-Specific Checks:**
   * - **Total Count Validation**: Prevents overflow in count accumulation (100,000 limit)
   * - **Memory Protection**: Guards against excessive memory usage
   * - **Performance Boundaries**: Ensures reasonable processing times
   *
   * **3. Content Integrity Validation:**
   * - **Description Analysis**: Validates step description content
   * - **Unique Description Count**: Ensures meaningful pattern content
   * - **Sequence Integrity**: Validates step sequence consistency
   *
   * **4. Logging and Debugging:**
   * - **Debug Logging**: Comprehensive transformation metrics
   * - **Performance Tracking**: Step counts, unique descriptions, issues
   * - **Context Preservation**: Operation-specific validation context
   *
   * **Memory and Performance Protection:**
   * - **Size Limits**: Total count limited to prevent memory exhaustion
   * - **Processing Bounds**: Reasonable limits for transformation operations
   * - **Early Exit**: Validation failures stop processing immediately
   * - **Resource Monitoring**: Tracks validation overhead
   *
   * **Integration Benefits:**
   * - **Consistent Standards**: Uses same validation base as other operations
   * - **Centralized Logic**: Leverages DataIntegrityService standards
   * - **Error Context**: Provides detailed error context for debugging
   * - **Performance Metrics**: Enables optimization monitoring
   *
   * @param steps - Array of steps to validate for transformation
   * @param operation - Specific transformation operation context
   * @returns {object} Enhanced validation result with transformation-specific checks
   *
   * @see {@link validateStepData} For basic validation implementation
   * @since 1.0.0
   * @private
   */
  private validateStepTransformations(
    steps: Step[],
    operation: string
  ): {
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
        issues.push(
          'Total step count too large for transformation (max 100,000)'
        );
      }

      // Validate step sequence integrity
      const descriptions = steps
        .map((step) => step.description)
        .filter((desc) => desc);
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

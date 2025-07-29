/**
 * Row Transformation Utilities
 *
 * Pure utility functions for transforming rows with various settings.
 * Used by selectors and components to apply consistent transformations.
 *
 * @fileoverview
 * This module provides pure functions for row transformations including
 * combine12 logic and other row manipulation utilities. These functions
 * are designed to be side-effect free and testable.
 */

import { Row } from '../../core/models/row';
import { Step } from '../../core/models/step';

/**
 * Applies combine12 transformation to rows by combining first two rows with zipper pattern.
 * This is a pure function that doesn't modify the input arrays.
 *
 * @param rows - Array of rows to transform
 * @param combine12 - Whether to apply combine12 transformation
 * @returns Transformed rows array (new array, original unchanged)
 *
 * @example
 * ```typescript
 * const originalRows = [
 *   { id: 1, steps: [{ id: 1, description: 'A', count: 1 }] },
 *   { id: 2, steps: [{ id: 2, description: 'B', count: 1 }] }
 * ];
 * 
 * const transformed = applyCombine12Transformation(originalRows, true);
 * // Result: [{ id: 1, steps: [...zipped steps] }] (single row)
 * ```
 */
export function applyCombine12Transformation(rows: Row[], combine12: boolean): Row[] {
  if (!combine12 || rows.length < 2) {
    return [...rows]; // Return shallow copy to maintain immutability
  }

  const transformedRows = [...rows];
  const zipperSteps = zipperStepsUtil(
    transformedRows[0]?.steps ?? [],
    transformedRows[1]?.steps ?? []
  );

  if (zipperSteps.length > 0) {
    transformedRows[0] = { ...transformedRows[0], steps: zipperSteps };
    transformedRows.splice(1, 1);
  }

  return transformedRows;
}

/**
 * Pure utility function that implements zipper pattern for combining two step arrays.
 * This is extracted from ZipperService to provide a pure function that can be used
 * in selectors without service injection.
 *
 * @param steps1 - First row steps array
 * @param steps2 - Second row steps array
 * @returns Combined steps in alternating pattern
 *
 * @example
 * ```typescript
 * const steps1 = [{ id: 1, description: 'A', count: 1 }];
 * const steps2 = [{ id: 2, description: 'B', count: 1 }];
 * 
 * const zipped = zipperStepsUtil(steps1, steps2);
 * // Result: [A, B] alternating pattern
 * ```
 */
export function zipperStepsUtil(steps1: Step[], steps2: Step[]): Step[] {
  try {
    if (!steps1 || !Array.isArray(steps1) || !steps2 || !Array.isArray(steps2)) {
      return [];
    }

    const expandedSteps1 = expandSteps(steps1);
    const expandedSteps2 = expandSteps(steps2);

    if (
      expandedSteps1.length !== expandedSteps2.length &&
      expandedSteps1.length !== expandedSteps2.length + 1 &&
      expandedSteps1.length + 1 !== expandedSteps2.length
    ) {
      return [];
    }

    const maxLength = Math.max(expandedSteps1.length, expandedSteps2.length);
    const mergedSteps: Step[] = [];

    for (let i = 0; i < maxLength; i++) {
      if (i < expandedSteps1.length) {
        mergedSteps.push(expandedSteps1[i]);
      }
      if (i < expandedSteps2.length) {
        mergedSteps.push(expandedSteps2[i]);
      }
    }

    return compressSteps(mergedSteps);
  } catch (error) {
    console.error('Error in zipperStepsUtil:', error);
    return [];
  }
}

/**
 * Expands compressed steps by duplicating each step according to its count.
 * 
 * @param steps - Array of steps to expand
 * @returns Expanded steps array
 */
function expandSteps(steps: Step[]): Step[] {
  const expanded: Step[] = [];
  
  for (const step of steps) {
    for (let i = 0; i < step.count; i++) {
      expanded.push({
        ...step,
        count: 1 // Each expanded step has count of 1
      });
    }
  }
  
  return expanded;
}

/**
 * Compresses consecutive identical steps by combining their counts.
 * 
 * @param steps - Array of steps to compress
 * @returns Compressed steps array
 */
function compressSteps(steps: Step[]): Step[] {
  if (steps.length === 0) return [];
  
  const compressed: Step[] = [];
  let currentStep = { ...steps[0] };
  
  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    
    if (step.description === currentStep.description) {
      currentStep.count += step.count;
    } else {
      compressed.push(currentStep);
      currentStep = { ...step };
    }
  }
  
  compressed.push(currentStep);
  return compressed;
}

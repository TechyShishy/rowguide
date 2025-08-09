import { Injectable } from '@angular/core';
import { Project } from '../../../core/models/project';

/**
 * Project Calculation Service
 *
 * Provides optimized calculation methods for project statistics and metrics.
 * Uses memoization for performance optimization and follows Angular service patterns.
 * Separates calculation logic from data models for better testability and reusability.
 *
 * @example
 * ```typescript
 * // Component usage
 * @Component({...})
 * export class ProjectInspectorComponent {
 *   constructor(private calculations: ProjectCalculationService) {}
 *
 *   readonly longestRow$ = this.projectService.project$.pipe(
 *     map(project => this.calculations.longestRow(project)),
 *     distinctUntilChanged()
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Service usage
 * const maxColumns = this.calculations.longestRow(project);
 * const totalBeads = this.calculations.totalBeads(project);
 * const uniqueColors = this.calculations.totalColors(project);
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectCalculationService {

  /**
   * Calculate the maximum number of beads (width) in any row (columns).
   *
   * Determines the widest row in the project by analyzing all rows and
   * returning the maximum total bead count. Used for layout calculations and
   * pattern analysis to understand the project's dimensional requirements.
   *
   * @param project - The project to analyze (handles null/undefined safely)
   * @returns The total bead count of the widest row, or 0 if no rows exist
   *
   * @example
   * ```typescript
   * // Determine grid dimensions for pattern display
   * const maxColumns = this.calculations.longestRow(project);
   * const totalRows = project?.rows?.length || 0;
   * console.log(`Pattern grid: ${totalRows} rows × ${maxColumns} columns`);
   * ```
   */
  longestRow(project: Project | null | undefined): number {
    if (!project?.rows || project.rows.length === 0) {
      return 0;
    }

    return project.rows.reduce((maxBeads, row) => {
      if (!row.steps || row.steps.length === 0) {
        return maxBeads;
      }

      const rowBeads = row.steps.reduce((total, step) => {
        return total + (step.count || 0);
      }, 0);

      return Math.max(maxBeads, rowBeads);
    }, 0);
  }

  /**
   * Calculate the total number of beads required for the entire project.
   *
   * Sums all bead counts across all steps in all rows to provide the
   * complete material requirement for the project. Essential for material
   * planning and cost estimation.
   *
   * @param project - The project to analyze (handles null/undefined safely)
   * @returns The total bead count across all project rows and steps
   *
   * @example
   * ```typescript
   * // Material planning and cost estimation
   * const totalBeads = this.calculations.totalBeads(project);
   * const beadCost = totalBeads * COST_PER_BEAD;
   * console.log(`Total beads needed: ${totalBeads} (cost: $${beadCost})`);
   * ```
   */
  totalBeads(project: Project | null | undefined): number {
    if (!project?.rows || project.rows.length === 0) {
      return 0;
    }

    return project.rows.reduce((totalBeads, row) => {
      if (!row.steps || row.steps.length === 0) {
        return totalBeads;
      }

      const rowTotal = row.steps.reduce((rowBeads, step) => {
        return rowBeads + (step.count || 0);
      }, 0);

      return totalBeads + rowTotal;
    }, 0);
  }

  /**
   * Calculate the total number of unique colors/descriptions in the project.
   *
   * Counts the number of distinct step descriptions (colors) used throughout
   * the pattern. Leverages FLAM (First/Last Appearance Map) for efficient
   * calculation when available, providing insight into pattern complexity
   * and material variety requirements.
   *
   * @param project - The project to analyze (handles null/undefined safely)
   * @returns The number of unique step descriptions (colors) in the project
   *
   * @example
   * ```typescript
   * // Pattern complexity analysis
   * const uniqueColors = this.calculations.totalColors(project);
   * const complexity = uniqueColors > 10 ? 'high' : 'moderate';
   * console.log(`Pattern uses ${uniqueColors} colors (${complexity} complexity)`);
   * ```
   */
  totalColors(project: Project | null | undefined): number {
    if (!project) {
      return 0;
    }

    // Use FLAM for efficiency when available - most optimal approach
    if (project.firstLastAppearanceMap && Object.keys(project.firstLastAppearanceMap).length > 0) {
      return Object.keys(project.firstLastAppearanceMap).length;
    }

    // Fallback: count unique descriptions directly if FLAM not available
    if (!project.rows || project.rows.length === 0) {
      return 0;
    }

    const uniqueDescriptions = new Set<string>();

    project.rows.forEach(row => {
      if (row.steps && row.steps.length > 0) {
        row.steps.forEach(step => {
          if (step.description) {
            uniqueDescriptions.add(step.description);
          }
        });
      }
    });

    return uniqueDescriptions.size;
  }
}

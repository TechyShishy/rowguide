import { FLAMRow } from './flamrow';

/**
 * FLAM - First/Last Appearance Map Interface
 *
 * A comprehensive pattern analysis structure that maps each unique step
 * description to its first and last appearance coordinates within a project.
 * Used for pattern complexity analysis, color planning, and material
 * requirement calculations.
 *
 * @example
 * ```typescript
 * // FLAM generation and usage
 * import { FlamService } from '../services/flam.service';
 *
 * class PatternAnalyzer {
 *   analyzePattern(project: Project): PatternAnalysis {
 *     const flam = this.flamService.generateFLAM(project.rows);
 *
 *     return {
 *       uniqueColors: Object.keys(flam).length,
 *       complexity: this.calculateComplexity(flam),
 *       colorDistribution: this.analyzeColorDistribution(flam),
 *       materialRequirements: this.calculateMaterials(flam)
 *     };
 *   }
 *
 *   private calculateComplexity(flam: FLAM): ComplexityLevel {
 *     const colorCount = Object.keys(flam).length;
 *     const avgSpan = this.calculateAverageColorSpan(flam);
 *
 *     if (colorCount > 15 || avgSpan > 50) return 'high';
 *     if (colorCount > 8 || avgSpan > 20) return 'medium';
 *     return 'low';
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Color planning with FLAM data
 * class ColorPlanner {
 *   optimizeColorOrdering(flam: FLAM): ColorOrderStrategy {
 *     const flamEntries = Object.entries(flam);
 *
 *     // Sort by first appearance for logical color introduction
 *     flamEntries.sort((a, b) => {
 *       const aFirst = Math.min(...a[1].firstAppearance);
 *       const bFirst = Math.min(...b[1].firstAppearance);
 *       return aFirst - bFirst;
 *     });
 *
 *     return {
 *       recommendedOrder: flamEntries.map(([key]) => key),
 *       colorIntroductions: this.calculateIntroductionPoints(flamEntries),
 *       materialBudget: this.calculateBudgetRequirements(flamEntries)
 *     };
 *   }
 *
 *   findColorConflicts(flam: FLAM): ColorConflict[] {
 *     const conflicts: ColorConflict[] = [];
 *     const flamEntries = Object.entries(flam);
 *
 *     flamEntries.forEach(([colorA, dataA], indexA) => {
 *       flamEntries.slice(indexA + 1).forEach(([colorB, dataB]) => {
 *         if (this.hasOverlappingUsage(dataA, dataB)) {
 *           conflicts.push({
 *             colors: [colorA, colorB],
 *             severity: this.calculateConflictSeverity(dataA, dataB)
 *           });
 *         }
 *       });
 *     });
 *
 *     return conflicts;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Material requirement calculations
 * class MaterialCalculator {
 *   calculateBeadRequirements(flam: FLAM): BeadRequirements {
 *     const requirements: BeadRequirements = {};
 *
 *     Object.entries(flam).forEach(([description, flamRow]) => {
 *       requirements[description] = {
 *         totalBeads: flamRow.count,
 *         firstUsedAt: Math.min(...flamRow.firstAppearance),
 *         lastUsedAt: Math.max(...flamRow.lastAppearance),
 *         usageSpan: Math.max(...flamRow.lastAppearance) - Math.min(...flamRow.firstAppearance),
 *         color: flamRow.hexColor || flamRow.color,
 *         priority: this.calculatePriority(flamRow)
 *       };
 *     });
 *
 *     return requirements;
 *   }
 *
 *   estimateProjectCost(flam: FLAM, pricePerBead: number = 0.02): CostEstimate {
 *     const totalBeads = Object.values(flam).reduce((sum, row) => sum + row.count, 0);
 *     const uniqueColors = Object.keys(flam).length;
 *
 *     return {
 *       totalBeads,
 *       uniqueColors,
 *       estimatedCost: totalBeads * pricePerBead,
 *       colorSetupCost: uniqueColors * 5.00, // Setup cost per color
 *       breakdown: this.generateCostBreakdown(flam, pricePerBead)
 *     };
 *   }
 * }
 * ```
 *
 * **Data Structure:**
 *
 * **Dictionary Mapping:**
 * - **Key**: Step description (color/type identifier)
 * - **Value**: FLAMRow containing appearance and usage data
 * - **Completeness**: Contains entry for every unique step description
 * - **Generation**: Created by FlamService from project row data
 *
 * **Analysis Capabilities:**
 * - **Pattern Complexity**: Assess difficulty based on color count and distribution
 * - **Material Planning**: Calculate exact bead requirements per color
 * - **Color Optimization**: Plan color introduction and usage patterns
 * - **Quality Assurance**: Validate pattern consistency and completeness
 *
 * **Performance Characteristics:**
 * - **Generation Cost**: O(n) where n is total number of steps in pattern
 * - **Lookup Cost**: O(1) for color-specific information retrieval
 * - **Memory Efficiency**: Compact representation of pattern analysis
 * - **Caching**: Results cached with project for performance
 *
 * **Integration Points:**
 * - **FlamService**: Primary generator of FLAM data structures
 * - **Project Model**: Stored as optional property for caching
 * - **Color Mapping**: Coordinates with project color assignments
 * - **Export Services**: Included in pattern analysis exports
 *
 * @see {@link FLAMRow} For individual color entry structure
 * @see {@link FlamService} For FLAM generation algorithms
 * @since 1.0.0
 */
export interface FLAM {
  /**
   * Step Description to FLAM Row Mapping
   *
   * Dictionary mapping each unique step description found in the pattern
   * to its corresponding FLAMRow containing appearance coordinates, usage
   * counts, and color information. Each key represents a distinct bead
   * type or color used in the pattern.
   *
   * @example
   * ```typescript
   * // Accessing FLAM data
   * class FlamReader {
   *   getColorInfo(flam: FLAM, stepDescription: string): FLAMRow | null {
   *     return flam[stepDescription] || null;
   *   }
   *
   *   getAllColors(flam: FLAM): string[] {
   *     return Object.keys(flam);
   *   }
   *
   *   getColorUsage(flam: FLAM, stepDescription: string): number {
   *     return flam[stepDescription]?.count || 0;
   *   }
   *
   *   findMostUsedColor(flam: FLAM): string | null {
   *     let maxCount = 0;
   *     let mostUsedColor = null;
   *
   *     Object.entries(flam).forEach(([description, flamRow]) => {
   *       if (flamRow.count > maxCount) {
   *         maxCount = flamRow.count;
   *         mostUsedColor = description;
   *       }
   *     });
   *
   *     return mostUsedColor;
   *   }
   * }
   * ```
   *
   * **Key Structure:**
   * - **Source**: Derived from Step.description values in pattern
   * - **Uniqueness**: Each unique description has exactly one entry
   * - **Consistency**: Keys match exactly with step descriptions
   * - **Case Sensitivity**: Preserves original step description casing
   *
   * **Value Structure:**
   * - **Type**: FLAMRow containing comprehensive appearance data
   * - **Completeness**: Every step description represented
   * - **Analysis Ready**: Includes all data needed for pattern analysis
   * - **Color Integration**: Coordinates with project color mappings
   *
   * **Usage Patterns:**
   * - **Color Lookup**: Direct access to color-specific information
   * - **Iteration**: Process all colors in pattern systematically
   * - **Analysis**: Foundation for pattern complexity calculations
   * - **Validation**: Verify pattern completeness and consistency
   */
  [key: string]: FLAMRow;
}

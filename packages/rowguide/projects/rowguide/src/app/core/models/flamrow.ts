/**
 * FLAMRow - First/Last Appearance Map Row Interface
 *
 * Represents detailed appearance and usage information for a single step
 * description (color/type) within a pattern. Contains coordinate arrays
 * for first and last appearances, total usage counts, and color information.
 * Used as the value type in FLAM dictionaries for pattern analysis.
 *
 * @example
 * ```typescript
 * // Creating and analyzing FLAMRow data
 * class FlamRowAnalyzer {
 *   analyzeFlamRow(flamRow: FLAMRow): FlamRowAnalysis {
 *     const firstPosition = Math.min(...flamRow.firstAppearance);
 *     const lastPosition = Math.max(...flamRow.lastAppearance);
 *     const usageSpan = lastPosition - firstPosition;
 *
 *     return {
 *       stepDescription: flamRow.key,
 *       totalUsage: flamRow.count,
 *       usageSpan,
 *       density: flamRow.count / (usageSpan + 1),
 *       isContiguous: this.checkContiguousUsage(flamRow),
 *       colorInfo: flamRow.hexColor || flamRow.color
 *     };
 *   }
 *
 *   private checkContiguousUsage(flamRow: FLAMRow): boolean {
 *     // Check if all positions between first and last contain this color
 *     const first = Math.min(...flamRow.firstAppearance);
 *     const last = Math.max(...flamRow.lastAppearance);
 *     const expectedPositions = last - first + 1;
 *
 *     // Combine and deduplicate all appearance positions
 *     const allPositions = new Set([
 *       ...flamRow.firstAppearance,
 *       ...flamRow.lastAppearance
 *     ]);
 *
 *     return allPositions.size === expectedPositions;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Color planning and optimization
 * class ColorOptimizer {
 *   prioritizeColorPurchase(flamRows: FLAMRow[]): ColorPriority[] {
 *     return flamRows
 *       .map(flamRow => ({
 *         description: flamRow.key,
 *         priority: this.calculatePriority(flamRow),
 *         urgency: this.calculateUrgency(flamRow),
 *         quantity: flamRow.count,
 *         color: flamRow.hexColor || flamRow.color
 *       }))
 *       .sort((a, b) => b.priority - a.priority);
 *   }
 *
 *   private calculatePriority(flamRow: FLAMRow): number {
 *     const earlyStart = Math.min(...flamRow.firstAppearance);
 *     const totalUsage = flamRow.count;
 *     const usageSpan = Math.max(...flamRow.lastAppearance) - earlyStart;
 *
 *     // Higher priority for colors that start early and are used frequently
 *     return (1000 - earlyStart) + (totalUsage * 10) + (usageSpan * 2);
 *   }
 *
 *   findColorGaps(flamRow: FLAMRow, patternLength: number): GapAnalysis {
 *     const allAppearances = [
 *       ...flamRow.firstAppearance,
 *       ...flamRow.lastAppearance
 *     ].sort((a, b) => a - b);
 *
 *     const gaps: Gap[] = [];
 *     for (let i = 1; i < allAppearances.length; i++) {
 *       const gapSize = allAppearances[i] - allAppearances[i - 1] - 1;
 *       if (gapSize > 0) {
 *         gaps.push({
 *           start: allAppearances[i - 1] + 1,
 *           end: allAppearances[i] - 1,
 *           size: gapSize
 *         });
 *       }
 *     }
 *
 *     return { gaps, hasGaps: gaps.length > 0 };
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Material requirement calculations
 * class MaterialPlanner {
 *   calculateMaterialOrder(flamRow: FLAMRow): MaterialOrder {
 *     const buffer = Math.ceil(flamRow.count * 0.1); // 10% buffer
 *     const packageSize = this.getStandardPackageSize(flamRow.key);
 *     const packagesNeeded = Math.ceil((flamRow.count + buffer) / packageSize);
 *
 *     return {
 *       description: flamRow.key,
 *       exactQuantity: flamRow.count,
 *       withBuffer: flamRow.count + buffer,
 *       packageSize,
 *       packagesNeeded,
 *       totalBeads: packagesNeeded * packageSize,
 *       wastePercentage: ((packagesNeeded * packageSize) - flamRow.count) / flamRow.count * 100,
 *       color: flamRow.hexColor || flamRow.color
 *     };
 *   }
 *
 *   estimateWorkTime(flamRow: FLAMRow): TimeEstimate {
 *     const beadsPerMinute = 15; // Estimated bead placement rate
 *     const colorSetupTime = 2; // Minutes to setup new color
 *     const colorChanges = flamRow.firstAppearance.length; // Number of times color is introduced
 *
 *     return {
 *       placementTime: flamRow.count / beadsPerMinute,
 *       setupTime: colorChanges * colorSetupTime,
 *       totalTime: (flamRow.count / beadsPerMinute) + (colorChanges * colorSetupTime),
 *       colorChanges
 *     };
 *   }
 * }
 * ```
 *
 * **Data Structure:**
 *
 * **Appearance Tracking:**
 * - **First Appearance**: Array of positions where color first appears
 * - **Last Appearance**: Array of positions where color last appears
 * - **Position Format**: Linear position indices across entire pattern
 * - **Multiple Segments**: Supports discontinuous color usage patterns
 *
 * **Usage Statistics:**
 * - **Total Count**: Complete bead count for this color across pattern
 * - **Distribution**: Appearance arrays show usage distribution
 * - **Density**: Count relative to appearance span indicates usage density
 * - **Frequency**: Number of appearance segments indicates color changes
 *
 * **Color Information:**
 * - **Description Key**: Original step description for identification
 * - **Color Name**: Optional human-readable color name
 * - **Hex Color**: Optional hex color code for visualization
 * - **Integration**: Coordinates with project color mapping system
 *
 * @see {@link FLAM} For parent FLAM dictionary structure
 * @see {@link FlamService} For FLAMRow generation algorithms
 * @since 1.0.0
 */
export interface FLAMRow {
  /**
   * Step Description Identifier
   *
   * The original step description that this FLAMRow represents, used as
   * the identifier key for this color/type throughout the pattern analysis.
   * Must match exactly with step descriptions found in pattern rows.
   *
   * @example
   * ```typescript
   * // Key-based operations
   * class FlamRowManager {
   *   validateKey(flamRow: FLAMRow, expectedKey: string): boolean {
   *     return flamRow.key === expectedKey;
   *   }
   *
   *   normalizeKey(key: string): string {
   *     return key.trim(); // Preserve original casing but remove whitespace
   *   }
   *
   *   findFlamRowByKey(flam: FLAM, searchKey: string): FLAMRow | null {
   *     return flam[searchKey] || null;
   *   }
   *
   *   groupByKeyPattern(flamRows: FLAMRow[]): { [pattern: string]: FLAMRow[] } {
   *     const groups: { [pattern: string]: FLAMRow[] } = {};
   *
   *     flamRows.forEach(flamRow => {
   *       const pattern = this.extractPattern(flamRow.key);
   *       if (!groups[pattern]) groups[pattern] = [];
   *       groups[pattern].push(flamRow);
   *     });
   *
   *     return groups;
   *   }
   * }
   * ```
   *
   * **Key Properties:**
   * - **Source**: Exact copy of Step.description from pattern
   * - **Uniqueness**: Unique within FLAM dictionary context
   * - **Consistency**: Must match step descriptions exactly
   * - **Validation**: Used to verify FLAMRow integrity
   */
  key: string;

  /**
   * First Appearance Position Array
   *
   * Array of linear position indices where this step description first
   * appears in new pattern segments. Multiple entries indicate discontinuous
   * usage where the color is used, then absent, then reintroduced.
   *
   * @example
   * ```typescript
   * // First appearance analysis
   * class AppearanceAnalyzer {
   *   getEarliestAppearance(flamRow: FLAMRow): number {
   *     return Math.min(...flamRow.firstAppearance);
   *   }
   *
   *   getColorIntroductions(flamRow: FLAMRow): ColorIntroduction[] {
   *     return flamRow.firstAppearance.map((position, index) => ({
   *       segmentIndex: index,
   *       position,
   *       isReintroduction: index > 0
   *     }));
   *   }
   *
   *   analyzeColorPattern(flamRow: FLAMRow): UsagePattern {
   *     const introductions = flamRow.firstAppearance.length;
   *     const totalSpan = Math.max(...flamRow.lastAppearance) - Math.min(...flamRow.firstAppearance);
   *
   *     return {
   *       type: introductions === 1 ? 'continuous' : 'segmented',
   *       segments: introductions,
   *       totalSpan,
   *       complexity: introductions > 3 ? 'high' : introductions > 1 ? 'medium' : 'low'
   *     };
   *   }
   * }
   * ```
   *
   * **Position Format:**
   * - **Linear Indexing**: Position calculated across entire pattern
   * - **Zero-Based**: Positions start from 0 for first step
   * - **Calculation**: Position = (row_index * row_length) + step_index
   * - **Ordering**: Array sorted in ascending position order
   *
   * **Usage Patterns:**
   * - **Single Entry**: Continuous usage from first to last appearance
   * - **Multiple Entries**: Discontinuous usage with reintroductions
   * - **Pattern Analysis**: Reveals color planning and design structure
   * - **Material Planning**: Determines when to have colors ready
   */
  firstAppearance: Array<number>;

  /**
   * Last Appearance Position Array
   *
   * Array of linear position indices where this step description last
   * appears in pattern segments. Paired with firstAppearance to define
   * complete usage segments for discontinuous color patterns.
   *
   * @example
   * ```typescript
   * // Last appearance analysis
   * class CompletionAnalyzer {
   *   getLatestAppearance(flamRow: FLAMRow): number {
   *     return Math.max(...flamRow.lastAppearance);
   *   }
   *
   *   getUsageSegments(flamRow: FLAMRow): UsageSegment[] {
   *     const segments: UsageSegment[] = [];
   *
   *     for (let i = 0; i < flamRow.firstAppearance.length; i++) {
   *       segments.push({
   *         start: flamRow.firstAppearance[i],
   *         end: flamRow.lastAppearance[i] || flamRow.firstAppearance[i],
   *         length: (flamRow.lastAppearance[i] || flamRow.firstAppearance[i]) - flamRow.firstAppearance[i] + 1
   *       });
   *     }
   *
   *     return segments;
   *   }
   *
   *   calculateTotalCoverage(flamRow: FLAMRow): CoverageInfo {
   *     const segments = this.getUsageSegments(flamRow);
   *     const totalCoverage = segments.reduce((sum, segment) => sum + segment.length, 0);
   *     const patternSpan = Math.max(...flamRow.lastAppearance) - Math.min(...flamRow.firstAppearance) + 1;
   *
   *     return {
   *       totalPositions: totalCoverage,
   *       patternSpan,
   *       density: totalCoverage / patternSpan,
   *       segments: segments.length
   *     };
   *   }
   * }
   * ```
   *
   * **Array Relationships:**
   * - **Pairing**: Each firstAppearance[i] paired with lastAppearance[i]
   * - **Length Matching**: Arrays should have same length
   * - **Ordering**: Positions within array sorted in ascending order
   * - **Validation**: lastAppearance[i] >= firstAppearance[i]
   *
   * **Segment Definition:**
   * - **Complete Segments**: first[i] to last[i] defines usage segment
   * - **Single Position**: first[i] === last[i] for single-position usage
   * - **Continuous Blocks**: Segments may represent continuous color blocks
   * - **Pattern Structure**: Reveals underlying pattern design
   */
  lastAppearance: Array<number>;

  /**
   * Total Usage Count
   *
   * Complete count of beads required for this step description across
   * the entire pattern. Represents the total material requirement for
   * this specific color or bead type.
   *
   * @example
   * ```typescript
   * // Count-based calculations
   * class MaterialCalculator {
   *   calculateBeadOrder(flamRow: FLAMRow, bufferPercent: number = 10): BeadOrder {
   *     const buffer = Math.ceil(flamRow.count * (bufferPercent / 100));
   *     const packageSize = this.getPackageSize(flamRow.key);
   *
   *     return {
   *       exactNeed: flamRow.count,
   *       withBuffer: flamRow.count + buffer,
   *       packagesNeeded: Math.ceil((flamRow.count + buffer) / packageSize),
   *       totalCost: this.calculateCost(flamRow.count + buffer, flamRow.key)
   *     };
   *   }
   *
   *   calculateUsagePercentage(flamRow: FLAMRow, totalProjectCount: number): number {
   *     return (flamRow.count / totalProjectCount) * 100;
   *   }
   *
   *   validateCount(flamRow: FLAMRow, actualStepCounts: Step[]): boolean {
   *     const calculatedCount = actualStepCounts
   *       .filter(step => step.description === flamRow.key)
   *       .reduce((sum, step) => sum + step.count, 0);
   *
   *     return calculatedCount === flamRow.count;
   *   }
   * }
   * ```
   *
   * **Count Properties:**
   * - **Accuracy**: Must match sum of all step counts for this description
   * - **Type**: Positive integer representing bead quantity
   * - **Validation**: Verified against source pattern step counts
   * - **Material Planning**: Direct input for purchasing calculations
   *
   * **Usage Contexts:**
   * - **Material Orders**: Exact quantity needed for project completion
   * - **Cost Estimation**: Foundation for project cost calculations
   * - **Pattern Analysis**: Indicates color importance and frequency
   * - **Quality Assurance**: Validates pattern data integrity
   */
  count: number;

  /**
   * Human-Readable Color Name
   *
   * Optional descriptive color name for user-friendly display and
   * material organization. Used in interfaces where technical step
   * descriptions might be too complex or abbreviated.
   *
   * @example
   * ```typescript
   * // Color name management
   * class ColorNameManager {
   *   getDisplayName(flamRow: FLAMRow): string {
   *     return flamRow.color || flamRow.key || 'Unknown Color';
   *   }
   *
   *   setColorName(flamRow: FLAMRow, colorName: string): FLAMRow {
   *     return { ...flamRow, color: colorName };
   *   }
   *
   *   generateColorLegend(flamRows: FLAMRow[]): ColorLegend[] {
   *     return flamRows.map(flamRow => ({
   *       key: flamRow.key,
   *       displayName: flamRow.color || flamRow.key,
   *       hexColor: flamRow.hexColor,
   *       usage: flamRow.count
   *     }));
   *   }
   * }
   * ```
   *
   * **Name Properties:**
   * - **Optional**: Not required, key serves as fallback
   * - **User-Friendly**: More readable than technical descriptions
   * - **Display**: Used in color legends and material lists
   * - **Localization**: Can support internationalized color names
   */
  color?: string;

  /**
   * Hex Color Code
   *
   * Optional hex color code for visual representation and accurate
   * color display in user interfaces. Enables consistent color
   * visualization across different components and export formats.
   *
   * @example
   * ```typescript
   * // Hex color operations
   * class HexColorManager {
   *   setHexColor(flamRow: FLAMRow, hexColor: string): FLAMRow {
   *     if (!this.isValidHex(hexColor)) {
   *       throw new Error(`Invalid hex color: ${hexColor}`);
   *     }
   *     return { ...flamRow, hexColor };
   *   }
   *
   *   isValidHex(hex: string): boolean {
   *     return /^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex);
   *   }
   *
   *   generateColorSwatch(flamRow: FLAMRow): ColorSwatch {
   *     return {
   *       description: flamRow.key,
   *       displayName: flamRow.color,
   *       hexColor: flamRow.hexColor || '#cccccc',
   *       usage: flamRow.count,
   *       style: {
   *         backgroundColor: flamRow.hexColor || '#cccccc',
   *         color: this.getContrastColor(flamRow.hexColor || '#cccccc')
   *       }
   *     };
   *   }
   * }
   * ```
   *
   * **Hex Format:**
   * - **Standard**: #RRGGBB (6-digit) or #RGB (3-digit) format
   * - **Validation**: Must be valid CSS hex color value
   * - **Display**: Used for accurate color representation
   * - **Export**: Included in pattern exports with color information
   */
  hexColor?: string;
}

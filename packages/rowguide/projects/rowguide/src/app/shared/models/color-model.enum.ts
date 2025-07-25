/**
 * Color Model Enumeration
 *
 * Defines available color model types for automatic prefix functionality.
 * Each model corresponds to a specific bead/color naming convention that
 * can automatically prefix empty color input fields.
 *
 * @example
 * ```typescript
 * import { ColorModel } from './color-model.enum';
 * 
 * // Using in components
 * const selectedModel = ColorModel.MIYUKI_DELICA;
 * 
 * // Using in templates
 * <mat-option [value]="ColorModel.NONE">None</mat-option>
 * ```
 */
export enum ColorModel {
  /**
   * No automatic prefix - manual color entry only
   */
  NONE = 'NONE',
  
  /**
   * Miyuki Delica bead colors - automatically prefix with "DB"
   */
  MIYUKI_DELICA = 'MIYUKI_DELICA'
}

/**
 * Color Model Prefix Mapping
 * 
 * Maps color models to their respective prefixes for centralized maintenance.
 * Used by selectors and services to determine appropriate prefixes.
 */
export const COLOR_MODEL_PREFIXES: Record<ColorModel, string> = {
  [ColorModel.NONE]: '',
  [ColorModel.MIYUKI_DELICA]: 'DB'
} as const;

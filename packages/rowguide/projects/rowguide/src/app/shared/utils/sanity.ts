/**
 * Sanity Check Configuration Utility
 *
 * Global configuration flag for enabling or disabling sanity checks throughout
 * the application. This utility provides a centralized control mechanism for
 * validation routines, debugging assertions, and development-time safety checks.
 *
 * @example
 * ```typescript
 * // Conditional validation based on sanity flag
 * import { sanity } from './shared/utils/sanity';
 *
 * class DataProcessor {
 *   processData(data: unknown[]): ProcessedData[] {
 *     if (sanity) {
 *       // Perform expensive validation only when sanity checks are enabled
 *       this.validateInputData(data);
 *       this.checkDataIntegrity(data);
 *     }
 *
 *     return this.performProcessing(data);
 *   }
 *
 *   private validateInputData(data: unknown[]): void {
 *     if (!Array.isArray(data)) {
 *       throw new Error('Input must be an array');
 *     }
 *     // Additional validation logic...
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Development assertions with sanity checks
 * import { sanity } from './shared/utils/sanity';
 *
 * class StateManager {
 *   updateState(newState: AppState): void {
 *     if (sanity) {
 *       console.assert(
 *         this.isValidState(newState),
 *         'Invalid state detected during update'
 *       );
 *       console.log('State validation passed');
 *     }
 *
 *     this.applyStateUpdate(newState);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Performance monitoring with sanity flag
 * import { sanity } from './shared/utils/sanity';
 *
 * class PerformanceService {
 *   measureOperation<T>(operation: () => T, operationName: string): T {
 *     if (sanity) {
 *       const startTime = performance.now();
 *       const result = operation();
 *       const endTime = performance.now();
 *
 *       console.log(`${operationName} took ${endTime - startTime} milliseconds`);
 *       return result;
 *     }
 *
 *     return operation();
 *   }
 * }
 * ```
 *
 * **Configuration Contexts:**
 *
 * **1. Development Environment:**
 * - **Enabled (true)**: Full validation and debugging support
 * - **Assertions**: Runtime assertion checking
 * - **Logging**: Detailed operation logging
 * - **Performance**: Operation timing and profiling
 *
 * **2. Production Environment:**
 * - **Disabled (false)**: Optimized performance, minimal overhead
 * - **Safety**: Core validations only
 * - **Logging**: Error-level logging only
 * - **Performance**: Maximum runtime efficiency
 *
 * **3. Testing Environment:**
 * - **Enabled (true)**: Comprehensive validation for test reliability
 * - **Coverage**: Full code path validation
 * - **Debugging**: Enhanced error reporting
 * - **Assertions**: Strict assertion checking
 *
 * **Usage Patterns:**
 *
 * **Conditional Validation:**
 * ```typescript
 * if (sanity) {
 *   // Expensive validation logic
 *   validateComplexDataStructure(data);
 *   checkInvariantConditions();
 *   performIntegrityChecks();
 * }
 * ```
 *
 * **Debug Logging:**
 * ```typescript
 * if (sanity) {
 *   console.log('Debug: Processing step', { stepData, context });
 * }
 * ```
 *
 * **Performance Monitoring:**
 * ```typescript
 * const startTime = sanity ? performance.now() : 0;
 * performOperation();
 * if (sanity) {
 *   console.log(`Operation completed in ${performance.now() - startTime}ms`);
 * }
 * ```
 *
 * **Build Integration:**
 *
 * The sanity flag can be configured through build processes to automatically
 * optimize different deployment targets:
 *
 * ```typescript
 * // Build-time configuration
 * export const sanity = process.env.NODE_ENV !== 'production';
 *
 * // Or environment-specific
 * export const sanity = process.env.ENABLE_SANITY_CHECKS === 'true';
 * ```
 *
 * **Benefits:**
 * - **Development**: Enhanced debugging and validation capabilities
 * - **Production**: Optimized performance with minimal overhead
 * - **Testing**: Comprehensive validation for reliable test results
 * - **Maintenance**: Centralized control for development features
 *
 * **Trade-offs:**
 * - **Performance**: Sanity checks add runtime overhead
 * - **Bundle Size**: Additional validation code increases bundle size
 * - **Complexity**: Conditional logic can complicate code paths
 * - **Debugging**: Production issues may be harder to diagnose
 *
 * @since 1.0.0
 */

/**
 * Global Sanity Check Enable Flag
 *
 * Boolean flag controlling whether sanity checks, assertions, and development
 * validations are performed throughout the application. When enabled (true),
 * comprehensive validation and debugging features are active. When disabled
 * (false), minimal validation provides optimized performance.
 *
 * **Current Configuration: ENABLED**
 * - All sanity checks and validations are active
 * - Development debugging features available
 * - Enhanced error reporting and logging
 * - Performance monitoring capabilities enabled
 *
 * **Recommended Usage:**
 * - **Development**: Keep enabled for comprehensive validation
 * - **Testing**: Keep enabled for thorough test coverage
 * - **Production**: Consider disabling for optimal performance
 * - **Debugging**: Enable temporarily for issue investigation
 *
 * @example
 * ```typescript
 * // Use in conditional validation
 * if (sanity) {
 *   performExpensiveValidation();
 * }
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/assert} For console.assert usage
 * @since 1.0.0
 */
// Do sanity checks
export const sanity = true;

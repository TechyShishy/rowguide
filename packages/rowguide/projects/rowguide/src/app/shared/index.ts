/**
 * Shared Module - Common Components, Utilities, and Constants
 *
 * This module provides shared functionality that is used across multiple features
 * and application layers. It includes reusable UI components, utility functions,
 * and application-wide constants that promote consistency and code reuse.
 *
 * @fileoverview
 * Comprehensive shared module containing reusable components, utilities, and
 * constants that are used throughout the application. Designed to prevent
 * code duplication and ensure consistent behavior across features.
 *
 * **Module Organization:**
 * ```
 * Shared Module
 * ├── Components (Reusable UI Components)
 * │   ├── ErrorBoundaryComponent
 * │   ├── NotificationComponent
 * │   └── Common UI elements
 * ├── Utils (Utility Functions)
 * │   ├── HierarchicalList interface
 * │   ├── Sanity configuration
 * │   └── Helper functions
 * └── Constants (Application Constants)
 *     ├── UI constants and limits
 *     ├── Configuration values
 *     └── Default settings
 * ```
 *
 * **Design Principles:**
 * - **Reusability**: Components and utilities work across multiple contexts
 * - **Consistency**: Shared components ensure consistent UI/UX
 * - **Performance**: Optimized for minimal bundle impact
 * - **Maintainability**: Centralized location for common functionality
 *
 * **Usage Guidelines:**
 * - Import specific items rather than entire modules when possible
 * - Use shared components for consistent UI patterns
 * - Leverage utilities for common operations
 * - Refer to constants for configuration values
 *
 * @example
 * ```typescript
 * // Using shared components
 * import { ErrorBoundaryComponent } from '@shared/components';
 *
 * @Component({
 *   template: `
 *     <app-error-boundary>
 *       <app-feature-content></app-feature-content>
 *     </app-error-boundary>
 *   `
 * })
 * export class FeatureComponent {}
 * ```
 *
 * @example
 * ```typescript
 * // Using shared utilities
 * import { HierarchicalList, sanity } from '@shared/utils';
 *
 * class NavigationService {
 *   processNavigation(items: HierarchicalList[]): void {
 *     if (sanity) {
 *       this.validateNavigationStructure(items);
 *     }
 *     // Process navigation logic
 *   }
 * }
 * ```
 *
 * **Performance Considerations:**
 * - Tree-shakeable exports to minimize bundle size
 * - Lazy loading for heavy components
 * - Minimal external dependencies
 * - Efficient utility functions
 *
 * @since 1.0.0
 */

// Shared module exports
export * from './components';
export * from './utils';
export * from './constants';

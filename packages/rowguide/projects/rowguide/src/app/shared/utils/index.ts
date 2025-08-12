/**
 * Shared Utilities Module - Common Utility Functions and Interfaces
 *
 * This module provides essential utility functions and interfaces that are used
 * throughout the application. These utilities offer common functionality for
 * navigation, configuration, and development support.
 *
 * @fileoverview
 * Barrel export module for shared utility functions including navigation
 * structures, configuration flags, and development tools. All utilities
 * are designed to be lightweight, reusable, and framework-agnostic.
 *
 * **Module Contents:**
 *
 * **Navigation Utilities:**
 * - `HierarchicalList`: Interface for tree-like navigation structures
 * - Supports bidirectional traversal and parent-child relationships
 * - Enables keyboard navigation and complex UI navigation patterns
 *
 * **Configuration Utilities:**
 * - `sanity`: Global flag for enabling/disabling development checks
 * - Controls validation, debugging, and performance monitoring
 * - Optimizes production builds by disabling development features
 *
 * @example
 * ```typescript
 * // Navigation structure implementation
 * import { HierarchicalList } from '@shared/utils';
 *
 * class NavigationNode implements HierarchicalList {
 *   constructor(
 *     public index: number,
 *     public next: NavigationNode | null = null,
 *     public prev: NavigationNode | null = null,
 *     public parent: NavigationNode | null = null,
 *     public children: NavigationNode[] = []
 *   ) {}
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Configuration-based validation
 * import { sanity } from '@shared/utils';
 *
 * class DataProcessor {
 *   processData(data: unknown): ProcessedData {
 *     if (sanity) {
 *       this.validateInput(data);
 *       this.performSanityChecks(data);
 *     }
 *     return this.performProcessing(data);
 *   }
 * }
 * ```
 *
 * **Usage Guidelines:**
 * - Import specific utilities rather than the entire module when possible
 * - Use HierarchicalList for any tree-like navigation requirements
 * - Leverage sanity flag for development-time validation and debugging
 * - Consider performance implications of sanity checks in production
 *
 * @since 1.0.0
 */

// Shared utilities
export * from './hierarchical-list';
export * from './pdf-rendering';
export * from './sanity';
export * from './row-transformation';

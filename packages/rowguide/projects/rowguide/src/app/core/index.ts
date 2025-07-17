/**
 * Core Module - Essential Services and Domain Models
 *
 * This module provides the core foundation of the Rowguide application including
 * domain models, essential services, and business logic. It serves as the central
 * nervous system for the entire application architecture.
 *
 * @fileoverview
 * Core application module containing fundamental services and domain models
 * that define the business logic and data structures. All other modules depend
 * on the core module for essential functionality.
 *
 * **Core Architecture:**
 * ```
 * Core Module
 * ├── Models (Domain Layer)
 * │   ├── Project, Row, Step, Position
 * │   ├── FLAM analysis structures
 * │   ├── Type guards and validation
 * │   └── Model factories and utilities
 * └── Services (Business Logic)
 *     ├── NotificationService
 *     ├── SettingsService
 *     ├── ErrorHandlerService
 *     ├── DataIntegrityService
 *     ├── FlamService
 *     └── MarkModeService
 * ```
 *
 * **Design Principles:**
 * - **Domain-Driven Design**: Models reflect real-world beading concepts
 * - **Dependency Injection**: Services follow Angular DI patterns
 * - **Single Responsibility**: Each service has a focused purpose
 * - **Immutability**: Data structures promote immutable operations
 *
 * **Core Capabilities:**
 * - **Domain Modeling**: Rich domain models with type safety
 * - **State Management**: Centralized state management with ReactiveStateStore
 * - **Error Handling**: Comprehensive error handling and recovery
 * - **Data Integrity**: Validation and corruption prevention
 * - **Pattern Analysis**: Advanced pattern analysis and FLAM generation
 *
 * @example
 * ```typescript
 * // Core service integration
 * import { NotificationService, ErrorHandlerService } from '@core';
 *
 * @Injectable()
 * export class FeatureService {
 *   constructor(
 *     private notifications: NotificationService,
 *     private errorHandler: ErrorHandlerService
 *   ) {}
 *
 *   async performOperation(): Promise<void> {
 *     try {
 *       // Business logic
 *       this.notifications.success('Operation completed successfully');
 *     } catch (error) {
 *       await this.errorHandler.handleError(error, {
 *         service: 'FeatureService',
 *         operation: 'performOperation'
 *       });
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Domain model usage
 * import { Project, ModelFactory, TypeGuards } from '@core';
 *
 * class ProjectProcessor {
 *   processProject(data: unknown): Project {
 *     if (TypeGuards.isProject(data)) {
 *       return data;
 *     }
 *
 *     return ModelFactory.createProject({
 *       name: 'New Project',
 *       rows: []
 *     });
 *   }
 * }
 * ```
 *
 * **Integration Guidelines:**
 * - Import core models and services in feature modules
 * - Use ReactiveStateStore for state management
 * - Implement proper error handling with ErrorHandlerService
 * - Leverage type guards for runtime validation
 *
 * @since 1.0.0
 */

// Core module exports
export * from './models';
export * from './services';

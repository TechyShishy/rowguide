/**
 * Core Services Module - Service Lifecycle and Dependency Injection Patterns
 *
 * This module exports all core application services that provide foundational functionality
 * used throughout the entire application. Core services follow consistent patterns for
 * lifecycle management, dependency injection, and inter-service communication.
 *
 * **Service Lifecycle Patterns:**
 * - All services are registered as singletons with `@Injectable({ providedIn: 'root' })`
 * - Services initialize through constructor injection without ngOnInit
 * - Services implement OnDestroy for subscription cleanup and memory management
 * - Services use reactive patterns with RxJS observables for state management
 *
 * **Dependency Injection Hierarchy:**
 * ```
 * Core Services (this module) → Data Services → Feature Services → Shared Utilities
 * ```
 *
 * **Service Communication Patterns:**
 * - Primary communication via ReactiveStateStore (Redux-like pattern)
 * - Direct service injection for utility functions (ErrorHandlerService, DataIntegrityService)
 * - Event-driven communication through observable streams
 * - Error handling integration through ErrorHandlerService
 *
 * **Available Core Services:**
 *
 * @example
 * ```typescript
 * // Standard service injection pattern
 * @Injectable({ providedIn: 'root' })
 * export class FeatureService implements OnDestroy {
 *   private destroy$ = new Subject<void>();
 *
 *   constructor(
 *     private store: ReactiveStateStore,           // State management
 *     private errorHandler: ErrorHandlerService,   // Error handling
 *     private dataIntegrity: DataIntegrityService, // Data validation
 *     private notifications: NotificationService,  // User feedback
 *     private logger: NGXLogger                    // Logging
 *   ) {
 *     this.initializeService();
 *   }
 *
 *   private initializeService(): void {
 *     // Service initialization logic
 *     this.store.select(selectCurrentProject)
 *       .pipe(takeUntil(this.destroy$))
 *       .subscribe(project => this.handleProjectChange(project));
 *   }
 *
 *   ngOnDestroy(): void {
 *     this.destroy$.next();
 *     this.destroy$.complete();
 *   }
 * }
 *
 * // Service integration with error handling
 * @Component({})
 * export class ExampleComponent {
 *   constructor(
 *     private featureService: FeatureService,
 *     private errorHandler: ErrorHandlerService
 *   ) {}
 *
 *   performAction(): void {
 *     this.featureService.performOperation()
 *       .pipe(
 *         catchError(error => this.errorHandler.handleError(error, {
 *           component: 'ExampleComponent',
 *           action: 'performAction'
 *         }))
 *       )
 *       .subscribe();
 *   }
 * }
 * ```
 *
 * **Memory Management Guidelines:**
 * - Always implement OnDestroy for services with subscriptions
 * - Use takeUntil pattern for automatic subscription cleanup
 * - Avoid circular dependencies between services
 * - Use ReactiveStateStore for shared state instead of service-to-service state sharing
 *
 * **Testing Integration:**
 * - Services are easily testable through Angular's TestBed
 * - Use TestBed.inject() for service injection in tests
 * - Mock dependencies using jasmine.createSpyObj() or custom test doubles
 *
 * @see {@link NotificationService} User feedback and notification management
 * @see {@link MarkModeService} Mark mode state management with undo capability
 * @see {@link SettingsService} Application settings persistence and loading
 * @see {@link FlamService} First/Last Appearance Map generation and color management
 * @see {@link ErrorHandlerService} Comprehensive error handling with categorization and recovery
 * @see {@link DataIntegrityService} Data validation and corruption prevention
 */

// Core services
export * from './notification.service';
export * from './mark-mode.service';
export * from './settings.service';
export * from './flam.service';
export * from './error-handler.service';
export * from './data-integrity.service';

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';

import { routes } from './app.routes';

/**
 * Application configuration for the Rowguide pattern tracking application.
 *
 * This configuration defines the core providers and services that are available
 * throughout the entire application. It follows Angular's standalone bootstrap
 * pattern, eliminating the need for NgModule and providing a more streamlined
 * application setup.
 *
 * @remarks
 * The configuration includes essential providers for routing, animations, HTTP client,
 * and structured logging. All providers are configured with production-ready defaults
 * and can be easily extended for additional application requirements.
 *
 * **Configuration Approach:**
 * The Rowguide application uses a streamlined configuration approach without
 * traditional Angular environment files. Configuration is managed through:
 * - Build-time settings in angular.json (development vs production)
 * - Runtime provider configuration in this file
 * - Feature detection and runtime environment detection
 *
 * **Environment-Specific Settings:**
 * - Development: Debug logging, source maps, no optimization
 * - Production: Error-only logging, optimization, bundle budgets
 * - All environments: Async animations, interceptor support
 *
 * @example
 * ```typescript
 * // Usage in main.ts
 * import { appConfig } from './app/app.config';
 *
 * bootstrapApplication(AppComponent, appConfig)
 *   .catch(err => console.error(err));
 * ```
 *
 * @example
 * ```typescript
 * // Adding environment-specific providers
 * const environmentProviders = isDevMode() ? [
 *   provideDevToolsSupport(),
 *   provideDebugLogging()
 * ] : [];
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     ...appConfig.providers,
 *     ...environmentProviders
 *   ]
 * };
 * ```
 *
 * @see {@link https://angular.io/guide/standalone-components | Angular Standalone Components}
 * @see {@link https://angular.io/api/core/ApplicationConfig | ApplicationConfig Interface}
 */
export const appConfig: ApplicationConfig = {
  providers: [
    /**
     * Router provider configuration.
     *
     * Configures the Angular Router with the application's route definitions,
     * enabling client-side navigation and route-based component loading.
     *
     * @provider Router
     * @config routes - Application route definitions from app.routes.ts
     * @features Client-side routing, lazy loading, route guards
     *
     * @example
     * ```typescript
     * // Router injection in components
     * constructor(private router: Router) {}
     *
     * navigateToProject(): void {
     *   this.router.navigate(['/project']);
     * }
     * ```
     */
    provideRouter(routes),

    /**
     * Animations provider configuration.
     *
     * Enables Angular Animations with async loading for optimal performance.
     * This provider supports Material Design animations and custom component
     * animations throughout the application.
     *
     * @provider BrowserAnimationsModule (async)
     * @config Asynchronous loading for reduced initial bundle size
     * @features Material Design animations, custom animations, performance optimization
     *
     * @example
     * ```typescript
     * // Using animations in components
     * @Component({
     *   animations: [
     *     trigger('slideIn', [
     *       transition(':enter', [
     *         style({ transform: 'translateX(-100%)' }),
     *         animate('300ms ease-in', style({ transform: 'translateX(0%)' }))
     *       ])
     *     ])
     *   ]
     * })
     * ```
     */
    provideAnimationsAsync(),

    /**
     * Structured logging provider configuration.
     *
     * Configures ngx-logger for comprehensive application logging with
     * configurable log levels and output formatting. Debug level is enabled
     * for development with production-ready level adjustment capability.
     *
     * @provider NgxLoggerModule
     * @config level - DEBUG for development, configurable for production
     * @features Structured logging, log level filtering, console output
     *
     * @remarks
     * **Environment-Specific Configuration:**
     * - Development: NgxLoggerLevel.DEBUG for detailed debugging
     * - Production: Should use NgxLoggerLevel.ERROR for performance
     * - Staging: Consider NgxLoggerLevel.WARN for testing
     *
     * **Log Level Hierarchy:**
     * - TRACE: Most detailed, includes all events
     * - DEBUG: Detailed information for debugging (current setting)
     * - INFO: General application events
     * - WARN: Potential issues and recoverable errors
     * - ERROR: Critical errors requiring attention
     * - FATAL: System-level failures
     *
     * @example
     * ```typescript
     * // Logger injection and usage
     * constructor(private logger: NGXLogger) {}
     *
     * logUserAction(action: string): void {
     *   this.logger.info('User action performed', { action, timestamp: new Date() });
     * }
     *
     * logError(error: Error): void {
     *   this.logger.error('Application error', error);
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Environment-specific configuration example
     * const logLevel = environment.production
     *   ? NgxLoggerLevel.ERROR
     *   : NgxLoggerLevel.DEBUG;
     *
     * LoggerModule.forRoot({
     *   level: logLevel,
     *   enableSourceMaps: !environment.production
     * })
     * ```
     */
    importProvidersFrom(
      LoggerModule.forRoot({
        level: NgxLoggerLevel.DEBUG,
      })
    ),

    /**
     * HTTP client provider configuration.
     *
     * Configures the Angular HTTP client with interceptor support for
     * making HTTP requests throughout the application. Interceptors are
     * configured using the legacy DI pattern for maximum compatibility.
     *
     * @provider HttpClient
     * @config withInterceptorsFromDi - Legacy DI pattern for interceptor support
     * @features HTTP requests, interceptors, error handling
     *
     * @example
     * ```typescript
     * // HTTP client injection and usage
     * constructor(private http: HttpClient) {}
     *
     * loadProjectData(projectId: number): Observable<Project> {
     *   return this.http.get<Project>(`/api/projects/${projectId}`);
     * }
     *
     * saveProject(project: Project): Observable<Project> {
     *   return this.http.post<Project>('/api/projects', project);
     * }
     * ```
     */
    provideHttpClient(withInterceptorsFromDi()),
  ],
};

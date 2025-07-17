import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

/**
 * Application bootstrap entry point for the Rowguide pattern tracking application.
 *
 * This file serves as the main entry point for the Angular application, configuring
 * and initializing the root component with the application configuration using
 * Angular's standalone bootstrap pattern.
 *
 * @remarks
 * The bootstrap process follows Angular's modern standalone pattern, eliminating
 * the need for NgModule and providing a streamlined application startup. The
 * configuration includes all necessary providers for routing, animations, HTTP
 * client, and structured logging.
 *
 * @example
 * ```typescript
 * // Application startup with custom error handling
 * bootstrapApplication(AppComponent, appConfig)
 *   .then(() => {
 *     console.log('Rowguide application started successfully');
 *   })
 *   .catch((error) => {
 *     console.error('Failed to start Rowguide application:', error);
 *     // Custom error handling logic
 *   });
 * ```
 *
 * @example
 * ```typescript
 * // Bootstrap with additional providers
 * import { provideCustomService } from './custom-service';
 *
 * const extendedConfig = {
 *   providers: [
 *     ...appConfig.providers,
 *     provideCustomService()
 *   ]
 * };
 *
 * bootstrapApplication(AppComponent, extendedConfig);
 * ```
 *
 * @see {@link AppComponent} Root application component
 * @see {@link appConfig} Application configuration with providers
 * @see {@link https://angular.io/guide/standalone-components | Angular Standalone Components Guide}
 */
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

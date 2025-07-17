---
layout: page
title: Angular Build Configuration
permalink: /deployment/angular-configuration/
---

# Angular CLI Build Configuration

/**
 * Angular CLI build configuration for the Rowguide pattern tracking application.
 *
 * This configuration file defines the build process, asset handling, and environment-specific
 * settings for both development and production builds. It follows Angular's workspace
 * configuration format and includes specific optimizations for the Rowguide application.
 *
 * @remarks
 * The configuration includes specific settings for:
 * - Multi-platform builds (web, Electron, Android via Capacitor)
 * - PDF.js worker asset handling for pattern import functionality
 * - SCSS styling with Angular Material integration
 * - Bundle size budgets for performance optimization
 * - Source mapping for debugging support
 *
 * @example
 * ```bash
 * # Development build with source maps
 * ng build --configuration=development
 *
 * # Production build with optimization
 * ng build --configuration=production
 *
 * # Development server
 * ng serve --configuration=development
 * ```
 *
 * @example
 * ```bash
 * # Test runner configuration
 * ng test
 *
 * # Build with custom output path
 * ng build --output-path=./custom-dist
 * ```
 *
 * @see {@link https://angular.io/guide/workspace-config | Angular Workspace Configuration}
 * @see {@link https://angular.io/cli/build | Angular CLI Build Command}
 */

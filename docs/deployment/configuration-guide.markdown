---
layout: page
title: Configuration and Environment Guide
permalink: /deployment/configuration-guide/
---

# Rowguide Configuration and Environment Documentation

## Overview

The Rowguide application uses a streamlined configuration approach without traditional Angular environment files. Configuration is managed through three main areas:

1. **Build Configuration** (`angular.json`) - Build-time settings and asset handling
2. **Runtime Configuration** (`app.config.ts`) - Application providers and runtime settings
3. **Bootstrap Configuration** (`main.ts`) - Application initialization

## Build Configuration (angular.json)

### Development vs Production Builds

**Development Configuration:**
- Source maps enabled for debugging
- No optimization for faster builds
- License extraction disabled
- Optimized for development workflow

**Production Configuration:**
- Source maps enabled for debugging production issues
- Full optimization and tree-shaking
- Output hashing for cache busting
- Bundle size budgets enforced

### Asset Handling

**PDF.js Worker Integration:**
```json
{
  "glob": "pdf.worker.min.mjs",
  "input": "../../node_modules/pdfjs-dist/build",
  "output": "/assets"
}
```

**Material Design Theme:**
```json
"styles": [
  "@angular/material/prebuilt-themes/indigo-pink.css",
  "projects/rowguide/src/styles.scss"
]
```

### Bundle Size Budgets

**Initial Bundle:**
- Warning: 1MB
- Error: 2MB

**Component Styles:**
- Warning: 2KB
- Error: 4KB

### Multi-Platform Support

The configuration supports multiple deployment targets:
- **Web Application**: Standard Angular build
- **Electron Desktop**: Uses web build as input
- **Android (Capacitor)**: Uses web build with mobile optimizations

## Runtime Configuration (app.config.ts)

### Logging Configuration

**Development Settings:**
```typescript
LoggerModule.forRoot({
  level: NgxLoggerLevel.DEBUG
})
```

**Production Recommendations:**
- Use `NgxLoggerLevel.ERROR` for production
- Consider `NgxLoggerLevel.WARN` for staging
- Implement log level environment detection

### Provider Configuration

**Core Providers:**
- Router with application routes
- Animations with async loading
- HTTP client with interceptor support
- Structured logging with configurable levels

### Configuration Patterns

**Adding Environment-Specific Providers:**
```typescript
// Example: Adding environment-specific services
export const appConfig: ApplicationConfig = {
  providers: [
    ...appConfig.providers,
    // Add environment-specific providers
    environment.production ? [] : [
      provideDevToolsSupport(),
      provideDebugLogging()
    ]
  ]
};
```

## Environment Detection Patterns

### Build-Time Configuration

Since the application doesn't use traditional environment files, configuration is handled through:

1. **Angular CLI Build Configurations** - Different settings for development/production
2. **Runtime Detection** - Using browser capabilities and feature detection
3. **Provider Configuration** - Environment-specific service registration

### Runtime Environment Detection

**Browser Capabilities:**
```typescript
// Example: Feature detection for configuration
const hasIndexedDB = 'indexedDB' in window;
const hasServiceWorker = 'serviceWorker' in navigator;
const isElectron = (window as any).require !== undefined;
```

**Platform Detection:**
```typescript
// Example: Platform-specific configuration
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class PlatformConfigService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
```

## Configuration Best Practices

### 1. Centralized Configuration

**Configuration Service Pattern:**
```typescript
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly config = {
    logging: {
      level: this.getLogLevel(),
      enableConsole: this.isDevMode()
    },
    database: {
      name: 'rowguide',
      version: 1
    },
    features: {
      enableDebugPanel: this.isDevMode(),
      enableAnalytics: this.isProduction()
    }
  };

  private getLogLevel(): NgxLoggerLevel {
    return this.isDevMode() ? NgxLoggerLevel.DEBUG : NgxLoggerLevel.ERROR;
  }

  private isDevMode(): boolean {
    return !environment.production;
  }

  private isProduction(): boolean {
    return environment.production;
  }
}
```

### 2. Feature Flags

**Progressive Enhancement:**
```typescript
interface FeatureFlags {
  enableNewProjectWizard: boolean;
  enableAdvancedPatternAnalysis: boolean;
  enableOfflineSupport: boolean;
}

const featureFlags: FeatureFlags = {
  enableNewProjectWizard: true,
  enableAdvancedPatternAnalysis: false,
  enableOfflineSupport: this.hasServiceWorker
};
```

### 3. Configuration Validation

**Runtime Validation:**
```typescript
export function validateConfiguration(config: AppConfig): boolean {
  const required = ['database.name', 'logging.level'];
  return required.every(path =>
    path.split('.').reduce((obj, key) => obj?.[key], config) !== undefined
  );
}
```

## Debug and Development Settings

### Development Features

**Debug Panel Access:**
- Only available in development builds
- Provides state inspection and debugging tools
- Accessible through browser developer tools

**Logging Levels:**
- `DEBUG`: All application events and state changes
- `INFO`: Important application events
- `WARN`: Potential issues and recoverable errors
- `ERROR`: Critical errors requiring attention

### Production Optimizations

**Bundle Optimization:**
- Tree-shaking removes unused code
- Minification reduces file sizes
- Source maps available for debugging

**Performance Monitoring:**
- Bundle size budgets prevent performance regression
- Source map support for production debugging
- Error tracking integration ready

## Migration from Environment Files

If you need to add traditional environment files:

1. **Create environment files:**
   ```bash
   mkdir src/environments
   touch src/environments/environment.ts
   touch src/environments/environment.prod.ts
   ```

2. **Update angular.json:**
   ```json
   "configurations": {
     "production": {
       "fileReplacements": [
         {
           "replace": "src/environments/environment.ts",
           "with": "src/environments/environment.prod.ts"
         }
       ]
     }
   }
   ```

3. **Update app.config.ts:**
   ```typescript
   import { environment } from '../environments/environment';

   LoggerModule.forRoot({
     level: environment.production ? NgxLoggerLevel.ERROR : NgxLoggerLevel.DEBUG
   })
   ```

This configuration approach provides flexibility while maintaining simplicity for the current application needs.

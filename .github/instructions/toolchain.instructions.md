---
applyTo: "**"
---

# Rowguide Development Toolchain Guide

**Rowguide** is a sophisticated Angular 20+ pattern tracking application with multi-platform deployment (web, Electron desktop, Android via Capacitor). The project uses a **yarn workspace monorepo** structure.

## Monorepo Structure

```
rowguide/                           # Root monorepo
├── packages/rowguide/              # Angular app (primary workspace)
├── packages/electron/              # Electron desktop wrapper
├── android/                        # Capacitor Android build
└── docs/                          # GitHub Pages documentation
```

### Primary Workflows (use yarn workspace commands)

```bash
# Development server (Angular)
yarn run start                     # Starts dev server at localhost:4200

# Build and run platforms
yarn electron:start                # Launch Electron desktop app
yarn electron:build               # Build Electron app for Linux
yarn capacitor:assembleDebug      # Build Android APK

# Testing
yarn workspace rowguide test      # Run Angular unit tests via Karma
```

### Angular CLI Commands (from packages/rowguide/)

```bash
# Component generation (use full workspace command)
yarn workspace rowguide run ng generate component component-name

# Preferred directory structure for new components:
yarn workspace rowguide run ng generate component features/[domain]/components/[component-name]
```

## Critical Dependencies & Tools

### Core Stack

- **Angular 20.0.6**: Latest with standalone components pattern
- **Angular Material 20.0.5**: UI component library
- **Yarn 4.9.2**: Package manager (configured with workspaces)
- **TypeScript 5.8.3**: Strict type checking enabled
- **RxJS 7.8.0**: Reactive programming patterns

### Platform Tools

- **Capacitor 7.0.0**: Native mobile deployment
- **Electron 37.2.0**: Desktop application wrapper
- **PDF.js 4.10.38**: PDF pattern import functionality
- **IndexedDB**: Client-side data persistence via `idb` library

### Build & Test Tools

- **Angular CLI 20.0.5**: Build system and dev tools
- **Karma**: Unit test runner
- **ngx-logger**: Structured logging with levels

## Platform-Specific Build Requirements

### Multi-Platform Build Sequence

- **Web build**: `yarn workspace rowguide build` → `dist/rowguide/`
- **Electron**: Requires web build first, then `yarn workspace rowguide-electron build`
- **Android**: Requires web build + `npx cap sync` before Gradle commands

### Asset Management

- **PDF.js worker**: Automatically copied to `/assets/` during build
- **Angular Material theme**: Uses `indigo-pink` prebuilt theme
- **SCSS**: Project uses SCSS for styling (not plain CSS)

## Testing Tools

- **Unit tests**: All services must have `.spec.ts` files
- **Test location**: Co-located with source files
- **Test runner**: Use `yarn workspace rowguide test --browsers=ChromeHeadless` for Karma-based testing
- **Headless mode**: Default for AI agents - runs tests without opening browser window
- **Headed mode**: Use `yarn workspace rowguide test` if browser debugging is needed
- **Watch mode**: Use `yarn workspace rowguide test --watch --browsers=ChromeHeadless` for continuous testing

## Build Verification Commands

- Run `yarn run start` to verify web build works
- Check that tests pass with `yarn workspace rowguide test`
- Verify TypeScript compilation with no errors

## Key Configuration Files

- **`packages/rowguide/angular.json`**: Build configuration and asset handling
- **`capacitor.config.ts`**: Mobile platform configuration
- **`package.json`**: Workspace configuration and script definitions

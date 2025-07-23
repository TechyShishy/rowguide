---
applyTo: "**"
---

# Rowguide Development Toolchain - LLM Agent Instructions

## Project Structure
**Angular 20+ monorepo** with multi-platform deployment (web, Electron, Android). Use **yarn workspace** commands.

```
rowguide/
├── packages/rowguide/              # Main Angular app
├── packages/electron/              # Desktop wrapper  
├── android/                        # Mobile build
└── docs/                          # Documentation
```

## Essential Commands

### Development & Testing
```bash
# NEVER start dev server - always already running
yarn workspace rowguide test --browsers=ChromeHeadless --watch=false

# Component generation
yarn workspace rowguide run ng generate component features/[domain]/components/[name]
```

### Platform Builds (require web build first)
```bash
yarn workspace rowguide build      # Web → dist/rowguide/
yarn electron:start               # Desktop app
yarn capacitor:assembleDebug      # Android APK
```

## Key Dependencies
- **Angular 20.0.6** + **Angular Material 20.0.5** (standalone components)
- **TypeScript 5.8.3** (strict mode), **RxJS 7.8.0**, **Yarn 4.9.2**
- **Capacitor 7.0.0**, **Electron 37.2.0**, **PDF.js 4.10.38**
- **IndexedDB** via `idb`, **Karma** testing, **ngx-logger**

## LLM Agent Guidelines

### File Operations
- **Test files**: Co-locate `.spec.ts` with source files
- **Styling**: Use SCSS (not CSS)
- **Assets**: PDF.js worker auto-copies to `/assets/`

### Testing Protocol
1. **NEVER start dev server** (already running)
2. **Always run tests** before completion: `yarn workspace rowguide test`
3. **Ask user to test** builds instead of starting servers
4. **100% test pass rate** required before code changes complete

### Build Dependencies
- **Android/Electron**: Require web build + `npx cap sync` first
- **TypeScript**: Must compile without errors
- **Configuration files**: `angular.json`, `capacitor.config.ts`, `package.json`

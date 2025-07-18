---
layout: default
title: Architecture Guide
permalink: /architecture/
---

# 🏗️ Rowguide Architecture Guide

This section contains comprehensive documentation about the Rowguide application architecture, design patterns, and technical decisions.

## Architecture Overview

Rowguide follows a modern Angular architecture with:

- **Domain-Driven Design**: Clean separation between core business logic and infrastructure
- **Reactive Programming**: Extensive use of RxJS for state management and data flow
- **Component-Based Architecture**: Modular, reusable components with clear responsibilities
- **Null Safety**: Comprehensive type guards and safe access patterns

## Documentation Sections

### Core Architecture

- [Component Patterns]({{ site.baseurl }}/architecture/component-patterns)
- [Error Recovery Patterns]({{ site.baseurl }}/architecture/error-recovery-patterns)
- [Performance Optimization]({{ site.baseurl }}/architecture/performance-optimization)

### System Design

- [Migration System]({{ site.baseurl }}/architecture/migration-system)
- [Accessibility Guidelines]({{ site.baseurl }}/architecture/accessibility-guidelines)

### Technical References

- [API Documentation]({{ site.baseurl }}/api/portal.html) - Complete TypeScript API reference
- [Code Examples]({{ site.baseurl }}/code-examples/) - Working implementation examples
- [Implementation Status]({{ site.baseurl }}/implementation-checklist) - Current development progress

## Key Design Principles

1. **Null Safety First**: All data access uses type guards and safe factories
2. **Error Boundaries**: Comprehensive error handling with recovery strategies
3. **Performance Optimized**: OnPush change detection, virtual scrolling, and memoization
4. **Accessibility**: WCAG 2.1 AAA compliance with ARIA support
5. **Testability**: 95%+ unit test coverage with integration tests

## Contributing

When working on the architecture:

1. Follow the established patterns documented in these guides
2. Add comprehensive documentation for new patterns
3. Ensure all changes maintain backward compatibility
4. Update architectural decision records (ADRs) for major changes

---

_Last updated: {{ 'now' | date: '%B %d, %Y' }}_

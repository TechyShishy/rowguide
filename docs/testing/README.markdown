---
layout: page
title: Testing Documentation
permalink: /testing/
---

# Testing Documentation

Comprehensive testing strategies, patterns, and infrastructure documentation for the Rowguide application.

## Available Documentation

### 🧪 [Testing Strategy](testing-strategy.markdown)

Advanced testing patterns and infrastructure including:

- Test data management and builders
- Service testing with mocks and spies
- Component testing with reactive patterns
- Integration testing strategies
- Utilities testing patterns
- Performance testing approaches

## Testing Philosophy

The Rowguide application follows a comprehensive testing approach:

- **Unit Tests**: Test individual components and services in isolation
- **Integration Tests**: Test service interactions and data flow
- **Component Tests**: Test component behavior and user interactions
- **E2E Tests**: Test complete user workflows
- **Accessibility Tests**: Ensure WCAG compliance

## Test Coverage Goals

- **Minimum Coverage**: 85% line coverage
- **Service Coverage**: 95% for critical services
- **Component Coverage**: 90% for complex components
- **Utilities Coverage**: 100% for type guards and helpers

## Testing Tools and Frameworks

### Core Testing Stack

- **Karma**: Test runner for unit and component tests
- **Jasmine**: Testing framework and assertion library
- **Angular Testing Utilities**: TestBed, ComponentFixture, etc.
- **ChromeHeadless**: Browser environment for testing

### Testing Utilities

- **MockProject**: Test data generation
- **TestDataBuilder**: Advanced test data creation
- **ServiceMocks**: Mocked service implementations
- **ComponentTestHelpers**: Reusable testing utilities

## Running Tests

```bash
# Run all tests
yarn workspace rowguide test

# Run tests in headless mode (CI)
yarn workspace rowguide test --browsers=ChromeHeadless --watch=false

# Run tests with coverage
yarn workspace rowguide test --code-coverage

# Run specific test files
yarn workspace rowguide test --include="**/data-integrity.service.spec.ts"
```

## Test Organization

```
packages/rowguide/src/
├── app/
│   ├── services/
│   │   ├── data-integrity.service.spec.ts
│   │   ├── error-handler.service.spec.ts
│   │   └── reactive-state-store.service.spec.ts
│   ├── components/
│   │   ├── project/project.component.spec.ts
│   │   └── step/step.component.spec.ts
│   └── utilities/
│       ├── type-guards.spec.ts
│       └── model-factory.spec.ts
```

## Related Documentation

- [Developer Guides](../guides/) - Development workflow including testing
- [Architecture Documentation](../architecture/) - Testing architectural decisions
- [API Documentation](../api/) - Generated API reference with comprehensive JSDoc examples

---

_Testing documentation is maintained alongside the Rowguide codebase and should be updated as testing strategies evolve._

# Rowguide E2E Testing with Playwright

This directory contains end-to-end (E2E) tests for the Rowguide application using Playwright.

## 📁 Directory Structure

```
tests/e2e/
├── config/              # Global setup and teardown
│   ├── global-setup.ts
│   └── global-teardown.ts
├── fixtures/            # Test fixtures and custom utilities
│   └── test-fixtures.ts
├── page-objects/        # Page Object Model implementations
│   ├── base-page.ts
│   ├── main-page.ts
│   └── project-page.ts
├── specs/              # Test specifications
│   ├── main-app.spec.ts
│   ├── project-management.spec.ts
│   └── performance-accessibility.spec.ts
└── utils/              # Testing utilities and helpers
    └── test-helpers.ts
```

## 🚀 Getting Started

### Prerequisites

1. **Install Playwright dependencies:**
   ```bash
   yarn workspace rowguide add -D @playwright/test
   yarn workspace rowguide exec playwright install
   ```

2. **Ensure the development server is running:**
   ```bash
   yarn start  # This should start the Angular dev server on http://localhost:4200
   ```

### Running Tests

```bash
# Run all E2E tests
yarn workspace rowguide test:e2e

# Run tests in headed mode (see browser)
yarn workspace rowguide test:e2e:headed

# Run specific test file
yarn workspace rowguide test:e2e tests/e2e/specs/main-app.spec.ts

# Run tests in specific browser
yarn workspace rowguide test:e2e --project=chromium

# Run tests in debug mode
yarn workspace rowguide test:e2e --debug
```

### Viewing Test Reports

```bash
# Open HTML test report
yarn workspace rowguide exec playwright show-report
```

## 🏗️ Architecture

### Page Object Model

We use the Page Object Model (POM) pattern to maintain clean, reusable test code:

- **BasePage**: Common functionality for all pages
- **MainPage**: Main navigation and layout interactions
- **ProjectPage**: Project management functionality
- **Custom Page Objects**: Add more as needed for specific features

### Test Fixtures

Custom fixtures provide:
- Pre-configured page objects
- Automatic database cleanup
- Test data factories
- Common utilities

### Test Organization

Tests are organized by feature:
- **main-app.spec.ts**: Core application functionality
- **project-management.spec.ts**: Project CRUD operations
- **performance-accessibility.spec.ts**: Performance and accessibility validation

## 📝 Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ mainPage }) => {
    await mainPage.goto();
  });

  test('should do something', async ({ mainPage, projectPage }) => {
    // Test implementation
    await mainPage.navigateToProjects();
    await projectPage.verifyPageLoaded();
    
    // Assertions
    expect(projectPage.getCurrentUrl()).toContain('/projects');
  });
});
```

### Using Test Data

```typescript
test('should create project', async ({ projectPage, testData }) => {
  const projectData = testData.createProjectData();
  await projectPage.createProject(projectData.name, projectData.description);
  await projectPage.verifyProjectExists(projectData.name);
});
```

### Best Practices

1. **Use Angular Material and semantic selectors** for reliable element selection:
   ```typescript
   // Angular Material component selectors
   private readonly accordion = this.page.locator('mat-accordion');
   private readonly importPanel = this.page.locator('mat-expansion-panel').first();
   
   // Form control selectors
   private readonly toggle = this.page.locator('mat-slide-toggle[formcontrolname="combine12"]');
   
   // Semantic selectors with text content
   private readonly importButton = this.page.locator('button').filter({ hasText: 'Import File' });
   ```

2. **Wait for Angular to stabilize:**
   ```typescript
   await page.waitForAngular();
   ```

3. **Use page objects** instead of direct page interactions:
   ```typescript
   // Good
   await projectPage.createProject(name);
   
   // Avoid
   await page.click('button:has-text("Create")');
   ```

4. **Clean state between tests:**
   ```typescript
   // The page fixture handles this automatically with context recreation
   ```

## 🎯 Test Categories

### Functional Tests
- User workflows and feature interactions
- Data persistence and state management
- Navigation and routing

### Performance Tests
- Page load times
- Memory usage monitoring
- Large dataset handling

### Accessibility Tests
- Keyboard navigation
- ARIA attributes
- Screen reader compatibility

### Cross-browser Tests
- Chrome, Firefox, Safari, Edge
- Mobile browsers (Chrome Mobile, Safari Mobile)

## 🔧 Configuration

### Playwright Configuration

Key configuration options in `playwright.config.ts`:

- **Parallel execution**: Tests run in parallel for speed
- **Multiple browsers**: Chromium, Firefox, WebKit support
- **Screenshots/Videos**: Captured on failure for debugging
- **Base URL**: Points to local development server
- **Timeouts**: Configured for Angular application needs

### Environment Variables

Set these environment variables for different configurations:

```bash
# CI environment detection
CI=true

# Custom base URL
PLAYWRIGHT_BASE_URL=http://localhost:4200
```

## 🐛 Debugging

### Debug Mode
```bash
yarn workspace rowguide test:e2e --debug
```

### Screenshots and Videos
- Screenshots are captured on test failures
- Videos are recorded for failed tests
- Traces are available for retry attempts

### VS Code Extension
Install the Playwright VS Code extension for integrated debugging.

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install Playwright
  run: yarn workspace rowguide exec playwright install --with-deps

- name: Run E2E tests
  run: yarn workspace rowguide test:e2e
  env:
    CI: true

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: playwright-report
    path: packages/rowguide/playwright-report/
```

## 📊 Metrics and Reporting

### Test Reports
- HTML reports with detailed test results
- JSON reports for programmatic analysis
- JUnit XML for CI/CD integration

### Performance Metrics
- Page load times
- Memory usage tracking
- Core Web Vitals monitoring

### Coverage Tracking
- E2E test coverage of critical user journeys
- Feature coverage reporting

## 🔄 Maintenance

### Adding New Tests

1. **Create page objects** for new features
2. **Add test specifications** following existing patterns
3. **Update fixtures** if new utilities are needed
4. **Document test scenarios** and expected behaviors

### Updating Selectors

When UI changes, update selectors in page objects:
- Use Angular Material component selectors (e.g., `mat-accordion`, `mat-expansion-panel`)
- Leverage form control attributes (e.g., `[formcontrolname="fieldName"]`)
- Use semantic selectors with text content when appropriate (e.g., `button:has-text("Import File")`)
- Keep selectors maintainable and readable

### Performance Baselines

Update performance thresholds as the application evolves:
- Monitor Core Web Vitals
- Adjust memory usage limits
- Update load time expectations

## 🤝 Contributing

1. Follow the existing patterns and structure
2. Add appropriate test coverage for new features
3. Update documentation when adding new capabilities
4. Ensure tests pass in all supported browsers

---

For questions or issues with E2E testing, please refer to the [Playwright documentation](https://playwright.dev/) or create an issue in the project repository.

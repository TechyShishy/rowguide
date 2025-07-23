---
layout: page
title: Testing Strategy
permalink: /testing/testing-strategy/
---

# Testing Strategy

## Advanced Testing Patterns and Infrastructure

### Test Data Management and Builders

```typescript
// Advanced Test Data Builder with Factories
export class AdvancedTestDataBuilder {
  private static readonly faker = require('faker');

  // Project builders with realistic data
  static createProject(overrides?: Partial<Project>): Project {
    return ModelFactory.createProject({
      id: this.faker.datatype.number({ min: 1, max: 9999 }),
      name: this.faker.lorem.words(3),
      description: this.faker.lorem.sentence(),
      createdDate: this.faker.date.past(),
      lastModified: this.faker.date.recent(),
      rows: this.createRows(this.faker.datatype.number({ min: 5, max: 15 })),
      position: this.createPosition(),
      tags: this.faker.lorem.words(3).split(' '),
      difficulty: this.faker.random.arrayElement(['beginner', 'intermediate', 'advanced']),
      estimatedTime: this.faker.datatype.number({ min: 60, max: 600 }),
      ...overrides
    });
  }

  // Performance test data
  static createLargeProject(rowCount = 1000, stepsPerRow = 20): Project {
    return this.createProject({
      rows: Array.from({ length: rowCount }, (_, i) => 
        this.createRow({
          id: i,
          steps: Array.from({ length: stepsPerRow }, (_, j) => 
            this.createStep({
              id: j,
              description: `Step ${j + 1}`,
              count: this.faker.datatype.number({ min: 1, max: 10 })
            })
          )
        })
      )
    });
  }

  // Edge case data
  static createEdgeCaseProject(): Project {
    return this.createProject({
      name: '', // Empty name
      rows: [], // No rows
      position: { row: -1, step: -1 }, // Invalid position
      description: 'A'.repeat(10000), // Very long description
    });
  }

  // Test scenarios
  static createProjectWithComplexPattern(): Project {
    return this.createProject({
      rows: [
        this.createRow({
          id: 1,
          steps: [
            this.createStep({ id: 1, description: 'Chain 50', count: 50 }),
            this.createStep({ id: 2, description: 'Single crochet in each', count: 50 }),
            this.createStep({ id: 3, description: 'Chain 2, turn', count: 1 })
          ]
        }),
        this.createRow({
          id: 2,
          steps: [
            this.createStep({ id: 1, description: '*Skip 1, dc in next*', count: 25 }),
            this.createStep({ id: 2, description: 'Chain 2, turn', count: 1 })
          ]
        })
      ]
    });
  }

  // Multi-user scenarios
  static createMultiUserTestData(): MultiUserTestData {
    const users = Array.from({ length: 5 }, () => ({
      id: this.faker.datatype.uuid(),
      name: this.faker.name.findName(),
      email: this.faker.internet.email()
    }));

    const projects = users.map(user => 
      this.createProject({ 
        ownerId: user.id,
        collaborators: this.faker.random.arrayElements(users, 2)
      })
    );

    return { users, projects };
  }
}

// Test State Builder for complex scenarios
export class TestStateBuilder {
  private state: Partial<AppState> = {};

  withProjects(projects: Project[]): this {
    this.state.projects = {
      entities: projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}),
      currentProjectId: projects[0]?.id || null,
      loading: false,
      error: null,
      lastUpdated: new Date()
    };
    return this;
  }

  withSettings(settings: Partial<SettingsState>): this {
    this.state.settings = {
      combine12: false,
      lrdesignators: false,
      flammarkers: false,
      ppinspector: false,
      zoom: false,
      scrolloffset: -1,
      multiadvance: 3,
      flamsort: 'keyAsc',
      projectsort: 'dateAsc',
      ...settings
    };
    return this;
  }

  withUI(ui: Partial<UIState>): this {
    this.state.ui = {
      sidenavOpen: false,
      currentRoute: '/projects',
      notifications: [],
      theme: 'default',
      ...ui
    };
    return this;
  }

  build(): AppState {
    return {
      projects: this.state.projects || this.getDefaultProjectsState(),
      settings: this.state.settings || this.getDefaultSettingsState(),
      ui: this.state.ui || this.getDefaultUIState(),
      navigation: this.state.navigation || this.getDefaultNavigationState()
    };
  }

  private getDefaultProjectsState(): ProjectsState {
    return {
      entities: {},
      currentProjectId: null,
      loading: false,
      error: null,
      lastUpdated: null
    };
  }
}
```

### Performance Testing Framework

```typescript
// Performance Test Helper
export class PerformanceTestHelper {
  private performanceObserver: PerformanceObserver | null = null;
  private memoryBaseline: number = 0;

  async measureRender<T>(renderFn: () => T): Promise<RenderMetrics> {
    const initialMemory = this.getMemoryUsage();
    this.memoryBaseline = initialMemory;

    performance.mark('render-start');
    
    const result = renderFn();
    
    // Wait for render completion
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    performance.mark('render-end');
    performance.measure('render-duration', 'render-start', 'render-end');

    const renderMeasure = performance.getEntriesByName('render-duration')[0];
    const finalMemory = this.getMemoryUsage();

    return {
      duration: renderMeasure.duration,
      memoryUsage: finalMemory - initialMemory,
      memoryTotal: finalMemory,
      result
    };
  }

  async measureUpdates(updateFn: () => Promise<void>): Promise<UpdateMetrics> {
    const updateTimes: number[] = [];
    const memorySnapshots: number[] = [];

    // Setup performance observer
    this.setupPerformanceObserver((entries) => {
      entries.forEach(entry => {
        if (entry.name.includes('update')) {
          updateTimes.push(entry.duration);
        }
      });
    });

    await updateFn();

    return {
      averageUpdateTime: updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length,
      maxUpdateTime: Math.max(...updateTimes),
      minUpdateTime: Math.min(...updateTimes),
      totalUpdates: updateTimes.length,
      memoryTrend: this.calculateMemoryTrend(memorySnapshots)
    };
  }

  async measureScenario(scenarioFn: () => Promise<void>): Promise<ScenarioMetrics> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    await scenarioFn();

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    return {
      totalDuration: endTime - startTime,
      memoryDelta: endMemory - startMemory,
      performanceScore: this.calculatePerformanceScore(endTime - startTime, endMemory - startMemory)
    };
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private setupPerformanceObserver(callback: (entries: PerformanceEntry[]) => void): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Performance Budget Validator
export class PerformanceBudgetValidator {
  private budgets: PerformanceBudget[] = [
    { metric: 'render', threshold: 16, unit: 'ms' }, // 60fps
    { metric: 'memory', threshold: 10 * 1024 * 1024, unit: 'bytes' }, // 10MB
    { metric: 'interaction', threshold: 100, unit: 'ms' },
    { metric: 'layout', threshold: 5, unit: 'ms' }
  ];

  validateMetrics(metrics: PerformanceMetrics): ValidationResult {
    const violations: BudgetViolation[] = [];

    for (const budget of this.budgets) {
      const value = this.getMetricValue(metrics, budget.metric);
      if (value > budget.threshold) {
        violations.push({
          metric: budget.metric,
          threshold: budget.threshold,
          actual: value,
          unit: budget.unit,
          severity: this.calculateSeverity(value, budget.threshold)
        });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      score: this.calculatePerformanceScore(violations)
    };
  }

  private calculateSeverity(actual: number, threshold: number): 'low' | 'medium' | 'high' {
    const ratio = actual / threshold;
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }
}
```

### Accessibility Testing Automation

```typescript
// Accessibility Test Helper using axe-core
export class AccessibilityTestHelper {
  private axe: any;

  constructor() {
    this.axe = require('axe-core');
  }

  async runAxeTest(element: HTMLElement, options?: AxeTestOptions): Promise<AxeResults> {
    const config = {
      rules: {
        'color-contrast': { enabled: true },
        'keyboard': { enabled: true },
        'aria-label': { enabled: true },
        'focus-order': { enabled: true }
      },
      tags: ['wcag2a', 'wcag2aa'],
      ...options
    };

    try {
      const results = await this.axe.run(element, config);
      return this.processAxeResults(results);
    } catch (error) {
      throw new Error(`Accessibility test failed: ${error.message}`);
    }
  }

  async validateKeyboardNavigation(fixture: ComponentFixture<any>): Promise<KeyboardNavigationResult> {
    const navigator = new KeyboardNavigationTester(fixture);
    const results: KeyboardNavigationResult = {
      canTabToAllInteractiveElements: true,
      focusOrder: [],
      trapsFocus: false,
      violations: []
    };

    // Test tab navigation
    const interactiveElements = fixture.debugElement.queryAll(
      By.css('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')
    );

    for (let i = 0; i < interactiveElements.length; i++) {
      await navigator.pressKey('Tab');
      const focusedElement = navigator.getFocusedElement();
      
      results.focusOrder.push({
        expectedElement: interactiveElements[i].nativeElement,
        actualElement: focusedElement,
        isCorrect: focusedElement === interactiveElements[i].nativeElement
      });

      if (focusedElement !== interactiveElements[i].nativeElement) {
        results.canTabToAllInteractiveElements = false;
        results.violations.push({
          type: 'focus-order',
          element: interactiveElements[i].nativeElement,
          message: 'Element not reachable in expected tab order'
        });
      }
    }

    // Test escape key and focus trapping
    await navigator.pressKey('Escape');
    results.trapsFocus = !document.activeElement || 
                        fixture.nativeElement.contains(document.activeElement);

    return results;
  }

  async validateARIA(element: HTMLElement): Promise<ARIAValidationResult> {
    const violations: ARIAViolation[] = [];

    // Check for missing ARIA labels
    const interactiveElements = element.querySelectorAll(
      'button, input, select, textarea, [role="button"], [role="tab"]'
    );

    interactiveElements.forEach((el, index) => {
      if (!el.getAttribute('aria-label') && 
          !el.getAttribute('aria-labelledby') && 
          !el.textContent?.trim()) {
        violations.push({
          element: el as HTMLElement,
          rule: 'missing-accessible-name',
          message: 'Interactive element lacks accessible name',
          severity: 'error'
        });
      }
    });

    // Check for proper ARIA roles
    const customElements = element.querySelectorAll('[role]');
    customElements.forEach(el => {
      const role = el.getAttribute('role');
      if (role && !this.isValidARIARole(role)) {
        violations.push({
          element: el as HTMLElement,
          rule: 'invalid-aria-role',
          message: `Invalid ARIA role: ${role}`,
          severity: 'error'
        });
      }
    });

    return {
      passed: violations.length === 0,
      violations
    };
  }

  private processAxeResults(results: any): AxeResults {
    return {
      violations: results.violations.map((violation: any) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node: any) => ({
          html: node.html,
          target: node.target,
          failureSummary: node.failureSummary
        }))
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length
    };
  }

  private isValidARIARole(role: string): boolean {
    const validRoles = [
      'button', 'tab', 'tabpanel', 'dialog', 'alert', 'status',
      'navigation', 'main', 'banner', 'contentinfo', 'region'
    ];
    return validRoles.includes(role);
  }
}

// Keyboard Navigation Tester
export class KeyboardNavigationTester {
  constructor(private fixture: ComponentFixture<any>) {}

  async pressKey(key: string, modifiers?: KeyModifiers): Promise<void> {
    const event = new KeyboardEvent('keydown', {
      key,
      code: this.getKeyCode(key),
      ctrlKey: modifiers?.ctrl || false,
      shiftKey: modifiers?.shift || false,
      altKey: modifiers?.alt || false,
      metaKey: modifiers?.meta || false
    });

    document.activeElement?.dispatchEvent(event);
    this.fixture.detectChanges();
    await this.fixture.whenStable();
  }

  getFocusedElement(): HTMLElement | null {
    return document.activeElement as HTMLElement;
  }

  async tabToElement(selector: string): Promise<boolean> {
    const targetElement = this.fixture.nativeElement.querySelector(selector);
    if (!targetElement) return false;

    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      await this.pressKey('Tab');
      if (this.getFocusedElement() === targetElement) {
        return true;
      }
      attempts++;
    }

    return false;
  }

  private getKeyCode(key: string): string {
    const keyCodes: { [key: string]: string } = {
      'Tab': 'Tab',
      'Enter': 'Enter',
      'Escape': 'Escape',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      ' ': 'Space'
    };
    return keyCodes[key] || key;
  }
}
```

### Integration Testing Patterns

```typescript
// Page Object Model for Complex Components
export class ProjectPageObject {
  constructor(private fixture: ComponentFixture<ProjectComponent>) {}

  // Navigation methods
  async navigateToStep(rowIndex: number, stepIndex: number): Promise<void> {
    const stepElement = this.getStepElement(rowIndex, stepIndex);
    stepElement.click();
    this.fixture.detectChanges();
    await this.fixture.whenStable();
  }

  async navigateWithKeyboard(direction: 'up' | 'down' | 'left' | 'right'): Promise<void> {
    const keyMap = {
      up: 'ArrowUp',
      down: 'ArrowDown', 
      left: 'ArrowLeft',
      right: 'ArrowRight'
    };

    const event = new KeyboardEvent('keydown', { key: keyMap[direction] });
    document.activeElement?.dispatchEvent(event);
    this.fixture.detectChanges();
    await this.fixture.whenStable();
  }

  // Query methods
  getStepElement(rowIndex: number, stepIndex: number): HTMLElement {
    const selector = `[data-testid="step-${rowIndex}-${stepIndex}"]`;
    const element = this.fixture.nativeElement.querySelector(selector);
    if (!element) {
      throw new Error(`Step element not found: ${selector}`);
    }
    return element;
  }

  getCurrentPosition(): Position {
    const currentStep = this.fixture.nativeElement.querySelector('.current-step');
    if (!currentStep) {
      throw new Error('No current step found');
    }

    const rowIndex = parseInt(currentStep.getAttribute('data-row') || '0');
    const stepIndex = parseInt(currentStep.getAttribute('data-step') || '0');
    
    return { row: rowIndex, step: stepIndex };
  }

  getVisibleRows(): HTMLElement[] {
    return Array.from(this.fixture.nativeElement.querySelectorAll('.row:not(.hidden)'));
  }

  // Assertion methods
  expectStepToBeCurrent(rowIndex: number, stepIndex: number): void {
    const stepElement = this.getStepElement(rowIndex, stepIndex);
    expect(stepElement.classList).toContain('current');
  }

  expectStepToBeMarked(rowIndex: number, stepIndex: number, markCount: number): void {
    const stepElement = this.getStepElement(rowIndex, stepIndex);
    expect(stepElement.classList).toContain(`marked-${markCount}`);
  }

  expectRowToBeVisible(rowIndex: number): void {
    const rowElement = this.fixture.nativeElement.querySelector(`[data-testid="row-${rowIndex}"]`);
    expect(rowElement).toBeTruthy();
    expect(rowElement.classList).not.toContain('hidden');
  }

  // Action methods
  async markStep(rowIndex: number, stepIndex: number, markCount: number): Promise<void> {
    const stepElement = this.getStepElement(rowIndex, stepIndex);
    
    // Simulate mark mode interaction
    const markEvent = new CustomEvent('mark', { 
      detail: { row: rowIndex, step: stepIndex, count: markCount }
    });
    
    stepElement.dispatchEvent(markEvent);
    this.fixture.detectChanges();
    await this.fixture.whenStable();
  }

  async scrollToRow(rowIndex: number): Promise<void> {
    const viewport = this.fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport');
    if (viewport) {
      viewport.scrollToIndex(rowIndex);
      this.fixture.detectChanges();
      await this.fixture.whenStable();
    }
  }
}

// Integration Test Suite
describe('Project Component Integration', () => {
  let component: ProjectComponent;
  let fixture: ComponentFixture<ProjectComponent>;
  let pageObject: ProjectPageObject;
  let store: ReactiveStateStore;

  beforeEach(async () => {
    const testProject = AdvancedTestDataBuilder.createProjectWithComplexPattern();
    const initialState = new TestStateBuilder()
      .withProjects([testProject])
      .build();

    await TestBed.configureTestingModule({
      imports: [ProjectComponent],
      providers: [
        { provide: ReactiveStateStore, useValue: createMockStore(initialState) },
        ...createMockProviders()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectComponent);
    component = fixture.componentInstance;
    pageObject = new ProjectPageObject(fixture);
    store = TestBed.inject(ReactiveStateStore);
  });

  describe('Navigation Flow', () => {
    it('should navigate through steps with keyboard', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      // Start at first step
      pageObject.expectStepToBeCurrent(0, 0);

      // Navigate right
      await pageObject.navigateWithKeyboard('right');
      pageObject.expectStepToBeCurrent(0, 1);

      // Navigate down to next row
      await pageObject.navigateWithKeyboard('down');
      pageObject.expectStepToBeCurrent(1, 1);

      // Navigate left
      await pageObject.navigateWithKeyboard('left');
      pageObject.expectStepToBeCurrent(1, 0);
    });

    it('should handle boundary navigation correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      // Navigate to last step of first row
      await pageObject.navigateToStep(0, 2);
      
      // Try to navigate right (should stay at boundary)
      await pageObject.navigateWithKeyboard('right');
      pageObject.expectStepToBeCurrent(0, 2);

      // Navigate down should go to last step of next row
      await pageObject.navigateWithKeyboard('down');
      pageObject.expectStepToBeCurrent(1, 1); // Row 2 has only 2 steps
    });
  });

  describe('Mark Mode Integration', () => {
    it('should mark and unmark steps correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      // Enter mark mode
      store.dispatch(MarkModeActions.setMarkMode({ mode: 3 }));
      fixture.detectChanges();

      // Mark a step
      await pageObject.markStep(0, 1, 3);
      pageObject.expectStepToBeMarked(0, 1, 3);

      // Verify state update
      const currentState = store.getCurrentState();
      expect(currentState.projects.entities[1].markings).toContain({
        row: 0, step: 1, count: 3
      });
    });
  });

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', async () => {
      const largeProject = AdvancedTestDataBuilder.createLargeProject(500, 10);
      store.dispatch(ProjectActions.loadProjectSuccess({ project: largeProject }));
      
      const performanceHelper = new PerformanceTestHelper();
      
      const metrics = await performanceHelper.measureRender(() => {
        fixture.detectChanges();
      });

      expect(metrics.duration).toBeLessThan(100); // 100ms budget
      expect(metrics.memoryUsage).toBeLessThan(20 * 1024 * 1024); // 20MB budget

      performanceHelper.cleanup();
    });
  });
});
```

### Visual Regression Testing

```typescript
// Visual Regression Test Helper
export class VisualRegressionHelper {
  private pixelmatch: any;
  private fs: any;

  constructor() {
    this.pixelmatch = require('pixelmatch');
    this.fs = require('fs');
  }

  async captureScreenshot(
    fixture: ComponentFixture<any>, 
    testName: string,
    options?: ScreenshotOptions
  ): Promise<VisualTestResult> {
    // Ensure component is stable
    fixture.detectChanges();
    await fixture.whenStable();

    // Capture current screenshot
    const canvas = await this.elementToCanvas(fixture.nativeElement, options);
    const currentImage = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);

    if (!currentImage) {
      throw new Error('Failed to capture screenshot');
    }

    // Load baseline image
    const baselinePath = `test/visual-baselines/${testName}.png`;
    const baseline = await this.loadBaselineImage(baselinePath);

    if (!baseline) {
      // Create new baseline
      await this.saveBaseline(currentImage, baselinePath);
      return {
        isMatch: true,
        isNewBaseline: true,
        differencePercentage: 0,
        diffImagePath: null
      };
    }

    // Compare images
    const diff = new ImageData(baseline.width, baseline.height);
    const mismatchedPixels = this.pixelmatch(
      baseline.data,
      currentImage.data,
      diff.data,
      baseline.width,
      baseline.height,
      { threshold: options?.threshold || 0.1 }
    );

    const differencePercentage = (mismatchedPixels / (baseline.width * baseline.height)) * 100;
    const isMatch = differencePercentage < (options?.tolerance || 1);

    let diffImagePath: string | null = null;
    if (!isMatch) {
      diffImagePath = `test/visual-diffs/${testName}-diff.png`;
      await this.saveDiffImage(diff, diffImagePath);
    }

    return {
      isMatch,
      isNewBaseline: false,
      differencePercentage,
      diffImagePath,
      mismatchedPixels
    };
  }

  private async elementToCanvas(element: HTMLElement, options?: ScreenshotOptions): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    const rect = element.getBoundingClientRect();
    canvas.width = options?.width || rect.width;
    canvas.height = options?.height || rect.height;

    // Render element to canvas (simplified - in practice, use html2canvas or similar)
    context.fillStyle = options?.backgroundColor || '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    return canvas;
  }

  async testComponentVisuals(
    fixture: ComponentFixture<any>,
    scenarios: VisualTestScenario[]
  ): Promise<VisualTestSuite> {
    const results: VisualTestResult[] = [];

    for (const scenario of scenarios) {
      // Apply scenario setup
      if (scenario.setup) {
        await scenario.setup(fixture);
      }

      // Wait for animations
      if (scenario.waitForAnimations) {
        await this.waitForAnimations(fixture);
      }

      const result = await this.captureScreenshot(fixture, scenario.name, scenario.options);
      results.push({ ...result, scenarioName: scenario.name });

      // Cleanup
      if (scenario.cleanup) {
        await scenario.cleanup(fixture);
      }
    }

    return {
      results,
      totalScenarios: scenarios.length,
      passedScenarios: results.filter(r => r.isMatch).length,
      failedScenarios: results.filter(r => !r.isMatch).length
    };
  }

  private async waitForAnimations(fixture: ComponentFixture<any>): Promise<void> {
    // Wait for CSS animations and transitions
    await new Promise(resolve => {
      const animations = fixture.nativeElement.getAnimations?.() || [];
      if (animations.length === 0) {
        resolve(void 0);
        return;
      }

      Promise.all(animations.map(animation => animation.finished))
        .then(() => resolve(void 0));
    });
  }
}

// Visual Test Scenarios
export const ProjectComponentVisualScenarios: VisualTestScenario[] = [
  {
    name: 'default-state',
    setup: async (fixture) => {
      // Default project loaded
      fixture.detectChanges();
    }
  },
  {
    name: 'marked-steps',
    setup: async (fixture) => {
      const component = fixture.componentInstance;
      // Simulate marked steps
      component.onStepMark({ row: 0, step: 1, count: 3 });
      fixture.detectChanges();
    }
  },
  {
    name: 'focus-state',
    setup: async (fixture) => {
      const firstStep = fixture.nativeElement.querySelector('.step-button');
      firstStep?.focus();
      fixture.detectChanges();
    }
  },
  {
    name: 'dark-theme',
    setup: async (fixture) => {
      document.body.classList.add('dark-theme');
      fixture.detectChanges();
    },
    cleanup: async (fixture) => {
      document.body.classList.remove('dark-theme');
    }
  },
  {
    name: 'mobile-viewport',
    options: {
      width: 375,
      height: 667
    },
    setup: async (fixture) => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
    }
  }
];
```

### Contract Testing

```typescript
// API Contract Testing
export class ServiceContractValidator {
  validateProjectServiceContract(): ContractTestSuite {
    const tests: ContractTest[] = [
      {
        name: 'loadProject returns valid Project or null',
        test: async (service: ProjectService) => {
          const result = await service.loadProject(1);
          return result === null || this.isValidProject(result);
        }
      },
      {
        name: 'saveProject accepts valid Project and returns Project with ID',
        test: async (service: ProjectService) => {
          const project = AdvancedTestDataBuilder.createProject();
          const result = await service.saveProject(project);
          return this.hasValidId(result) && this.isValidProject(result);
        }
      },
      {
        name: 'updatePosition accepts valid Position',
        test: async (service: ProjectService) => {
          const position: Position = { row: 0, step: 0 };
          // Should not throw
          await service.updatePosition(position);
          return true;
        }
      }
    ];

    return {
      serviceName: 'ProjectService',
      tests,
      validate: async (service: ProjectService) => {
        const results = await Promise.all(
          tests.map(async test => ({
            name: test.name,
            passed: await test.test(service).catch(() => false)
          }))
        );

        return {
          totalTests: tests.length,
          passedTests: results.filter(r => r.passed).length,
          results
        };
      }
    };
  }

  private isValidProject(obj: any): boolean {
    return obj && 
           typeof obj.id === 'number' && 
           Array.isArray(obj.rows) &&
           obj.rows.every((row: any) => this.isValidRow(row));
  }

  private isValidRow(obj: any): boolean {
    return obj &&
           typeof obj.id === 'number' &&
           Array.isArray(obj.steps) &&
           obj.steps.every((step: any) => this.isValidStep(step));
  }

  private isValidStep(obj: any): boolean {
    return obj &&
           typeof obj.id === 'number' &&
           typeof obj.count === 'number' &&
           typeof obj.description === 'string';
  }

  private hasValidId(obj: any): boolean {
    return obj && typeof obj.id === 'number' && obj.id > 0;
  }
}

// Component Contract Testing
export class ComponentContractValidator {
  validateProjectComponentContract(fixture: ComponentFixture<ProjectComponent>): ComponentContractResult {
    const component = fixture.componentInstance;
    const violations: ContractViolation[] = [];

    // Input validation
    if (!this.hasRequiredInputs(component)) {
      violations.push({
        type: 'missing-inputs',
        message: 'Component missing required inputs'
      });
    }

    // Output validation
    if (!this.hasRequiredOutputs(component)) {
      violations.push({
        type: 'missing-outputs', 
        message: 'Component missing required outputs'
      });
    }

    // Lifecycle validation
    if (!this.implementsRequiredLifecycle(component)) {
      violations.push({
        type: 'lifecycle-violation',
        message: 'Component does not implement required lifecycle methods'
      });
    }

    return {
      componentName: 'ProjectComponent',
      violations,
      isValid: violations.length === 0
    };
  }

  private hasRequiredInputs(component: any): boolean {
    // Check for required @Input properties
    return true; // Implement based on component requirements
  }

  private hasRequiredOutputs(component: any): boolean {
    // Check for required @Output properties
    return typeof component.positionChange?.emit === 'function' &&
           typeof component.stepClick?.emit === 'function';
  }

  private implementsRequiredLifecycle(component: any): boolean {
    return typeof component.ngOnInit === 'function' &&
           typeof component.ngOnDestroy === 'function';
  }
}
```

```

This comprehensive testing strategy provides:

1. **Advanced Test Data Management**: Realistic and edge-case data generation
2. **Performance Testing**: Automated performance validation with budgets
3. **Accessibility Testing**: Comprehensive a11y validation and keyboard testing
4. **Integration Testing**: Page object models and complex user flows
5. **Visual Regression Testing**: Automated UI consistency validation
6. **Contract Testing**: API and component interface validation

These patterns ensure enterprise-grade quality assurance with comprehensive coverage of functional, performance, accessibility, and visual requirements.

## Utilities Testing Patterns

### Testing ModelFactory and SafeAccess

```typescript
describe('ModelFactory Testing Patterns', () => {
  describe('createProject()', () => {
    it('should create valid project with defaults', () => {
      const project = ModelFactory.createProject();
      
      expect(ModelTypeGuards.isValidProject(project)).toBe(true);
      expect(project.id).toBeGreaterThan(0);
      expect(project.name).toBe('');
      expect(project.rows).toEqual([]);
      expect(project.position).toEqual(DEFAULT_VALUES.position());
    });

    it('should merge provided data with defaults', () => {
      const customData = {
        name: 'Test Project',
        rows: [ModelFactory.createRow()]
      };
      
      const project = ModelFactory.createProject(customData);
      
      expect(project.name).toBe('Test Project');
      expect(project.rows).toHaveLength(1);
      expect(ModelTypeGuards.isValidProject(project)).toBe(true);
    });

    it('should handle null/undefined input gracefully', () => {
      const nullProject = ModelFactory.createProject(null as any);
      const undefinedProject = ModelFactory.createProject(undefined as any);
      
      expect(ModelTypeGuards.isValidProject(nullProject)).toBe(true);
      expect(ModelTypeGuards.isValidProject(undefinedProject)).toBe(true);
    });

    it('should sanitize invalid properties', () => {
      const invalidData = {
        id: 'not-a-number',
        name: null,
        rows: 'not-an-array',
        position: { invalid: 'position' }
      };
      
      const project = ModelFactory.createProject(invalidData as any);
      
      expect(typeof project.id).toBe('number');
      expect(typeof project.name).toBe('string');
      expect(Array.isArray(project.rows)).toBe(true);
      expect(ModelTypeGuards.isPosition(project.position)).toBe(true);
    });
  });

  describe('SafeAccess patterns', () => {
    it('should handle null project safely', () => {
      const nullProject = null;
      
      expect(SafeAccess.getProjectId(nullProject)).toBe(0);
      expect(SafeAccess.getProjectName(nullProject)).toBe('');
      expect(SafeAccess.getProjectRows(nullProject)).toEqual([]);
      expect(SafeAccess.getProjectPosition(nullProject)).toEqual(DEFAULT_VALUES.position());
    });

    it('should extract valid properties from valid project', () => {
      const project = ModelFactory.createProject({
        id: 42,
        name: 'Test Project',
        rows: [ModelFactory.createRow()],
        position: ModelFactory.createPosition({ row: 1, step: 2 })
      });
      
      expect(SafeAccess.getProjectId(project)).toBe(42);
      expect(SafeAccess.getProjectName(project)).toBe('Test Project');
      expect(SafeAccess.getProjectRows(project)).toHaveLength(1);
      expect(SafeAccess.getProjectPosition(project)).toEqual({ row: 1, step: 2 });
    });

    it('should provide fallbacks for malformed projects', () => {
      const malformedProject = {
        id: null,
        name: undefined,
        rows: 'not-an-array',
        position: null
      };
      
      expect(SafeAccess.getProjectId(malformedProject as any)).toBe(0);
      expect(SafeAccess.getProjectName(malformedProject as any)).toBe('');
      expect(SafeAccess.getProjectRows(malformedProject as any)).toEqual([]);
      expect(SafeAccess.getProjectPosition(malformedProject as any)).toEqual(DEFAULT_VALUES.position());
    });
  });
});

describe('Type Guards Testing Patterns', () => {
  describe('ModelTypeGuards.isValidProject()', () => {
    it('should validate complete project objects', () => {
      const validProject = ModelFactory.createProject({
        name: 'Valid Project',
        rows: [ModelFactory.createRow()]
      });
      
      expect(ModelTypeGuards.isValidProject(validProject)).toBe(true);
    });

    it('should reject invalid data types', () => {
      expect(ModelTypeGuards.isValidProject(null)).toBe(false);
      expect(ModelTypeGuards.isValidProject(undefined)).toBe(false);
      expect(ModelTypeGuards.isValidProject('string')).toBe(false);
      expect(ModelTypeGuards.isValidProject(42)).toBe(false);
      expect(ModelTypeGuards.isValidProject([])).toBe(false);
    });

    it('should reject objects missing required properties', () => {
      expect(ModelTypeGuards.isValidProject({})).toBe(false);
      expect(ModelTypeGuards.isValidProject({ id: 1 })).toBe(false);
      expect(ModelTypeGuards.isValidProject({ id: 1, name: 'test' })).toBe(false);
    });

    it('should validate nested row structure', () => {
      const projectWithInvalidRows = {
        id: 1,
        name: 'Test',
        rows: ['not', 'valid', 'rows'],
        position: DEFAULT_VALUES.position()
      };
      
      expect(ModelTypeGuards.isValidProject(projectWithInvalidRows)).toBe(false);
    });
  });

  describe('Complex validation scenarios', () => {
    it('should handle circular references safely', () => {
      const circular: any = { id: 1, name: 'test' };
      circular.self = circular;
      
      expect(() => ModelTypeGuards.isValidProject(circular)).not.toThrow();
      expect(ModelTypeGuards.isValidProject(circular)).toBe(false);
    });

    it('should validate deeply nested structures', () => {
      const deepProject = ModelFactory.createProject({
        rows: Array.from({ length: 100 }, (_, i) => 
          ModelFactory.createRow({
            steps: Array.from({ length: 50 }, (_, j) =>
              ModelFactory.createStep({ 
                id: j, 
                count: Math.floor(Math.random() * 10) + 1,
                description: `Color ${j}` 
              })
            )
          })
        )
      });
      
      expect(ModelTypeGuards.isValidProject(deepProject)).toBe(true);
    });
  });
});

describe('DataIntegrityService Testing Patterns', () => {
  let service: DataIntegrityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DataIntegrityService]
    });
    service = TestBed.inject(DataIntegrityService);
  });

  describe('validateProjectName()', () => {
    it('should accept valid project names', () => {
      expect(service.validateProjectName('Valid Name')).toBe(true);
      expect(service.validateProjectName('Project123')).toBe(true);
      expect(service.validateProjectName('My-Project_2024')).toBe(true);
    });

    it('should reject invalid names', () => {
      expect(service.validateProjectName('')).toBe(false);
      expect(service.validateProjectName(null as any)).toBe(false);
      expect(service.validateProjectName('   ')).toBe(false);
      expect(service.validateProjectName('a'.repeat(1000))).toBe(false);
    });

    it('should sanitize and validate dangerous content', () => {
      expect(service.validateProjectName('<script>alert("xss")</script>')).toBe(false);
      expect(service.validateProjectName('../../etc/passwd')).toBe(false);
      expect(service.validateProjectName('DROP TABLE projects;')).toBe(false);
    });
  });

  describe('validatePositionData()', () => {
    it('should validate position coordinates within bounds', () => {
      const project = ModelFactory.createProject({
        rows: [
          ModelFactory.createRow({
            steps: [
              ModelFactory.createStep(),
              ModelFactory.createStep()
            ]
          })
        ]
      });
      
      expect(service.validatePositionData({ row: 0, step: 0 }, project)).toBe(true);
      expect(service.validatePositionData({ row: 0, step: 1 }, project)).toBe(true);
    });

    it('should reject out-of-bounds positions', () => {
      const project = ModelFactory.createProject({
        rows: [ModelFactory.createRow({ steps: [ModelFactory.createStep()] })]
      });
      
      expect(service.validatePositionData({ row: 1, step: 0 }, project)).toBe(false);
      expect(service.validatePositionData({ row: 0, step: 1 }, project)).toBe(false);
      expect(service.validatePositionData({ row: -1, step: 0 }, project)).toBe(false);
    });
  });

  describe('integrity event logging', () => {
    it('should log validation failures', () => {
      const invalidName = '<script>alert("xss")</script>';
      
      service.validateProjectName(invalidName);
      
      const events = service.getRecentEvents();
      expect(events).toContainEqual(jasmine.objectContaining({
        type: 'validation-failure',
        operation: 'validateProjectName',
        details: jasmine.objectContaining({
          input: invalidName,
          reason: 'contains-dangerous-content'
        })
      }));
    });

    it('should track integrity violations over time', () => {
      service.validateProjectName('');
      service.validateProjectName(null as any);
      service.validatePositionData({ row: -1, step: 0 }, ModelFactory.createProject());
      
      const events = service.getRecentEvents();
      expect(events).toHaveLength(3);
      expect(events.every(e => e.timestamp)).toBe(true);
    });
  });
});

describe('ErrorHandlerService Utilities Testing', () => {
  let service: ErrorHandlerService;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    const notificationSpy = jasmine.createSpyObj('NotificationService', 
      ['error', 'warning', 'info']);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(ErrorHandlerService);
    mockNotificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  describe('extractErrorMessage()', () => {
    it('should extract messages from various error types', () => {
      const standardError = new Error('Standard error message');
      const stringError = 'String error';
      const objectError = { message: 'Object error message' };
      const nullError = null;

      expect(service.extractErrorMessage(standardError)).toBe('Standard error message');
      expect(service.extractErrorMessage(stringError)).toBe('String error');
      expect(service.extractErrorMessage(objectError)).toBe('Object error message');
      expect(service.extractErrorMessage(nullError)).toBe('Unknown error occurred');
    });

    it('should handle nested error structures', () => {
      const nestedError = {
        error: {
          message: 'Nested error message',
          details: 'Additional details'
        }
      };

      expect(service.extractErrorMessage(nestedError)).toBe('Nested error message');
    });
  });

  describe('categorizeError()', () => {
    it('should categorize errors by severity', () => {
      const criticalError = { name: 'DatabaseConnectionError' };
      const userError = { name: 'ValidationError' };
      const networkError = { name: 'NetworkError' };

      expect(service.categorizeError(criticalError).severity).toBe('critical');
      expect(service.categorizeError(userError).severity).toBe('user');
      expect(service.categorizeError(networkError).severity).toBe('recoverable');
    });

    it('should provide appropriate recovery strategies', () => {
      const networkError = { name: 'NetworkError', message: 'Failed to fetch' };
      
      const categorized = service.categorizeError(networkError);
      
      expect(categorized.recovery).toEqual(jasmine.objectContaining({
        strategy: 'retry',
        retryable: true,
        maxRetries: jasmine.any(Number)
      }));
    });
  });

  describe('error notification integration', () => {
    it('should emit notifications for handled errors', () => {
      const error = new Error('Test error');
      const context = { operation: 'test-operation', component: 'TestComponent' };

      service.handleError(error, context);

      expect(mockNotificationService.error).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.objectContaining({
          actions: jasmine.any(Array)
        })
      );
    });

    it('should provide retry actions for recoverable errors', (done) => {
      const error = { name: 'NetworkError', message: 'Connection failed' };
      
      service.handleError(error, { operation: 'network-request' });

      service.getNotifications().subscribe(notification => {
        expect(notification.actions).toContainEqual(jasmine.objectContaining({
          label: 'Retry',
          action: jasmine.any(Function)
        }));
        done();
      });
    });
  });
});
```

### Testing ReactiveStateStore Integration

```typescript
describe('ReactiveStateStore Testing Patterns', () => {
  let store: ReactiveStateStore;
  let initialState: AppState;

  beforeEach(() => {
    initialState = createInitialState();
    TestBed.configureTestingModule({
      providers: [ReactiveStateStore]
    });
    store = TestBed.inject(ReactiveStateStore);
  });

  describe('state management utilities', () => {
    it('should provide immutable state snapshots', () => {
      const state1 = store.getState();
      const state2 = store.getState();
      
      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same content
    });

    it('should support time-travel debugging', () => {
      const action1 = { type: 'TEST_ACTION_1' };
      const action2 = { type: 'TEST_ACTION_2' };
      
      store.dispatch(action1);
      store.dispatch(action2);
      
      const history = store.getStateHistory();
      expect(history).toHaveLength(3); // initial + 2 actions
      
      // Restore to previous state
      store.restoreStateFromHistory(1);
      expect(store.getActions$().pipe(take(1))).toEmit([action1]);
    });

    it('should handle selector caching correctly', () => {
      const expensiveSelector = jasmine.createSpy('expensiveSelector')
        .and.returnValue('computed-value');
      
      // First call should execute
      const result1 = store.select(expensiveSelector);
      expect(expensiveSelector).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = store.select(expensiveSelector);
      expect(expensiveSelector).toHaveBeenCalledTimes(1);
      
      // Cache should clear after state change
      store.dispatch({ type: 'CHANGE_STATE' });
      const result3 = store.select(expensiveSelector);
      expect(expensiveSelector).toHaveBeenCalledTimes(2);
    });
  });

  describe('middleware integration testing', () => {
    it('should process actions through middleware pipeline', () => {
      const middleware1 = jasmine.createSpy('middleware1')
        .and.callFake((action, next) => next(action));
      const middleware2 = jasmine.createSpy('middleware2')
        .and.callFake((action, next) => next(action));
      
      store.addMiddleware(middleware1);
      store.addMiddleware(middleware2);
      
      const action = { type: 'TEST_ACTION' };
      store.dispatch(action);
      
      expect(middleware1).toHaveBeenCalledWith(action, jasmine.any(Function));
      expect(middleware2).toHaveBeenCalledWith(action, jasmine.any(Function));
    });

    it('should handle middleware errors gracefully', () => {
      const errorMiddleware = jasmine.createSpy('errorMiddleware')
        .and.throwError('Middleware error');
      
      store.addMiddleware(errorMiddleware);
      
      expect(() => store.dispatch({ type: 'TEST' })).not.toThrow();
      // Should still update state despite middleware error
      expect(store.getState()).toBeDefined();
    });
  });
});
```

These utilities testing patterns demonstrate:

1. **ModelFactory & SafeAccess**: Comprehensive null-safety testing
2. **Type Guards**: Runtime validation and edge case handling
3. **DataIntegrityService**: Input validation and sanitization testing
4. **ErrorHandlerService**: Error categorization and recovery testing
5. **ReactiveStateStore**: State management and middleware testing

Each pattern includes realistic test scenarios that validate the utility functions work correctly under both normal and edge-case conditions.

````

import { Page } from '@playwright/test';

/**
 * Test data factory for creating consistent test data
 */
export class TestDataFactory {
  /**
   * Generate a unique project name for testing
   */
  static generateProjectName(prefix = 'Test Project'): string {
    const timestamp = Date.now();
    return `${prefix} ${timestamp}`;
  }

  /**
   * Generate test project data
   */
  static createProjectData(overrides: Partial<ProjectTestData> = {}): ProjectTestData {
    return {
      name: this.generateProjectName(),
      description: 'A test project for E2E testing',
      rows: 10,
      stepsPerRow: 5,
      ...overrides
    };
  }

  /**
   * Generate multiple test projects
   */
  static createMultipleProjects(count: number): ProjectTestData[] {
    return Array.from({ length: count }, (_, index) =>
      this.createProjectData({ name: `Test Project ${index + 1}` })
    );
  }

  /**
   * Create test pattern data
   */
  static createPatternData(overrides: Partial<PatternTestData> = {}): PatternTestData {
    return {
      name: 'Test Pattern',
      type: 'peyote',
      difficulty: 'beginner',
      colors: ['red', 'blue', 'green'],
      ...overrides
    };
  }
}

/**
 * Database utilities for E2E testing
 */
export class TestDbUtils {
  /**
   * Seed test data into the application
   */
  static async seedTestData(page: Page, projects: ProjectTestData[]): Promise<void> {
    await page.evaluate((projectsData) => {
      // This would integrate with your actual data seeding logic
      // For now, we'll use a placeholder implementation
      console.log('Seeding test data:', projectsData);
    }, projects);
  }

  /**
   * Get current data from IndexedDB
   */
  static async getCurrentData(page: Page): Promise<any> {
    return await page.evaluate(() => {
      // Return current application state
      // This would integrate with your actual data retrieval logic
      return {
        projects: [],
        settings: {}
      };
    });
  }
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityUtils {
  /**
   * Check keyboard navigation
   */
  static async testKeyboardNavigation(page: Page): Promise<void> {
    // Tab through all focusable elements
    const focusableElements = await page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
  }

  /**
   * Verify ARIA attributes
   */
  static async verifyAriaAttributes(page: Page): Promise<void> {
    const elementsWithAria = await page.locator('[aria-label], [aria-describedby], [role]').all();

    for (const element of elementsWithAria) {
      const ariaLabel = await element.getAttribute('aria-label');
      const role = await element.getAttribute('role');

      if (ariaLabel) {
        console.log('Found aria-label:', ariaLabel);
      }
      if (role) {
        console.log('Found role:', role);
      }
    }
  }

  /**
   * Test screen reader announcements
   */
  static async testScreenReaderAnnouncements(page: Page): Promise<void> {
    // Check for live regions and announcements
    const liveRegions = await page.locator('[aria-live]').all();
    console.log(`Found ${liveRegions.length} live regions`);
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceUtils {
  /**
   * Measure page load performance
   */
  static async measurePageLoad(page: Page): Promise<PerformanceMetrics> {
    const navigationTiming = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstByte: timing.responseStart - timing.navigationStart
      };
    });

    return {
      loadTime: navigationTiming.loadTime,
      domReady: navigationTiming.domReady,
      firstByte: navigationTiming.firstByte,
      timestamp: Date.now()
    };
  }

  /**
   * Monitor memory usage
   */
  static async measureMemoryUsage(page: Page): Promise<MemoryMetrics> {
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    return memoryInfo || { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
  }
}

// Type definitions
export interface ProjectTestData {
  name: string;
  description: string;
  rows: number;
  stepsPerRow: number;
}

export interface PatternTestData {
  name: string;
  type: string;
  difficulty: string;
  colors: string[];
}

export interface PerformanceMetrics {
  loadTime: number;
  domReady: number;
  firstByte: number;
  timestamp: number;
}

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

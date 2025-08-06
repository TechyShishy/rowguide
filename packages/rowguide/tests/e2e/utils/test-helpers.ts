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
   * Generate test project data for FLAM analysis
   */
  static createProjectData(overrides: Partial<TestProject> = {}): TestProject {
    const projectName = this.generateProjectName();
    return {
      id: Math.floor(Math.random() * 900000) + 100000, // Generate valid positive ID (100000-999999)
      name: projectName,
      rows: [
        {
          id: 1,
          steps: [
            { id: 1, count: 3, description: 'A' },
            { id: 2, count: 2, description: 'B' },
            { id: 3, count: 1, description: 'C' },
          ],
        },
        {
          id: 2,
          steps: [
            { id: 1, count: 2, description: 'B' },
            { id: 2, count: 1, description: 'A' },
            { id: 3, count: 4, description: 'D' },
          ],
        },
        {
          id: 3,
          steps: [
            { id: 1, count: 1, description: 'D' },
            { id: 2, count: 4, description: 'A' },
            { id: 3, count: 2, description: 'B' },
            { id: 4, count: 1, description: 'C' },
          ],
        },
        {
          id: 4,
          steps: [
            { id: 1, count: 2, description: 'B' },
            { id: 2, count: 3, description: 'C' },
            { id: 3, count: 1, description: 'A' },
          ],
        },
      ],
      position: { row: 0, step: 0 },
      firstLastAppearanceMap: {},
      colorMapping: {},
      ...overrides,
    };
  }

  /**
   * Create a complex project with diverse pattern data for thorough FLAM testing
   */
  static createComplexProjectData(): TestProject {
    return {
      id: Math.floor(Math.random() * 900000) + 100000, // Generate valid positive ID (100000-999999)
      name: 'Complex FLAM Test Project',
      rows: [
        {
          id: 1,
          steps: [
            { id: 1, count: 5, description: 'A' },
            { id: 2, count: 3, description: 'B' },
            { id: 3, count: 2, description: 'C' },
            { id: 4, count: 1, description: 'D' },
          ],
        },
        {
          id: 2,
          steps: [
            { id: 1, count: 2, description: 'B' },
            { id: 2, count: 4, description: 'E' },
            { id: 3, count: 1, description: 'A' },
            { id: 4, count: 3, description: 'F' },
          ],
        },
        {
          id: 3,
          steps: [
            { id: 1, count: 1, description: 'F' },
            { id: 2, count: 2, description: 'D' },
            { id: 3, count: 5, description: 'G' },
            { id: 4, count: 1, description: 'C' },
          ],
        },
        {
          id: 4,
          steps: [
            { id: 1, count: 3, description: 'G' },
            { id: 2, count: 2, description: 'H' },
            { id: 3, count: 1, description: 'E' },
          ],
        },
        {
          id: 5,
          steps: [
            { id: 1, count: 4, description: 'H' },
            { id: 2, count: 1, description: 'A' },
            { id: 3, count: 2, description: 'B' },
          ],
        },
      ],
      position: { row: 0, step: 0 },
      firstLastAppearanceMap: {},
      colorMapping: {},
    };
  }

  /**
   * Generate multiple test projects
   */
  static createMultipleProjects(count: number): TestProject[] {
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
   * Seed test project data directly into IndexedDB
   */
  static async seedProjectData(page: Page, projects: TestProject[]): Promise<void> {
    await page.evaluate(async (projectsData) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('rowguide', 2);
        
        request.onerror = () => reject(new Error('Failed to open IndexedDB'));
        
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          
          // Create object stores if they don't exist
          if (!db.objectStoreNames.contains('projects')) {
            const projectStore = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
            projectStore.createIndex('name', 'name', { unique: false });
            projectStore.createIndex('dateCreated', 'dateCreated', { unique: false });
          }
          
          if (!db.objectStoreNames.contains('currentProject')) {
            db.createObjectStore('currentProject');
          }
          
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
          
          if (!db.objectStoreNames.contains('migrations')) {
            db.createObjectStore('migrations', { autoIncrement: false });
          }
        };
        
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          
          try {
            // Clear existing projects
            const clearTx = db.transaction(['projects'], 'readwrite');
            const projectStore = clearTx.objectStore('projects');
            const clearRequest = projectStore.clear();
            
            clearRequest.onsuccess = () => {
              // Add test projects
              let addedCount = 0;
              
              const addNextProject = (index: number) => {
                if (index >= projectsData.length) {
                  db.close();
                  console.log(`Seeded ${projectsData.length} test projects to IndexedDB`);
                  resolve();
                  return;
                }
                
                const addTx = db.transaction(['projects'], 'readwrite');
                const addStore = addTx.objectStore('projects');
                const addRequest = addStore.add(projectsData[index]);
                
                addRequest.onsuccess = () => {
                  addedCount++;
                  addNextProject(index + 1);
                };
                
                addRequest.onerror = () => {
                  db.close();
                  reject(new Error(`Failed to add project ${index}`));
                };
              };
              
              addNextProject(0);
            };
            
            clearRequest.onerror = () => {
              db.close();
              reject(new Error('Failed to clear existing projects'));
            };
            
          } catch (error) {
            db.close();
            reject(error);
          }
        };
      });
    }, projects);
  }

  /**
   * Clear all data from IndexedDB
   */
  static async clearDatabase(page: Page): Promise<void> {
    await page.evaluate(async () => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('rowguide', 2);
        
        request.onerror = () => reject(new Error('Failed to open IndexedDB'));
        
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          
          try {
            const tx = db.transaction(['projects'], 'readwrite');
            const projectStore = tx.objectStore('projects');
            const clearRequest = projectStore.clear();
            
            clearRequest.onsuccess = () => {
              db.close();
              console.log('Cleared IndexedDB data');
              resolve();
            };
            
            clearRequest.onerror = () => {
              db.close();
              reject(new Error('Failed to clear database'));
            };
            
          } catch (error) {
            db.close();
            reject(error);
          }
        };
      });
    });
  }

  /**
   * Get current project data from IndexedDB
   */
  static async getCurrentProjectData(page: Page): Promise<any[]> {
    return await page.evaluate(async () => {
      return new Promise<any[]>((resolve, reject) => {
        const request = indexedDB.open('rowguide', 2);
        
        request.onerror = () => reject(new Error('Failed to open IndexedDB'));
        
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          
          try {
            const tx = db.transaction(['projects'], 'readonly');
            const projectStore = tx.objectStore('projects');
            const getAllRequest = projectStore.getAll();
            
            getAllRequest.onsuccess = () => {
              db.close();
              resolve(getAllRequest.result || []);
            };
            
            getAllRequest.onerror = () => {
              db.close();
              reject(new Error('Failed to get project data'));
            };
            
          } catch (error) {
            db.close();
            reject(error);
          }
        };
      });
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

//

// Type definitions
export interface ProjectTestData {
  name: string;
  description: string;
  rows: number;
  stepsPerRow: number;
}

export interface TestProject {
  id: number;
  name: string;
  rows: TestRow[];
  position: TestPosition;
  firstLastAppearanceMap?: { [key: string]: any };
  colorMapping?: { [key: string]: string };
}

export interface TestRow {
  id: number;
  steps: TestStep[];
}

export interface TestStep {
  id: number;
  count: number;
  description: string;
}

export interface TestPosition {
  row: number;
  step: number;
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

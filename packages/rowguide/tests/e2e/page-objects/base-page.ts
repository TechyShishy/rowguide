import { Page, Locator, expect } from '@playwright/test';
import { TestDbUtils } from '../utils/test-helpers';

/**
 * Base Page Object with common functionality for all pages
 * Provides reusable methods and utilities for E2E testing in Rowguide
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /**
   * Wait for the page to be loaded and ready
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for Angular to finish loading and all pending requests to complete
   */
  async waitForAngular(): Promise<void> {
    // Wait for Angular to be defined
    await this.page.waitForFunction(() => {
      return typeof (window as any).ng !== 'undefined';
    });

    // Wait for any pending HTTP requests and zone stabilization
    await this.page.waitForLoadState('networkidle');

    // Wait for any Material Design animations to complete
    await this.page.waitForTimeout(100);
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Wait for a specific element to be visible
   */
  async waitForElement(selector: string, timeout = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  /**
   * Check if an element exists and is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      const element = this.page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for Material Design components to be ready and animations to complete
   */
  async waitForMaterialComponents(): Promise<void> {
    // Wait for Material Design animations to complete
    await this.page.waitForTimeout(300);

    // Ensure no mat-spinner is visible (loading states)
    await this.page.waitForFunction(
      () => {
        const spinners = document.querySelectorAll(
          'mat-spinner, mat-progress-spinner'
        );
        return spinners.length === 0;
      },
      { timeout: 10000 }
    );

    // Wait for any expansion panels to finish animating
    await this.page
      .waitForFunction(
        () => {
          const panels = document.querySelectorAll('mat-expansion-panel');
          return Array.from(panels).every((panel) => {
            const computedStyle = window.getComputedStyle(panel);
            return (
              computedStyle.animationName === 'none' ||
              computedStyle.animationPlayState === 'paused'
            );
          });
        },
        { timeout: 5000 }
      )
      .catch(() => {
        // Ignore timeout, animations might not be present
      });
  }

  /**
   * Wait for and interact with the main sidenav menu
   */
  async openSideNav(): Promise<void> {
    // Check if sidenav is already open
    const sidenav = this.page.locator('mat-sidenav');
    const isOpen = await sidenav.evaluate((el) => el.classList.contains('mat-drawer-opened'));

    if (!isOpen) {
      const menuButton = this.page
        .locator('mat-toolbar button[mat-icon-button]')
        .first();
      await menuButton.click();

      // Wait for sidenav to open
      await this.page.waitForSelector('mat-sidenav.mat-drawer-opened', {
        timeout: 5000,
      });
    }
    await this.waitForMaterialComponents();
  }

  /**
   * Close the sidenav if it's open
   */
  async closeSideNav(): Promise<void> {
    const sidenav = this.page.locator('mat-sidenav');
    const isOpen = await sidenav.evaluate((el) => el.classList.contains('mat-drawer-opened'));

    if (isOpen) {
      // Click outside the sidenav or use backdrop
      const backdrop = this.page.locator('.cdk-overlay-backdrop');
      if (await backdrop.isVisible()) {
        await backdrop.click();
      } else {
        // Click outside the sidenav area
        await this.page.locator('mat-sidenav-content').click({ position: { x: 100, y: 100 } });
      }
      await this.waitForMaterialComponents();
    }
  }

  /**
   * Navigate using the main application menu
   */
  async navigateViaMenu(routeName: 'project-selector' | 'project' | 'project-inspector' | 'flam-analysis' | 'settings'): Promise<void> {
    await this.openSideNav();

    // Find the appropriate navigation link
    const linkMap: Record<string, string> = {
      'project-selector': 'Project Selector',
      project: 'Project',
      'project-inspector': 'Project Inspector',
      'flam-analysis': 'FLAM Analysis',
      settings: 'Settings',
      import: 'Import',
      export: 'Export',
    };

    const linkText = linkMap[routeName];
    // Use more specific selector to avoid ambiguity with multiple "Project" links
    const navLink =
      routeName === 'project'
        ? this.page.locator('mat-list-item a[routerlink="/project"]')
        : this.page.locator(`mat-list-item a:has-text("${linkText}")`);
    await navLink.click();
    await this.waitForAngular();
  }

  /**
   * Wait for error boundary component and check for errors
   */
  async checkForErrors(): Promise<void> {
    // Check if error boundary is showing an error
    const errorBoundary = this.page.locator('app-error-boundary');
    const hasError = await errorBoundary.locator('.error-message').isVisible().catch(() => false);

    if (hasError) {
      const errorText = await errorBoundary.locator('.error-message').textContent();
      throw new Error(`Application error detected: ${errorText}`);
    }
  }

  /**
   * Verify accessibility standards for Rowguide
   */
  async checkAccessibility(): Promise<void> {
    // Check for proper heading structure
    const toolbar = this.page.locator('mat-toolbar');
    await expect(toolbar).toBeVisible();

    // Check for focusable elements
    const focusableElements = this.page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), mat-expansion-panel-header'
    );
    const count = await focusableElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify Material components have proper ARIA
    const matButtons = this.page.locator(
      'button[mat-button], button[mat-raised-button], button[mat-icon-button]'
    );
    const buttonCount = await matButtons.count();
    if (buttonCount > 0) {
      // At least one button should be properly accessible
      const firstButton = matButtons.first();
      const hasAriaOrText = await firstButton.evaluate((btn) => {
        return (
          btn.getAttribute('aria-label') ||
          btn.getAttribute('aria-labelledby') ||
          btn.textContent?.trim() ||
          btn.querySelector('mat-icon')?.textContent
        );
      });
      expect(hasAriaOrText).toBeTruthy();
    }
  }

  /**
   * Wait for basic toolbar to render (common across all pages)
   */
  async waitForToolbar(): Promise<void> {
    await this.page.waitForSelector('mat-toolbar', { timeout: 10000 });
    await this.waitForMaterialComponents();
  }

  /**
   * Wait for project context to be established in toolbar
   * This waits for an actual project to be loaded (not "No Project")
   */
  async waitForProjectContext(): Promise<void> {
    await this.page.waitForFunction(() => {
      const toolbar = document.querySelector('mat-toolbar');
      if (!toolbar || !toolbar.textContent) {
        return false;
      }

      const toolbarText = toolbar.textContent;
      if (!toolbarText.includes('Project:')) {
        return false;
      }

      // Extract project name after "Project:"
      const match = toolbarText.match(/Project:\s*(.+?)(?:\s|$)/);
      const projectName = match ? match[1].trim() : '';

      // Return true only if we have a project name that's not "No Project" or empty
      return projectName && projectName !== 'No Project' && projectName !== '';
    }, { timeout: 10000 });
  }

  /**
   * Generic method to wait for specific UI elements to appear
   * Each page object should implement its own specific data loading detection
   */
  async waitForUIElements(selectors: string[], timeout = 8000): Promise<void> {
    await this.page.waitForFunction((selectorList) => {
      return selectorList.some(selector => {
        const elements = document.querySelectorAll(selector);
        return elements.length > 0;
      });
    }, selectors, { timeout });
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Reload the current page and wait for Angular
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForAngular();
    await this.waitForToolbar();
  }

  /**
   * Get the current project name from the toolbar
   */
  async getCurrentProjectName(): Promise<string> {
    const toolbar = this.page.locator('mat-toolbar');
    const toolbarText = await toolbar.textContent();

    if (toolbarText && toolbarText.includes('Project:')) {
      const match = toolbarText.match(/Project:\s*(.+?)(?:\s|$)/);
      return match ? match[1].trim() : 'No Project';
    }

    return 'No Project';
  }

  /**
   * Wait for and handle Material expansion panels
   */
  async waitForExpansionPanels(): Promise<void> {
    const expansionPanels = this.page.locator('mat-expansion-panel');
    const count = await expansionPanels.count();

    if (count > 0) {
      // Wait for panels to be ready
      await expansionPanels.first().waitFor({ state: 'visible' });
      await this.waitForMaterialComponents();
    }
  }
}

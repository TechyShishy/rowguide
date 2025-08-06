import { test as base, Browser, BrowserContext, Page } from '@playwright/test';
import { ProjectViewPage } from '../page-objects/project-view-page';
import { ProjectSelectorPage } from '../page-objects/project-selector-page';
import { ProjectInspectorPage } from '../page-objects/project-inspector-page';
import { FlamAnalysisPage } from '../page-objects/flam-analysis-page';
import { SettingsPage } from '../page-objects/settings-page';
import { TestDbUtils, TestDataFactory } from '../utils/test-helpers';

/**
 * Extended test fixtures for Rowguide E2E testing
 * Provides pre-configured page objects and utilities
 */
interface RowguideFixtures {
  projectViewPage: ProjectViewPage;
  projectSelectorPage: ProjectSelectorPage;
  projectInspectorPage: ProjectInspectorPage;
  flamAnalysisPage: FlamAnalysisPage;
  settingsPage: SettingsPage;
  testData: typeof TestDataFactory;
  // Override page to use context recreation for clean state
  page: Page;
}

/**
 * Extend Playwright's base test with custom fixtures
 */
export const test = base.extend<RowguideFixtures>({
  /**
   * Project view page fixture - provides access to pattern tracking interface
   */
  projectViewPage: async ({ page }, use) => {
    const projectViewPage = new ProjectViewPage(page);
    await use(projectViewPage);
  },

  /**
   * Project selector page fixture - provides access to project selection and management
   */
  projectSelectorPage: async ({ page }, use) => {
    const projectSelectorPage = new ProjectSelectorPage(page);
    await use(projectSelectorPage);
  },

  /**
   * Project inspector page fixture - provides access to project inspection tools
   */
  projectInspectorPage: async ({ page }, use) => {
    const projectInspectorPage = new ProjectInspectorPage(page);
    await use(projectInspectorPage);
  },

  /**
   * FLAM analysis page fixture - provides access to dedicated FLAM analysis interface
   */
  flamAnalysisPage: async ({ page }, use) => {
    const flamAnalysisPage = new FlamAnalysisPage(page);
    await use(flamAnalysisPage);
  },

  /**
   * Settings page fixture - provides access to application settings
   */
  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },

  /**
   * Page fixture with context recreation for clean state
   * This creates a fresh browser context for each test, which is more reliable than cleanup
   */
  page: async ({ browser }, use) => {
    // Create a fresh context for each test
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the application
    await page.goto('http://localhost:4200');

    await use(page);

    // Clean up: close the context (this automatically cleans all storage)
    await context.close();
  },

  /**
   * Test data factory fixture
   */
  testData: async ({}, use) => {
    await use(TestDataFactory);
  },
});

/**
 * Custom expect with additional matchers for Rowguide
 */
export { expect } from '@playwright/test';

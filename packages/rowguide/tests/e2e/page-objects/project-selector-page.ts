import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Page Object for Project Selector functionality
 * Handles interactions with project selection, file import, and project management
 *
 * Aligns with ProjectSelectorComponent structure:
 * - mat-accordion with import expansion panel and project summaries
 * - Comprehensive file import pipeline (PDF/GZIP/RGS)
 * - Sorting functionality with 8 different options
 * - Error boundary integration with retry capabilities
 */
export class ProjectSelectorPage extends BasePage {
  // Main container structure
  private readonly errorBoundary = this.page.locator('app-error-boundary');
  private readonly accordion = this.page.locator('mat-accordion');

  // Import section (mat-expansion-panel)
  private readonly importPanel = this.page
    .locator('mat-expansion-panel')
    .first();
  private readonly importPanelHeader = this.importPanel.locator(
    'mat-expansion-panel-header'
  );
  private readonly importPanelTitle =
    this.importPanelHeader.locator('mat-panel-title');
  private readonly fileDisplay = this.importPanel.locator('mat-card');
  private readonly chooseFileButton =
    this.importPanel.locator('button[ngfSelect]');
  private readonly importFileButton = this.importPanel
    .locator('button')
    .filter({ hasText: 'Import File' });
  private readonly importSpinner = this.importPanel.locator('mat-spinner');

  // Sort functionality
  private readonly sortFormField = this.importPanel
    .locator('mat-form-field')
    .filter({ hasText: 'Sort Order' });
  private readonly sortSelect = this.sortFormField.locator('mat-select');
  private readonly sortOptions = {
    nameAsc: this.page.locator('mat-option[value="nameAsc"]'),
    nameDesc: this.page.locator('mat-option[value="nameDesc"]'),
    dateAsc: this.page.locator('mat-option[value="dateAsc"]'),
    dateDesc: this.page.locator('mat-option[value="dateDesc"]'),
    rowCountAsc: this.page.locator('mat-option[value="rowCountAsc"]'),
    rowCountDesc: this.page.locator('mat-option[value="rowCountDesc"]'),
    colorCountAsc: this.page.locator('mat-option[value="colorCountAsc"]'),
    colorCountDesc: this.page.locator('mat-option[value="colorCountDesc"]'),
  };

  // Project list (app-project-summary components)
  private readonly projectSummaries = this.accordion.locator(
    'app-project-summary'
  );

  // Individual project summary elements (within each app-project-summary)
  private readonly projectPanels = this.projectSummaries.locator(
    'mat-expansion-panel'
  );
  private readonly projectHeaders = this.projectPanels.locator(
    'mat-expansion-panel-header'
  );
  private readonly projectTitles =
    this.projectHeaders.locator('mat-panel-title');
  private readonly projectDescriptions = this.projectHeaders.locator(
    'mat-panel-description'
  );
  private readonly projectNameInputs = this.projectPanels.locator(
    'mat-form-field input[matInput]'
  );
  private readonly loadProjectButtons = this.projectPanels
    .locator('button')
    .filter({ hasText: 'Load Project' });
  private readonly deleteProjectButtons = this.projectPanels
    .locator('button')
    .filter({ hasText: 'Delete Project' });
  private readonly downloadProjectButtons = this.projectPanels
    .locator('button')
    .filter({ hasText: 'Download Project' });

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the project selector page
   */
  override async goto(): Promise<void> {
    await super.goto('/project-selector');
    await this.waitForPageLoad();
    await this.waitForAngular();
    await this.waitForProjectSelectorData();
  }

  /**
   * Wait for project selector specific data to load
   * This implements the data loading detection specific to the project selector view
   */
  async waitForProjectSelectorData(): Promise<void> {
    await this.waitForAngular();
    await this.waitForToolbar();

    // Wait for accordion structure to be ready
    await this.waitForUIElements(['mat-accordion', 'app-error-boundary'], 8000);
    await this.waitForMaterialComponents();

    // Ensure import panel is visible
    await expect(this.importPanel).toBeVisible();
  }

  /**
   * Verify the project selector page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    // Verify accordion structure is present
    await expect(this.accordion).toBeVisible();
    await expect(this.importPanel).toBeVisible();
    await expect(this.importPanelTitle).toContainText('Import Project');
  }

  // Import functionality methods

  /**
   * Open the import expansion panel
   */
  async openImportPanel(): Promise<void> {
    // Check if panel is already expanded by looking for expanded content
    const isContentVisible = await this.sortSelect
      .isVisible()
      .catch(() => false);
    if (!isContentVisible) {
      await this.importPanelHeader.click();
      await this.waitForMaterialComponents();
      // Wait for the sort select to become visible
      await expect(this.sortSelect).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Select a file for import (simulates file selection)
   */
  async selectFile(filename: string): Promise<void> {
    await this.openImportPanel();
    await this.chooseFileButton.click();
    // Note: Actual file selection would require file input handling
    // This is a placeholder for file selection simulation
  }

  /**
   * Trigger file import process
   */
  async importFile(): Promise<void> {
    await this.openImportPanel();
    await this.importFileButton.click();

    // Wait for spinner to appear and disappear (import process)
    await expect(this.importSpinner).toBeVisible();
    await expect(this.importSpinner).toBeHidden({ timeout: 10000 });
    await this.waitForAngular();
  }

  /**
   * Verify import is in progress
   */
  async verifyImportInProgress(): Promise<void> {
    await expect(this.importSpinner).toBeVisible();
  }

  /**
   * Get current selected file name
   */
  async getSelectedFileName(): Promise<string> {
    return (await this.fileDisplay.textContent()) || '';
  }

  // Sorting functionality methods

  /**
   * Change sort order
   */
  async setSortOrder(sortType: string): Promise<void> {
    await this.openImportPanel();
    await this.sortSelect.click();

    const option = this.sortOptions[sortType as keyof typeof this.sortOptions];
    if (option) {
      await option.click();
      await this.waitForAngular();
    } else {
      throw new Error(`Unknown sort type: ${sortType}`);
    }
  }

  /**
   * Get current sort order (internal value, not display text)
   */
  async getCurrentSortOrder(): Promise<string> {
    await this.openImportPanel();
    // Wait for the Angular binding to update after selection
    await this.waitForAngular();

    // For Angular Material mat-select, check multiple possible value sources
    let value = await this.sortSelect.getAttribute('ng-reflect-value');
    if (!value) {
      value = await this.sortSelect.evaluate((el) => {
        // Try to get the value from the Angular component instance
        return (el as any)._value || (el as any).value || '';
      });
    }

    return value || '';
  }

  // Project list functionality methods

  /**
   * Get the number of available projects
   */
  async getProjectCount(): Promise<number> {
    return await this.projectSummaries.count();
  }

  /**
   * Get project names list
   */
  async getProjectNames(): Promise<string[]> {
    const count = await this.getProjectCount();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const title = await this.projectTitles.nth(i).textContent();
      if (title) names.push(title);
    }

    return names;
  }

  /**
   * Get project row counts
   */
  async getProjectRowCounts(): Promise<number[]> {
    const count = await this.getProjectCount();
    const rowCounts: number[] = [];

    for (let i = 0; i < count; i++) {
      const description = await this.projectDescriptions.nth(i).textContent();
      const match = description?.match(/(\d+) Rows/);
      if (match) rowCounts.push(parseInt(match[1]));
    }

    return rowCounts;
  }

  /**
   * Expand a project summary panel by index
   */
  async expandProject(index: number): Promise<void> {
    const projectPanel = this.projectPanels.nth(index);
    const isExpanded = await projectPanel.getAttribute('aria-expanded');

    if (isExpanded !== 'true') {
      await this.projectHeaders.nth(index).click();
      await this.waitForMaterialComponents();

      // Wait for the panel to actually expand and content to be visible
      await projectPanel.waitFor({ state: 'visible' });
      await this.page.waitForTimeout(500); // Give time for expansion animation
    }
  }

  /**
   * Load a project by index
   */
  async loadProject(index: number): Promise<void> {
    await this.expandProject(index);

    // Wait for the specific panel's content to be visible, then find the button within that panel
    const projectPanel = this.projectPanels.nth(index);
    const loadButton = projectPanel.locator('button').filter({ hasText: /^Load Project$/ });

    await loadButton.waitFor({ state: 'visible' });
    await loadButton.click();
    await this.waitForAngular();
    
    // Wait for the project to be fully loaded by checking the toolbar
    await this.page.waitForFunction(() => {
      const toolbar = document.querySelector('mat-toolbar');
      return toolbar?.textContent?.includes('Project:') && 
             !toolbar?.textContent?.includes('No Project');
    }, { timeout: 5000 });
  }

  /**
   * Load a project by name
   */
  async loadProjectByName(name: string): Promise<void> {
    const names = await this.getProjectNames();
    const index = names.indexOf(name);

    if (index === -1) {
      throw new Error(`Project with name "${name}" not found`);
    }

    await this.loadProject(index);
  }

  /**
   * Delete a project by index
   */
  async deleteProject(index: number): Promise<void> {
    await this.expandProject(index);
    await this.deleteProjectButtons.nth(index).click();
    await this.waitForAngular();
  }

  /**
   * Download a project by index
   */
  async downloadProject(index: number): Promise<void> {
    await this.expandProject(index);
    await this.downloadProjectButtons.nth(index).click();
    await this.waitForAngular();
  }

  /**
   * Edit project name by index
   */
  async editProjectName(index: number, newName: string): Promise<void> {
    await this.expandProject(index);
    const nameInput = this.projectNameInputs.nth(index);

    await nameInput.clear();
    await nameInput.fill(newName);
    await nameInput.blur(); // Trigger save
    await this.waitForAngular();
  }

  // Error handling methods

  /**
   * Trigger error boundary retry
   */
  async retryOnError(): Promise<void> {
    const retryButton = this.errorBoundary
      .locator('button')
      .filter({ hasText: 'Retry' });
    await retryButton.click();
    await this.waitForAngular();
  }

  /**
   * Verify error boundary is visible
   */
  async verifyErrorBoundaryVisible(): Promise<void> {
    await expect(this.errorBoundary).toBeVisible();
  }

  // Utility methods

  /**
   * Verify accordion structure is properly loaded
   */
  async verifyAccordionStructure(): Promise<void> {
    await expect(this.accordion).toBeVisible();
    await expect(this.importPanel).toBeVisible();

    const projectCount = await this.getProjectCount();
    if (projectCount > 0) {
      await expect(this.projectSummaries.first()).toBeVisible();
    }
  }

  /**
   * Verify sort functionality is available
   */
  async verifySortFunctionality(): Promise<void> {
    await this.openImportPanel();
    await expect(this.sortFormField).toBeVisible();
    await expect(this.sortSelect).toBeVisible();
  }

  /**
   * Verify import functionality is available
   */
  async verifyImportFunctionality(): Promise<void> {
    await this.openImportPanel();
    await expect(this.chooseFileButton).toBeVisible();
    await expect(this.importFileButton).toBeVisible();
  }
}

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Page Object for Project Inspector functionality
 * Handles interactions with the FLAM analysis and project management interface
 * Used for /project-inspector route
 */
export class ProjectInspectorPage extends BasePage {
  // FLAM Table elements
  private readonly flamCard = this.page.locator('mat-card.flam');
  private readonly flamTable = this.page.locator('table[mat-table]');
  private readonly flamTableRows = this.page.locator('table[mat-table] tr[mat-row]');
  private readonly resetColorButton = this.page.locator('button:has-text("Reset All Color Codes")');

  // Project Summary elements
  private readonly projectSummaryCard = this.page.locator('mat-card.project-summary');
  private readonly projectNameItem = this.page.locator('mat-list-item:has-text("Name:")');
  private readonly projectRowsItem = this.page.locator('mat-list-item:has-text("Rows:")');
  private readonly projectColumnsItem = this.page.locator('mat-list-item:has-text("Columns:")');
  private readonly projectBeadsItem = this.page.locator('mat-list-item:has-text("Beads:")');
  private readonly projectColorsItem = this.page.locator('mat-list-item:has-text("Colors:")');

  // Saved Position elements
  private readonly savedPositionCard = this.page.locator('mat-card.saved-position');
  private readonly resetPositionButton = this.page.locator('button:has-text("Reset Position")');
  private readonly positionDisplay = this.page.locator('mat-card.saved-position mat-list-item');

  // Project Image elements
  private readonly projectImageCard = this.page.locator('mat-card.project-image');
  private readonly projectImage = this.page.locator('mat-card.project-image img');
  private readonly imageUploadInput = this.page.locator('input[type="file"]');

  // Color editing elements
  private readonly colorInput = this.page.locator('input[matInput]');
  private readonly colorCells = this.page.locator('.color-cell-span');

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the project inspector page
   */
  override async goto(): Promise<void> {
    await super.goto('/project-inspector');
    await this.waitForPageLoad();
    await this.waitForAngular();
    await this.waitForProjectInspectorData();
  }

  /**
   * Navigate to a specific project's inspector page
   */
  async gotoProject(projectId: number): Promise<void> {
    await super.goto(`/project-inspector/${projectId}`);
    await this.waitForPageLoad();
    await this.waitForAngular();
    await this.waitForProjectInspectorData();
  }

  /**
   * Wait for project inspector specific data to load
   */
  async waitForProjectInspectorData(): Promise<void> {
    await this.waitForAngular();
    await this.waitForToolbar();

    // Wait for the main cards to be visible
    await this.waitForUIElements(['mat-card.flam', 'mat-card.project-summary'], 8000);
    await this.waitForMaterialComponents();
  }

  /**
   * Verify the project inspector page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.flamCard).toBeVisible();
    await expect(this.projectSummaryCard).toBeVisible();
    await expect(this.savedPositionCard).toBeVisible();
    await expect(this.projectImageCard).toBeVisible();
  }

  /**
   * Get the project summary card locator for test assertions
   */
  get summaryCardLocator(): Locator {
    return this.projectSummaryCard;
  }

  /**
   * Get project summary list item locators for test assertions
   */
  get summaryItemLocators() {
    return {
      name: this.projectNameItem,
      rows: this.projectRowsItem,
      columns: this.projectColumnsItem,
      beads: this.projectBeadsItem,
      colors: this.projectColorsItem
    };
  }

  /**
   * Get the current project name from the project summary
   */
  async getProjectName(): Promise<string> {
    const nameText = await this.projectNameItem.textContent();
    return nameText?.replace('Name: ', '') || '';
  }

  /**
   * Get the number of rows from the project summary
   */
  async getProjectRowCount(): Promise<number> {
    const rowsText = await this.projectRowsItem.textContent();
    const match = rowsText?.match(/Rows: (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get the number of columns (longest row) from the project summary
   */
  async getProjectColumnCount(): Promise<number> {
    try {
      const columnsText = await this.projectColumnsItem.textContent();
      const match = columnsText?.match(/Columns: (\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      // Element not found (ppinspector disabled)
      return 0;
    }
  }

  /**
   * Get the total number of beads from the project summary
   */
  async getProjectBeadCount(): Promise<number> {
    try {
      const beadsText = await this.projectBeadsItem.textContent();
      const match = beadsText?.match(/Beads: (\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      // Element not found (ppinspector disabled)
      return 0;
    }
  }

  /**
   * Get the total number of colors from the project summary
   */
  async getProjectColorCount(): Promise<number> {
    try {
      const colorsText = await this.projectColorsItem.textContent();
      const match = colorsText?.match(/Colors: (\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      // Element not found (ppinspector disabled)
      return 0;
    }
  }

  /**
   * Check if the expanded project summary is visible (with columns, beads, colors)
   */
  async isExpandedSummaryVisible(): Promise<boolean> {
    try {
      // Wait a bit for Angular change detection to propagate the setting change
      await this.page.waitForTimeout(500);

      // Check if the columns item is actually in the DOM and visible
      const isVisible = await this.projectColumnsItem.isVisible({ timeout: 2000 });
      return isVisible;
    } catch {
      // Element not found or not visible
      return false;
    }
  }

  /**
   * Check if FLAM table is visible
   */
  async isFlamTableVisible(): Promise<boolean> {
    return await this.flamTable.isVisible();
  }

  /**
   * Get the number of FLAM rows in the table
   */
  async getFlamRowCount(): Promise<number> {
    return await this.flamTableRows.count();
  }

  /**
   * Click on a color cell to start editing
   */
  async clickColorCell(rowIndex: number): Promise<void> {
    const colorCell = this.colorCells.nth(rowIndex);
    await colorCell.click();
    await this.waitForAngular();
  }

  /**
   * Enter a color code in the active color input
   */
  async enterColorCode(colorCode: string): Promise<void> {
    await this.colorInput.fill(colorCode);
    await this.colorInput.press('Enter');
    await this.waitForAngular();
  }

  /**
   * Get the color code from a specific FLAM row
   */
  async getColorCode(rowIndex: number): Promise<string> {
    const row = this.flamTableRows.nth(rowIndex);
    const colorCell = row.locator('td').nth(6); // Color column
    return await colorCell.textContent() || '';
  }

  /**
   * Check if a hex color indicator is visible for a row
   */
  async hasHexColorIndicator(rowIndex: number): Promise<boolean> {
    const row = this.flamTableRows.nth(rowIndex);
    const hexColorIndicator = row.locator('.hex-color-indicator');
    return await hexColorIndicator.isVisible();
  }

  /**
   * Reset all color codes
   */
  async resetAllColorCodes(): Promise<void> {
    await this.resetColorButton.click();
    await this.waitForAngular();
  }

  /**
   * Get the current saved position
   */
  async getSavedPosition(): Promise<{ row: number; step: number }> {
    const positionText = await this.positionDisplay.first().textContent();

    // Handle both formats: "0, 0" and "Row: 1 Step: 1"
    if (positionText?.includes('Row:')) {
      const rowMatch = positionText.match(/Row: (\d+)/);
      const stepMatch = positionText.match(/Step: (\d+)/);
      return {
        row: rowMatch ? parseInt(rowMatch[1], 10) : 0,
        step: stepMatch ? parseInt(stepMatch[1], 10) : 0
      };
    } else {
      const parts = positionText?.split(', ') || ['0', '0'];
      return {
        row: parseInt(parts[0], 10),
        step: parseInt(parts[1], 10)
      };
    }
  }

  /**
   * Reset the project position
   */
  async resetPosition(): Promise<void> {
    await this.resetPositionButton.click();
    await this.waitForAngular();
  }

  /**
   * Handle reset position confirmation dialog
   */
  async confirmResetPosition(): Promise<void> {
    // Look for confirmation dialog
    const dialog = this.page.locator('mat-dialog-container');
    if (await dialog.isVisible()) {
      const confirmButton = dialog.locator('button:has-text("Reset Position")');
      await confirmButton.click();
      await this.waitForAngular();
    }
  }

  /**
   * Cancel reset position confirmation dialog
   */
  async cancelResetPosition(): Promise<void> {
    // Look for confirmation dialog
    const dialog = this.page.locator('mat-dialog-container');
    if (await dialog.isVisible()) {
      const cancelButton = dialog.locator('button:has-text("Cancel")');
      await cancelButton.click();
      await this.waitForAngular();
    }
  }

  /**
   * Upload a project image
   */
  async uploadImage(filePath: string): Promise<void> {
    await this.projectImage.click(); // Click on image to trigger file selection
    await this.imageUploadInput.setInputFiles(filePath);
    await this.waitForAngular();
  }

  /**
   * Get the current project image source
   */
  async getImageSource(): Promise<string> {
    return await this.projectImage.getAttribute('src') || '';
  }

  /**
   * Check if the project has a custom image (not the default "no image available")
   */
  async hasCustomImage(): Promise<boolean> {
    const src = await this.getImageSource();
    return !src.includes('no-image-available.png');
  }

  /**
   * Sort the FLAM table by a specific column
   */
  async sortBy(columnName: 'key' | 'firstRow' | 'firstColumn' | 'lastRow' | 'lastColumn' | 'count' | 'color'): Promise<void> {
    const headerCell = this.page.locator(`th[mat-sort-header]:has-text("${this.getColumnDisplayName(columnName)}")`);
    await headerCell.click();
    await this.waitForAngular();
  }

  /**
   * Get the sort direction for a column
   */
  async getSortDirection(columnName: string): Promise<'asc' | 'desc' | ''> {
    const headerCell = this.page.locator(`th[mat-sort-header]:has-text("${this.getColumnDisplayName(columnName)}")`);
    const ariaSort = await headerCell.getAttribute('aria-sort');

    switch (ariaSort) {
      case 'ascending': return 'asc';
      case 'descending': return 'desc';
      default: return '';
    }
  }

  /**
   * Verify that the project is loaded (not "No Project")
   */
  async verifyProjectLoaded(): Promise<void> {
    await this.waitForProjectContext(); // This now waits for actual project, not "No Project"
    const projectName = await this.getProjectName();
    expect(projectName).not.toBe('No Project');
    expect(projectName).not.toBe('');
  }

  /**
   * Get a FLAM row by key value
   */
  async getFlamRowByKey(key: string): Promise<Locator> {
    return this.flamTableRows.filter({ has: this.page.locator(`td:has-text("${key}")`) }).first();
  }

  /**
   * Get the column display name for header identification
   */
  private getColumnDisplayName(columnName: string): string {
    const columnMap: Record<string, string> = {
      'key': 'Key',
      'firstRow': 'First Row',
      'firstColumn': 'First Column',
      'lastRow': 'Last Row',
      'lastColumn': 'Last Column',
      'count': 'Count',
      'color': 'Color'
    };
    return columnMap[columnName] || columnName;
  }
}

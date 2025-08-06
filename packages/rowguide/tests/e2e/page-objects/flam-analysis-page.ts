import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Page Object for FLAM Analysis functionality
 * Handles interactions with the dedicated FLAM analysis interface
 * Used for /flam-analysis route
 */
export class FlamAnalysisPage extends BasePage {
  // Error Boundary elements
  private readonly errorBoundary = this.page.locator('app-error-boundary');
  private readonly retryButton = this.page.locator('button:has-text("Retry")');
  private readonly errorMessage = this.page.locator('.error-message');

  // FLAM Table elements
  private readonly flamCard = this.page.locator('mat-card.flam');
  private readonly flamTable = this.page.locator('table[mat-table]');
  private readonly flamTableRows = this.page.locator('table[mat-table] tr[mat-row]');
  private readonly flamTableHeaders = this.page.locator('table[mat-table] th[mat-header-cell]');
  private readonly sortHeaders = this.page.locator('th[mat-header-cell][mat-sort-header]');

  // FLAM Table specific columns
  private readonly keyColumn = this.page.locator('td[mat-cell]:nth-child(1)');
  private readonly firstRowColumn = this.page.locator('td[mat-cell]:nth-child(2)');
  private readonly firstColumnColumn = this.page.locator('td[mat-cell]:nth-child(3)');
  private readonly lastRowColumn = this.page.locator('td[mat-cell]:nth-child(4)');
  private readonly lastColumnColumn = this.page.locator('td[mat-cell]:nth-child(5)');
  private readonly countColumn = this.page.locator('td[mat-cell]:nth-child(6)');
  private readonly colorColumn = this.page.locator('td[mat-cell]:nth-child(7)');
  private readonly hexColorColumn = this.page.locator('td[mat-cell]:nth-child(8)');

  // Color editing elements
  private readonly colorInput = this.page.locator('input[matInput][type="text"]');
  private readonly colorCells = this.page.locator('.color-cell-span');
  private readonly resetColorButton = this.page.locator('button:has-text("Reset All Color Codes")');

  // Loading and empty states
  private readonly loadingIndicator = this.page.locator('mat-spinner');
  private readonly emptyMessage = this.page.locator('.empty-message');
  private readonly noDataMessage = this.page.locator('.no-data-message');

  // Navigation elements
  private readonly pageTitle = this.page.locator('h1, h2, .page-title');
  private readonly breadcrumb = this.page.locator('mat-breadcrumb, .breadcrumb');

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the FLAM analysis page
   */
  override async goto(): Promise<void> {
    await super.goto('/flam-analysis');
    await this.waitForPageLoad();
    await this.waitForAngular();
    await this.waitForFlamAnalysisData();
  }

  /**
   * Wait for FLAM analysis specific data to load
   */
  async waitForFlamAnalysisData(): Promise<void> {
    try {
      // Wait for either the table to load or an error to appear
      await Promise.race([
        this.flamTable.waitFor({ timeout: 10000 }),
        this.errorMessage.waitFor({ timeout: 10000 }),
        this.noDataMessage.waitFor({ timeout: 10000 })
      ]);
    } catch (error) {
      console.warn('FLAM analysis data did not load within timeout');
    }
  }

  /**
   * Check if the FLAM table is visible and contains data
   */
  async isFlamTableVisible(): Promise<boolean> {
    try {
      await this.flamTable.waitFor({ timeout: 5000 });
      const rowCount = await this.flamTableRows.count();
      return rowCount > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the number of FLAM table rows
   */
  async getFlamTableRowCount(): Promise<number> {
    try {
      await this.flamTable.waitFor({ timeout: 3000 });
      return await this.flamTableRows.count();
    } catch {
      // Return 0 if table is not visible (no data scenario)
      return 0;
    }
  }

  /**
   * Get FLAM data for a specific row
   */
  async getFlamRowData(rowIndex: number): Promise<{
    key: string;
    firstRow: string;
    firstColumn: string;
    lastRow: string;
    lastColumn: string;
    count: string;
    color: string;
    hexColor: string;
  }> {
    const row = this.flamTableRows.nth(rowIndex);
    await row.waitFor();

    return {
      key: await row.locator('td').nth(0).textContent() || '',
      firstRow: await row.locator('td').nth(1).textContent() || '',
      firstColumn: await row.locator('td').nth(2).textContent() || '',
      lastRow: await row.locator('td').nth(3).textContent() || '',
      lastColumn: await row.locator('td').nth(4).textContent() || '',
      count: await row.locator('td').nth(5).textContent() || '',
      color: (await row.locator('td').nth(6).textContent() || '').trim(),
      hexColor: await row.locator('td').nth(7).textContent() || ''
    };
  }

  /**
   * Click on a sortable column header
   */
  async sortByColumn(columnName: 'key' | 'firstRow' | 'firstColumn' | 'lastRow' | 'lastColumn' | 'count'): Promise<void> {
    const columnSelector = this.getSortHeaderSelector(columnName);
    await this.page.locator(columnSelector).click();
    await this.waitForTableUpdate();
  }

  /**
   * Get the sort header selector for a column
   */
  private getSortHeaderSelector(columnName: string): string {
    const columnMap: Record<string, string> = {
      'key': 'th[mat-sort-header]:has-text("Key")',
      'firstRow': 'th[mat-sort-header]:has-text("First Row")',
      'firstColumn': 'th[mat-sort-header]:has-text("First Column")',
      'lastRow': 'th[mat-sort-header]:has-text("Last Row")',
      'lastColumn': 'th[mat-sort-header]:has-text("Last Column")',
      'count': 'th[mat-sort-header]:has-text("Count")'
    };
    return columnMap[columnName] || `th[mat-sort-header]:has-text("${columnName}")`;
  }

  /**
   * Wait for table to update after sorting or filtering
   */
  async waitForTableUpdate(): Promise<void> {
    await this.page.waitForTimeout(500); // Brief pause for animations
    await this.waitForAngular();
  }

  /**
   * Edit color for a specific FLAM entry
   */
  async editColor(rowIndex: number, newColor: string): Promise<void> {
    const row = this.flamTableRows.nth(rowIndex);
    const colorCell = row.locator('td').nth(6); // Color column (7th column, 0-indexed)

    // Click on the color cell to activate editing
    await colorCell.click();

    // Wait for the input to appear and be focused
    const input = colorCell.locator('input[matInput]');
    await input.waitFor();

    // Clear existing value and type new color
    await input.fill('');
    await input.type(newColor);

    // Press Enter or click elsewhere to confirm the edit
    await input.press('Enter');
    await this.waitForTableUpdate();
  }

  /**
   * Reset all color codes
   */
  async resetAllColors(): Promise<void> {
    await this.resetColorButton.click();
    await this.waitForTableUpdate();
  }

  /**
   * Check if error boundary is displayed
   */
  async isErrorBoundaryVisible(): Promise<boolean> {
    try {
      await this.errorBoundary.waitFor({ timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Click the retry button in error boundary
   */
  async clickRetry(): Promise<void> {
    await this.retryButton.click();
    await this.waitForFlamAnalysisData();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor();
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if the page is in loading state
   */
  async isLoading(): Promise<boolean> {
    try {
      await this.loadingIndicator.waitFor({ timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if no data message is displayed
   */
  async isNoDataMessageVisible(): Promise<boolean> {
    try {
      await this.noDataMessage.waitFor({ timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all column headers
   */
  async getColumnHeaders(): Promise<string[]> {
    await this.flamTable.waitFor();
    const headers = await this.flamTableHeaders.allTextContents();
    return headers.filter(header => header.trim() !== '');
  }

  /**
   * Verify table structure
   */
  async verifyTableStructure(): Promise<void> {
    const headers = await this.getColumnHeaders();
    const expectedHeaders = ['Key', 'First Row', 'First Column', 'Last Row', 'Last Column', 'Count', 'Color'];

    expect(headers).toEqual(expectedHeaders);
  }

  /**
   * Wait for Angular specific to FLAM analysis
   */
  override async waitForAngular(): Promise<void> {
    await this.page.evaluate(() => {
      return new Promise((resolve) => {
        if (window.getAllAngularTestabilities) {
          const testabilities = window.getAllAngularTestabilities();
          let count = testabilities.length;
          if (count === 0) resolve(undefined);
          testabilities.forEach((testability) => {
            testability.whenStable(() => {
              count--;
              if (count === 0) resolve(undefined);
            });
          });
        } else {
          resolve(undefined);
        }
      });
    });
  }

  /**
   * Navigate using sidenav
   */
  async navigateFromSidenav(): Promise<void> {
    const sidenavToggle = this.page.locator('button[mat-icon-button]:has(mat-icon:text("menu"))');
    const flamAnalysisLink = this.page.locator('a[routerLink="/flam-analysis"], a:has-text("FLAM Analysis")');

    // Open sidenav if it's not already open
    if (await sidenavToggle.isVisible()) {
      await sidenavToggle.click();
    }

    // Click on FLAM Analysis link
    await flamAnalysisLink.click();
    await this.waitForPageLoad();
    await this.waitForFlamAnalysisData();
  }

  /**
   * Verify responsive behavior
   */
  async verifyResponsiveBehavior(): Promise<void> {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);

    const isMobileTableVisible = await this.flamTable.isVisible();
    expect(isMobileTableVisible).toBe(true);

    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(500);

    const isTabletTableVisible = await this.flamTable.isVisible();
    expect(isTabletTableVisible).toBe(true);

    // Test desktop viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.waitForTimeout(500);

    const isDesktopTableVisible = await this.flamTable.isVisible();
    expect(isDesktopTableVisible).toBe(true);
  }

  /**
   * Test keyboard navigation through sortable headers
   */
  async testKeyboardNavigation(): Promise<void> {
    // Focus on the page and use Tab to navigate to sortable headers
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Enter');

    // Verify sorting occurred
    await this.waitForTableUpdate();
  }

  /**
   * Wait for sort to be applied to the table
   * Used specifically for sort persistence testing
   */
  async waitForSortApplication(): Promise<void> {
    // Wait for sort indicator to appear
    await this.page.waitForTimeout(300); // Brief pause for sort to be applied

    // Wait for any sort-related DOM changes to complete
    await this.waitForAngular();

    // Additional wait for table data to be re-sorted
    await this.page.waitForTimeout(200);
  }

  /**
   * Capture the current sorted order of the table
   * Returns an array of row keys in their current display order
   */
  async captureSortedOrder(): Promise<string[]> {
    await this.flamTable.waitFor();
    const rowCount = await this.getFlamTableRowCount();
    const sortedOrder: string[] = [];

    for (let i = 0; i < rowCount; i++) {
      const rowData = await this.getFlamRowData(i);
      sortedOrder.push(rowData.key);
    }

    return sortedOrder;
  }

  /**
   * Verify that sort indicators are visible on the expected column
   */
  async verifySortIndicators(columnName: 'key' | 'firstRow' | 'firstColumn' | 'lastRow' | 'lastColumn' | 'count'): Promise<void> {
    const columnSelector = this.getSortHeaderSelector(columnName);
    const header = this.page.locator(columnSelector);

    // Verify the header container has the sorted class (not the th element itself)
    const headerContainer = header.locator('.mat-sort-header-container');
    await expect(headerContainer).toHaveClass(/mat-sort-header-sorted/);

    // Verify the sort arrow is visible
    const sortArrow = header.locator('.mat-sort-header-arrow');
    await expect(sortArrow).toBeVisible();
  }

  /**
   * Get the current sort state from the DOM
   */
  async getSortState(): Promise<{active: string, direction: 'asc' | 'desc' | ''}> {
    // Find the currently sorted header - look for the container with the sorted class
    const sortedContainer = this.page.locator('.mat-sort-header-container.mat-sort-header-sorted').first();

    if (await sortedContainer.count() === 0) {
      return { active: '', direction: '' };
    }

    // Get the parent th element
    const sortedHeader = sortedContainer.locator('..'); // Parent th element

    // Extract the column name from the header text
    const headerText = await sortedHeader.textContent() || '';
    const active = this.getColumnKeyFromHeaderText(headerText);

    // Determine sort direction from classes on the container
    const hasAsc = await sortedContainer.evaluate((el) => el.classList.contains('mat-sort-header-ascending'));
    const hasDesc = await sortedContainer.evaluate((el) => el.classList.contains('mat-sort-header-descending'));

    let direction: 'asc' | 'desc' | '' = '';
    if (hasAsc) direction = 'asc';
    else if (hasDesc) direction = 'desc';

    return { active, direction };
  }

  /**
   * Helper to map header text to column key
   */
  private getColumnKeyFromHeaderText(headerText: string): string {
    const textToKeyMap: Record<string, string> = {
      'Key': 'key',
      'First Row': 'firstRow',
      'First Column': 'firstColumn',
      'Last Row': 'lastRow',
      'Last Column': 'lastColumn',
      'Count': 'count'
    };
    return textToKeyMap[headerText.trim()] || '';
  }

  /**
   * Trigger a data refresh by performing an action that calls refreshTableData
   */
  async triggerDataRefresh(): Promise<void> {
    // Edit and then immediately reset a color to trigger refreshTableData
    if (await this.getFlamTableRowCount() > 0) {
      await this.editColor(0, 'TEMP123');
      await this.page.waitForTimeout(100);
      await this.editColor(0, ''); // Reset to empty
      await this.waitForTableUpdate();
    }
  }

  /**
   * Verify the store state contains the expected sort preferences
   */
  async verifyStoreState(expectedSort: {active: string, direction: string}): Promise<boolean> {
    const flamSortValue = await this.page.evaluate(() => {
      // Access the Angular injector to get the store
      const appElement = document.querySelector('app-root');
      if (appElement && (appElement as any).ngComponent) {
        const injector = (appElement as any).ngComponent.injector;
        const store = injector.get('ReactiveStateStore');
        return store?.getState?.()?.settings?.flamsort; // Note: lowercase 'flamsort'
      }
      return null;
    });

    if (!flamSortValue) return false;

    // Convert expected sort to flam sort format (e.g., "countAsc", "keyDesc")
    const expectedFlamSort = expectedSort.active +
      expectedSort.direction.charAt(0).toUpperCase() +
      expectedSort.direction.slice(1);

    return flamSortValue === expectedFlamSort;
  }
}

// Extend the global Window interface for Angular testability
declare global {
  interface Window {
    getAllAngularTestabilities?: () => any[];
  }
}

// Extend the global Window interface for Angular testability
declare global {
  interface Window {
    getAllAngularTestabilities?: () => any[];
  }
}

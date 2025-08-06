import { test, expect } from '../fixtures/test-fixtures';
import { TestDbUtils, TestDataFactory } from '../utils/test-helpers';

test.describe('FLAM Analysis Navigation', () => {
  test.beforeEach(async ({ projectViewPage }) => {
    // Start from the project view page
    await projectViewPage.goto();
    await projectViewPage.waitForAngular();
  });

  test('should navigate to FLAM Analysis via sidenav', async ({ projectViewPage, flamAnalysisPage }) => {
    // Open sidenav and navigate to FLAM Analysis
    await projectViewPage.openSideNav();
    await projectViewPage.navigateViaMenu('flam-analysis');

    // Verify we're on the FLAM Analysis page
    expect(projectViewPage.getCurrentUrl()).toContain('/flam-analysis');

    // Wait for FLAM data to load (or no data message to appear)
    await flamAnalysisPage.waitForFlamAnalysisData();

    // Verify page loads correctly - either table with data or no data message
    const isFlamTableVisible = await flamAnalysisPage.isFlamTableVisible();
    const hasNoData = await flamAnalysisPage.isNoDataMessageVisible();

    // Either table should be visible OR no data message should be shown
    expect(isFlamTableVisible || hasNoData).toBe(true);
  });

  test('should navigate directly to FLAM Analysis URL', async ({ flamAnalysisPage }) => {
    // Navigate directly to the FLAM Analysis URL
    await flamAnalysisPage.goto();

    // Verify we're on the correct page
    expect(flamAnalysisPage.getCurrentUrl()).toContain('/flam-analysis');

    // Verify the page loads correctly
    await flamAnalysisPage.waitForFlamAnalysisData();
    const isFlamTableVisible = await flamAnalysisPage.isFlamTableVisible();
    const hasNoData = await flamAnalysisPage.isNoDataMessageVisible();

    // Either table should be visible OR no data message should be shown
    expect(isFlamTableVisible || hasNoData).toBe(true);
  });

  test('should handle navigation back from FLAM Analysis', async ({ page, projectViewPage, flamAnalysisPage }) => {
    // Navigate to FLAM Analysis
    await flamAnalysisPage.goto();
    await flamAnalysisPage.waitForFlamAnalysisData();

    // Use browser back navigation
    await page.goBack();
    await projectViewPage.waitForProjectViewData();

    // Verify we're back to the project view
    expect(projectViewPage.getCurrentUrl()).toContain('/project');
  });

  test('should navigate between FLAM Analysis and other pages', async ({
    projectViewPage,
    flamAnalysisPage,
    projectSelectorPage,
    settingsPage
  }) => {
    // Start at FLAM Analysis
    await flamAnalysisPage.goto();
    await flamAnalysisPage.waitForFlamAnalysisData();

    // Navigate to Project Selector via sidenav
    await projectViewPage.openSideNav();
    await projectViewPage.navigateViaMenu('project-selector');
    await projectSelectorPage.waitForProjectSelectorData();
    expect(projectViewPage.getCurrentUrl()).toContain('/project-selector');

    // Navigate to Settings via sidenav
    await projectViewPage.openSideNav();
    await projectViewPage.navigateViaMenu('settings');
    await settingsPage.waitForSettingsData();
    expect(projectViewPage.getCurrentUrl()).toContain('/settings');

    // Navigate back to FLAM Analysis via sidenav
    await projectViewPage.openSideNav();
    await projectViewPage.navigateViaMenu('flam-analysis');
    await flamAnalysisPage.waitForFlamAnalysisData();
    expect(projectViewPage.getCurrentUrl()).toContain('/flam-analysis');
  });

  test('should maintain responsive navigation on mobile', async ({ page, projectViewPage, flamAnalysisPage }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to FLAM Analysis via mobile sidenav
    await projectViewPage.openSideNav();
    await projectViewPage.navigateViaMenu('flam-analysis');

    // Verify navigation works on mobile
    expect(projectViewPage.getCurrentUrl()).toContain('/flam-analysis');
    await flamAnalysisPage.waitForFlamAnalysisData();

    // Verify responsive behavior - either table or no data message
    const isFlamTableVisible = await flamAnalysisPage.isFlamTableVisible();
    const hasNoData = await flamAnalysisPage.isNoDataMessageVisible();

    // Either table should be visible OR no data message should be shown
    expect(isFlamTableVisible || hasNoData).toBe(true);
  });
});

test.describe('FLAM Analysis Functionality', () => {
  test.beforeEach(async ({ page, projectSelectorPage, flamAnalysisPage }) => {
    // Seed test data with a project that will generate FLAM data
    const testProject = TestDataFactory.createComplexProjectData();
    await TestDbUtils.seedProjectData(page, [testProject]);

    // Navigate to project selector and load the test project
    await projectSelectorPage.goto();
    await projectSelectorPage.waitForProjectSelectorData();

    // Load the first (and only) project
    await projectSelectorPage.loadProject(0);

    // CRITICAL: Refresh the page to ensure project is properly loaded into application state
    // This matches the manual behavior where refreshing after "Load Project" makes it work
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for project to be loaded, then navigate to FLAM analysis
    await flamAnalysisPage.goto();
    await flamAnalysisPage.waitForFlamAnalysisData();
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data
    await TestDbUtils.clearDatabase(page);
  });

  test('should display FLAM table with correct structure', async ({ flamAnalysisPage }) => {
    // Verify table structure with loaded project data
    await flamAnalysisPage.verifyTableStructure();

    // Check that we have data rows (should have multiple pattern elements)
    const rowCount = await flamAnalysisPage.getFlamTableRowCount();
    expect(rowCount).toBeGreaterThan(0);

    // Verify column headers
    const headers = await flamAnalysisPage.getColumnHeaders();
    expect(headers).toContain('Key');
    expect(headers).toContain('First Row');
    expect(headers).toContain('Last Row');
    expect(headers).toContain('Count');
    expect(headers).toContain('Color');

    // Verify we have actual pattern elements (A, B, C, D, E, F, G, H from complex project)
    const firstRowData = await flamAnalysisPage.getFlamRowData(0);
    expect(firstRowData.key).toMatch(/^[A-H]$/);
    expect(parseInt(firstRowData.count)).toBeGreaterThan(0);
  });

  test('should handle table sorting', async ({ flamAnalysisPage }) => {
    // Get initial first row data
    const initialFirstRow = await flamAnalysisPage.getFlamRowData(0);

    // Sort by count column
    await flamAnalysisPage.sortByColumn('count');

    // Get new first row data
    const sortedFirstRow = await flamAnalysisPage.getFlamRowData(0);

    // Verify sorting occurred (data should be different or in different order)
    // Since we're sorting by count, the counts should be in ascending order
    const rowCount = await flamAnalysisPage.getFlamTableRowCount();
    if (rowCount > 1) {
      const secondRowData = await flamAnalysisPage.getFlamRowData(1);
      const firstCount = parseInt(sortedFirstRow.count);
      const secondCount = parseInt(secondRowData.count);
      expect(firstCount).toBeLessThanOrEqual(secondCount);
    }
  });

  test('REGRESSION: sort order should persist after color editing', async ({ flamAnalysisPage }) => {
    // Step 1: Apply initial sort by count (ascending)
    await flamAnalysisPage.sortByColumn('count');

    // Capture initial sorted order
    const initialFirstRow = await flamAnalysisPage.getFlamRowData(0);
    const initialSecondRow = await flamAnalysisPage.getFlamRowData(1);

    // Verify initial sort is applied correctly (count ascending)
    const initialFirstCount = parseInt(initialFirstRow.count);
    const initialSecondCount = parseInt(initialSecondRow.count);
    expect(initialFirstCount).toBeLessThanOrEqual(initialSecondCount);

    // Step 2: Edit a color (this triggers refreshTableData())
    await flamAnalysisPage.editColor(0, 'DB0001');

    // Step 3: Verify sort order is maintained after color edit
    const afterEditFirstRow = await flamAnalysisPage.getFlamRowData(0);
    const afterEditSecondRow = await flamAnalysisPage.getFlamRowData(1);

    // Sort should be preserved
    expect(afterEditFirstRow.key).toBe(initialFirstRow.key);
    expect(afterEditSecondRow.key).toBe(initialSecondRow.key);

    // Verify count-based sort is still maintained
    const afterEditFirstCount = parseInt(afterEditFirstRow.count);
    const afterEditSecondCount = parseInt(afterEditSecondRow.count);
    expect(afterEditFirstCount).toBeLessThanOrEqual(afterEditSecondCount);
  });

  test('REGRESSION: sort order should persist after reset all colors', async ({ flamAnalysisPage }) => {
    // Step 1: Apply sort by key (alphabetical) - click twice to ensure ascending
    await flamAnalysisPage.sortByColumn('key');
    await flamAnalysisPage.sortByColumn('key'); // Second click to ensure ascending order

    // Capture initial sorted order
    const initialFirstRow = await flamAnalysisPage.getFlamRowData(0);
    const initialSecondRow = await flamAnalysisPage.getFlamRowData(1);

    // Verify alphabetical sort is applied
    expect(initialFirstRow.key.localeCompare(initialSecondRow.key)).toBeLessThanOrEqual(0);

    // Step 2: Set some colors first, then reset all (triggers refreshTableData())
    await flamAnalysisPage.editColor(0, 'DB0001');
    await flamAnalysisPage.editColor(1, 'DB0002');
    await flamAnalysisPage.resetAllColors();

    // Step 3: Verify sort order is maintained after reset
    const afterResetFirstRow = await flamAnalysisPage.getFlamRowData(0);
    const afterResetSecondRow = await flamAnalysisPage.getFlamRowData(1);

    // Sort should be preserved
    expect(afterResetFirstRow.key).toBe(initialFirstRow.key);
    expect(afterResetSecondRow.key).toBe(initialSecondRow.key);

    // Verify alphabetical sort is still maintained
    expect(afterResetFirstRow.key.localeCompare(afterResetSecondRow.key)).toBeLessThanOrEqual(0);
  });

  test('REGRESSION: sort preferences should survive page refresh', async ({ page, flamAnalysisPage }) => {
    // This test captures the user's specific reported issue:
    // "sort persistence started working again when navigating, but not when refreshing the page"

    // Step 1: Apply a sort order that will be obvious if lost
    await flamAnalysisPage.sortByColumn('count');

    // Capture the sorted order before refresh
    const beforeRefreshFirstRow = await flamAnalysisPage.getFlamRowData(0);
    const beforeRefreshSecondRow = await flamAnalysisPage.getFlamRowData(1);

    // Verify initial sort is working (sanity check)
    const beforeFirstCount = parseInt(beforeRefreshFirstRow.count);
    const beforeSecondCount = parseInt(beforeRefreshSecondRow.count);
    expect(beforeFirstCount).toBeLessThanOrEqual(beforeSecondCount);

    // Step 2: Perform a hard page refresh (browser refresh)
    await page.reload({ waitUntil: 'networkidle' });

    // Step 3: Navigate back to FLAM analysis and wait for data to load
    await flamAnalysisPage.goto();
    await flamAnalysisPage.waitForFlamAnalysisData();

    // Step 4: Verify sort order is restored after refresh
    const afterRefreshFirstRow = await flamAnalysisPage.getFlamRowData(0);
    const afterRefreshSecondRow = await flamAnalysisPage.getFlamRowData(1);

    // Sort should survive page refresh
    expect(afterRefreshFirstRow.key).toBe(beforeRefreshFirstRow.key);
    expect(afterRefreshSecondRow.key).toBe(beforeRefreshSecondRow.key);

    // Verify the actual sort logic is still working
    const afterFirstCount = parseInt(afterRefreshFirstRow.count);
    const afterSecondCount = parseInt(afterRefreshSecondRow.count);
    expect(afterFirstCount).toBeLessThanOrEqual(afterSecondCount);
  });

  test('should handle color editing', async ({ flamAnalysisPage }) => {
    // Get initial color value
    const initialRowData = await flamAnalysisPage.getFlamRowData(0);
    const newColor = 'DB0001';

    // Edit the color
    await flamAnalysisPage.editColor(0, newColor);

    // Verify color was updated
    const updatedRowData = await flamAnalysisPage.getFlamRowData(0);
    expect(updatedRowData.color).toBe(newColor);
  });

  test('should handle reset all colors', async ({ flamAnalysisPage }) => {
    // First, set some colors
    await flamAnalysisPage.editColor(0, 'DB0001');
    const rowCount = await flamAnalysisPage.getFlamTableRowCount();
    if (rowCount > 1) {
      await flamAnalysisPage.editColor(1, 'DB0002');
    }

    // Reset all colors
    await flamAnalysisPage.resetAllColors();

    // Verify colors were reset (should be empty)
    const firstRowData = await flamAnalysisPage.getFlamRowData(0);
    expect(firstRowData.color).toBe('');

    if (rowCount > 1) {
      const secondRowData = await flamAnalysisPage.getFlamRowData(1);
      expect(secondRowData.color).toBe('');
    }
  });

  test('should handle error states gracefully', async ({ flamAnalysisPage }) => {
    // Check if error boundary is visible (in case of errors)
    const hasError = await flamAnalysisPage.isErrorBoundaryVisible();

    if (hasError) {
      // Test retry functionality
      await flamAnalysisPage.clickRetry();
      await flamAnalysisPage.waitForFlamAnalysisData();

      // Verify recovery
      const isTableVisible = await flamAnalysisPage.isFlamTableVisible();
      expect(isTableVisible).toBe(true);
    } else {
      // If no error, verify normal operation
      const isTableVisible = await flamAnalysisPage.isFlamTableVisible();
      expect(isTableVisible).toBe(true);
    }
  });

  test('should display correct FLAM data for pattern elements', async ({ flamAnalysisPage }) => {
    // Test that FLAM data is accurately calculated for our test pattern
    const rowCount = await flamAnalysisPage.getFlamTableRowCount();
    expect(rowCount).toBeGreaterThan(0);

    // Verify pattern elements exist and have reasonable data
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const rowData = await flamAnalysisPage.getFlamRowData(i);

      // Key should be a single letter (A-H from our test pattern)
      expect(rowData.key).toMatch(/^[A-H]$/);

      // First row should be 1-based (displayed as row + 1)
      const firstRow = parseInt(rowData.firstRow);
      expect(firstRow).toBeGreaterThanOrEqual(1);
      expect(firstRow).toBeLessThanOrEqual(5);

      // Last row should be >= first row
      const lastRow = parseInt(rowData.lastRow);
      expect(lastRow).toBeGreaterThanOrEqual(firstRow);
      expect(lastRow).toBeLessThanOrEqual(5);

      // Count should be positive
      const count = parseInt(rowData.count);
      expect(count).toBeGreaterThan(0);

      // First and last columns should be valid (1-based)
      const firstColumn = parseInt(rowData.firstColumn);
      const lastColumn = parseInt(rowData.lastColumn);
      expect(firstColumn).toBeGreaterThanOrEqual(1);
      expect(lastColumn).toBeGreaterThanOrEqual(1);
    }
  });

  test('should maintain responsive behavior', async ({ page, flamAnalysisPage }) => {
    // Test responsive behavior across different screen sizes
    await flamAnalysisPage.verifyResponsiveBehavior();
  });
});

test.describe('FLAM Analysis Accessibility', () => {
  test.beforeEach(async ({ page, projectSelectorPage, flamAnalysisPage }) => {
    // Seed test data
    const testProject = TestDataFactory.createProjectData();
    await TestDbUtils.seedProjectData(page, [testProject]);

    // Load project and navigate to FLAM analysis
    await projectSelectorPage.goto();
    await projectSelectorPage.loadProject(0);
    await flamAnalysisPage.goto();
    await flamAnalysisPage.waitForFlamAnalysisData();
  });

  test.afterEach(async ({ page }) => {
    await TestDbUtils.clearDatabase(page);
  });

  test('should be accessible to screen readers', async ({ flamAnalysisPage }) => {
    // Check accessibility of the page
    await flamAnalysisPage.checkAccessibility();
  });

  test('should support keyboard navigation', async ({ flamAnalysisPage }) => {
    // Test keyboard navigation through sortable headers
    const headers = await flamAnalysisPage.getColumnHeaders();

    if (headers.length > 0) {
      // Test keyboard navigation
      await flamAnalysisPage.testKeyboardNavigation();
    }
  });
});

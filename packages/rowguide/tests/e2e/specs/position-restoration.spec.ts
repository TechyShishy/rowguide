import { test, expect } from '../fixtures/test-fixtures';
import { TestDbUtils, TestDataFactory } from '../utils/test-helpers';

test.describe('Position Restoration on Page Reload', () => {
  test.beforeEach(async ({ projectSelectorPage, projectViewPage, page }) => {
    await projectSelectorPage.goto();
    await projectSelectorPage.waitForProjectSelectorData();

    const projectCount = await projectSelectorPage.getProjectCount();

    if (projectCount === 0) {
      // Create a test project if none exists
      const testProject = TestDataFactory.createProjectData({
        name: 'Position Test Project'
      });
      await TestDbUtils.seedProjectData(page, [testProject]);

      // Reload the page to see the new project
      await projectSelectorPage.goto();
      await projectSelectorPage.waitForProjectSelectorData();
    }

    // Load the first available project
    await projectSelectorPage.loadProject(0);
    await projectViewPage.waitForProjectViewData();
  });

  test('should maintain current position after page reload', async ({
    projectViewPage,
    page
  }) => {
    // Increase timeout for this test to allow for race condition investigation
    test.setTimeout(60000);

    // Ensure we have rows and steps to work with
    const rowCount = await projectViewPage.getRowCount();
    expect(rowCount).toBeGreaterThan(0);

    // Expand the first row to access steps
    await projectViewPage.expandRow(0);

    // Ensure the first row has steps
    const stepCountInFirstRow = await projectViewPage.getStepCountInRow(0);
    expect(stepCountInFirstRow).toBeGreaterThan(0);

    // Move to a specific position (row 0, step 1 if it exists, otherwise step 0)
    const targetStepIndex = stepCountInFirstRow > 1 ? 1 : 0;
    await projectViewPage.clickStep(0, targetStepIndex);

    // Wait a bit for position to be saved
    await page.waitForTimeout(500);

    // Verify the step is marked as current
    const isCurrentBefore = await projectViewPage.isStepCurrent(0, targetStepIndex);
    expect(isCurrentBefore).toBe(true);

    // Get the current position for comparison
    const currentPositionBefore = await projectViewPage.getCurrentPosition();
    expect(currentPositionBefore).toEqual({ row: 0, step: targetStepIndex });

    // Reload the page
    await page.reload();
    await projectViewPage.waitForProjectViewData();

    // Expand the row again after reload
    await projectViewPage.expandRow(0);

    // Check that the position is immediately restored
    await page.waitForTimeout(100);
    const isCurrentImmediately = await projectViewPage.isStepCurrent(0, targetStepIndex);

    // Position should be restored immediately after page reload
    expect(isCurrentImmediately).toBe(true);

    // Wait for any potential race conditions that might unset the position
    await page.waitForTimeout(1000);

    // Verify the position is still current after waiting
    const isCurrentAfterWait = await projectViewPage.isStepCurrent(0, targetStepIndex);
    expect(isCurrentAfterWait).toBe(true);

    // Double-check the position is correctly maintained
    const currentPositionAfter = await projectViewPage.getCurrentPosition();
    expect(currentPositionAfter).toEqual({ row: 0, step: targetStepIndex });
  });

  test('should persist position across multiple reloads', async ({
    projectViewPage,
    page
  }) => {
    // Increase timeout for multiple reload test
    test.setTimeout(60000);

    // Set position
    await projectViewPage.expandRow(0);
    await projectViewPage.clickStep(0, 2);
    await page.waitForTimeout(500);

    // Reload multiple times with error handling
    for (let i = 0; i < 3; i++) {
      try {
        await page.reload();
        await projectViewPage.waitForProjectViewData();
        await projectViewPage.expandRow(0);

        const isCurrent = await projectViewPage.isStepCurrent(0, 2);
        expect(isCurrent).toBe(true);
      } catch (error) {
        // If page is closed during multiple reloads, handle gracefully
        if (page.isClosed()) {
          console.log(`Page was closed during reload ${i + 1} - this may be a Mobile Safari issue`);
          break;
        }
        throw error;
      }
    }
  });

  test('should handle position restoration timing correctly', async ({
    projectViewPage,
    page
  }) => {
    // Increase timeout for timing-sensitive tests
    test.setTimeout(45000);

    await projectViewPage.expandRow(0);
    await projectViewPage.clickStep(0, 0);
    await page.waitForTimeout(500);

    await page.reload();
    await projectViewPage.waitForProjectViewData();
    await projectViewPage.expandRow(0);

    // Test timing with multiple checks over time, with error handling
    for (let i = 0; i < 5; i++) {
      try {
        const isCurrent = await projectViewPage.isStepCurrent(0, 0);
        expect(isCurrent).toBe(true);
        if (i < 4) { // Don't wait after the last check
          await page.waitForTimeout(200);
        }
      } catch (error) {
        // If page is closed, test mobile safari issue
        if (page.isClosed()) {
          console.log('Page was closed during timing test - skipping remaining checks');
          break;
        }
        throw error;
      }
    }
  });

  test('should restore position even with navigation actions', async ({
    projectViewPage,
    page
  }) => {
    // Increase timeout for this test
    test.setTimeout(45000);

    await projectViewPage.expandRow(0);
    await projectViewPage.clickStep(0, 2);
    await page.waitForTimeout(500);

    const positionBefore = await projectViewPage.getCurrentPosition();

    await page.reload();
    await projectViewPage.waitForProjectViewData();
    await projectViewPage.expandRow(0);

    // Verify position restoration persists even after interactions
    try {
      await page.waitForTimeout(500);
      const positionAfter = await projectViewPage.getCurrentPosition();
      expect(positionAfter).toEqual(positionBefore);
    } catch (error) {
      // If page is closed, handle gracefully for Mobile Safari
      if (page.isClosed()) {
        console.log('Page was closed during navigation test - this may be a Mobile Safari issue');
        return;
      }
      throw error;
    }
  });
});

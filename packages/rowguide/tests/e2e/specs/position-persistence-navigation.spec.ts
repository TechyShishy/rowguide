import { test, expect } from '../fixtures/test-fixtures';
import { TestDbUtils, TestDataFactory } from '../utils/test-helpers';

test.describe('Position Persistence During Navigation', () => {
  test.beforeEach(async ({ projectSelectorPage, projectViewPage, page }) => {
    await projectSelectorPage.goto();
    await projectSelectorPage.waitForProjectSelectorData();

    const projectCount = await projectSelectorPage.getProjectCount();

    if (projectCount === 0) {
      // Create a test project if none exists
      const testProject = TestDataFactory.createProjectData({
        name: 'Race Condition Test Project'
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

  test('should preserve position during project inspector ↔ project navigation', async ({
    projectViewPage,
    projectInspectorPage,
    page
  }) => {
    // Increase timeout for this navigation test
    test.setTimeout(60000);

    // Ensure we have rows and steps to work with (exact pattern from position-restoration.spec.ts)
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

    // Verify initial position is set
    const initialPosition = await projectViewPage.getCurrentPosition();
    const initialIsCurrent = await projectViewPage.isStepCurrent(0, targetStepIndex);
    
    expect(initialIsCurrent).toBe(true);
    expect(initialPosition).toEqual({ row: 0, step: targetStepIndex });

    // Navigate to project inspector
    await projectViewPage.navigateViaMenu('project-inspector');
    await projectInspectorPage.waitForProjectInspectorData();

    // Wait for navigation to complete
    await page.waitForTimeout(500);

    // Navigate back to project view
    await projectInspectorPage.navigateViaMenu('project');
    await projectViewPage.waitForProjectViewData();

    // Verify position is preserved after navigation
    
    // Check current position
    const immediatePosition = await projectViewPage.getCurrentPosition();

    // Expand the row to see steps
    await projectViewPage.expandRow(0);

    // Check if step is still marked as current
    const isStillCurrent = await projectViewPage.isStepCurrent(0, targetStepIndex);

    // Get final position
    const finalPosition = await projectViewPage.getCurrentPosition();

    // Assert position is preserved
    expect(isStillCurrent).toBe(true);
    expect(finalPosition).toEqual({ row: 0, step: targetStepIndex });
    expect(immediatePosition).toEqual({ row: 0, step: targetStepIndex });
  });

  test('should maintain stable position during rapid navigation', async ({
    projectViewPage,
    projectInspectorPage,
    page
  }) => {
    // Test position stability during rapid navigation
    test.setTimeout(45000);

    // Set initial position
    await projectViewPage.expandRow(0);
    await projectViewPage.clickStep(0, 0);
    await page.waitForTimeout(300);

    const originalPosition = await projectViewPage.getCurrentPosition();

    // Rapid navigation sequence
    await projectViewPage.navigateViaMenu('project-inspector');
    await page.waitForTimeout(200); // Brief delay in inspector

    await projectInspectorPage.navigateViaMenu('project');
    await projectViewPage.waitForProjectViewData();

    // Check position stability at multiple intervals
    const checkIntervals = [50, 100, 250, 500, 1000];
    let positionUnstable = false;

    for (const interval of checkIntervals) {
      await page.waitForTimeout(interval - (checkIntervals[checkIntervals.indexOf(interval) - 1] || 0));
      
      const currentPosition = await projectViewPage.getCurrentPosition();
      const isCurrentStep = await projectViewPage.isStepCurrent(0, 0);

      if (!currentPosition || !isCurrentStep || currentPosition.row !== 0 || currentPosition.step !== 0) {
        positionUnstable = true;
        break;
      }
    }

    // Final verification
    await projectViewPage.expandRow(0);
    const finalIsCurrent = await projectViewPage.isStepCurrent(0, 0);
    const finalPosition = await projectViewPage.getCurrentPosition();

    // Assert position remained stable
    expect(positionUnstable).toBe(false);
    expect(finalIsCurrent).toBe(true);
    expect(finalPosition).toEqual({ row: 0, step: 0 });
  });
});

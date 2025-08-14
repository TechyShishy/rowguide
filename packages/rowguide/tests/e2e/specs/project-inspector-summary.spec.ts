import { test, expect } from '../fixtures/test-fixtures';
import { TestDataFactory, TestDbUtils } from '../utils/test-helpers';

test.describe('Project Inspector - Project Summary', () => {
  test.beforeEach(async ({ projectInspectorPage, settingsPage, page }) => {
    // Seed test data before each test
    const testProjects = TestDataFactory.createMultipleProjects(3);
    await TestDbUtils.seedProjectData(page, testProjects);

    // First enable the expanded inspector view to see all statistics
    await settingsPage.goto();

    // Check current state and ensure ppinspector is enabled
    const isCurrentlyEnabled = await settingsPage.isPPInspectorEnabled();
    if (!isCurrentlyEnabled) {
      await settingsPage.togglePPInspector();
    }

    // Verify it's now enabled
    const isNowEnabled = await settingsPage.isPPInspectorEnabled();
    expect(isNowEnabled).toBe(true);

    // Navigate to project inspector
    await projectInspectorPage.goto();
  });

  test('should display project summary with basic statistics', async ({ projectInspectorPage }) => {
    // Verify the project summary card is visible
    await expect(projectInspectorPage.summaryCardLocator).toBeVisible();

    // After enabling ppinspector in beforeEach, the expanded summary MUST be visible
    await expect(projectInspectorPage.isExpandedSummaryVisible()).resolves.toBe(true);

    // Get the basic items that should always be visible
    const summaryItems = projectInspectorPage.summaryItemLocators;
    await expect(summaryItems.name).toBeVisible();
    await expect(summaryItems.rows).toBeVisible();

    // Since ppinspector is enabled, all expanded items MUST be visible
    await expect(summaryItems.columns).toBeVisible();
    await expect(summaryItems.beads).toBeVisible();
    await expect(summaryItems.colors).toBeVisible();

    // Verify all our new methods return valid numbers
    const projectName = await projectInspectorPage.getProjectName();
    const rowCount = await projectInspectorPage.getProjectRowCount();
    const columnCount = await projectInspectorPage.getProjectColumnCount();
    const beadCount = await projectInspectorPage.getProjectBeadCount();
    const colorCount = await projectInspectorPage.getProjectColorCount();

    // Verify the methods return proper values (always numbers)
    expect(typeof columnCount).toBe('number');
    expect(typeof beadCount).toBe('number');
    expect(typeof colorCount).toBe('number');
    expect(Number.isFinite(columnCount)).toBe(true);
    expect(Number.isFinite(beadCount)).toBe(true);
    expect(Number.isFinite(colorCount)).toBe(true);
  });

  test('should display real project data when a project is loaded', async ({
    projectInspectorPage,
    projectSelectorPage
  }) => {
    // Go to project selector - we know we have test data available
    await projectSelectorPage.goto();

    const projectCount = await projectSelectorPage.getProjectCount();
    expect(projectCount).toBeGreaterThan(0); // Should have test data seeded

    // Actually select and load the first available project
    await projectSelectorPage.loadProject(0);

    // Get the project ID that was just loaded
    const projectId = await projectInspectorPage.getCurrentProjectId();
    expect(projectId).not.toBeNull();

    // Navigate to inspector for this specific project
    await projectInspectorPage.gotoProject(parseInt(projectId!));

    // Verify we have a loaded project (not "No Project")
    await projectInspectorPage.verifyProjectLoaded();

    // After enabling ppinspector in beforeEach, expanded view MUST be visible
    await expect(projectInspectorPage.isExpandedSummaryVisible()).resolves.toBe(true);

    // Get basic statistics that should always be available
    const projectName = await projectInspectorPage.getProjectName();
    const rowCount = await projectInspectorPage.getProjectRowCount();

    // Verify we have meaningful basic data
    expect(projectName).not.toBe('No Project');
    expect(projectName).not.toBe('');
    expect(rowCount).toBeGreaterThan(0);

    // Test the new methods - they should all be accessible now
    const columnCount = await projectInspectorPage.getProjectColumnCount();
    const beadCount = await projectInspectorPage.getProjectBeadCount();
    const colorCount = await projectInspectorPage.getProjectColorCount();

    // These are the key assertions to verify our methods return real data
    // Since we have test data with rows, we should have columns and colors
    expect(columnCount).toBeGreaterThan(0);
    expect(colorCount).toBeGreaterThan(0);

    // Beads might be 0 if all steps have count=0, so we just verify it's a number
    expect(typeof beadCount).toBe('number');
    expect(beadCount).toBeGreaterThanOrEqual(0);
  });

  test('should update statistics when project changes', async ({
    projectInspectorPage,
    projectSelectorPage
  }) => {
    // Go to project selector first
    await projectSelectorPage.goto();

    const projectCount = await projectSelectorPage.getProjectCount();
    expect(projectCount).toBeGreaterThan(1); // Should have multiple test projects

    // Load the first project
    await projectSelectorPage.loadProject(0);
    
    // Get the project ID and navigate to inspector for this specific project
    let projectId = await projectInspectorPage.getCurrentProjectId();
    expect(projectId).not.toBeNull();
    await projectInspectorPage.gotoProject(parseInt(projectId!));

    // Get initial statistics
    const initialStats = {
      name: await projectInspectorPage.getProjectName(),
      rows: await projectInspectorPage.getProjectRowCount(),
      columns: await projectInspectorPage.getProjectColumnCount(),
      beads: await projectInspectorPage.getProjectBeadCount(),
      colors: await projectInspectorPage.getProjectColorCount()
    };

    // Go back to selector and load a different project
    await projectSelectorPage.goto();
    await projectSelectorPage.loadProject(1); // Load second project

    // Get the new project ID and navigate to inspector for this specific project
    projectId = await projectInspectorPage.getCurrentProjectId();
    expect(projectId).not.toBeNull();
    await projectInspectorPage.gotoProject(parseInt(projectId!));

    const newStats = {
      name: await projectInspectorPage.getProjectName(),
      rows: await projectInspectorPage.getProjectRowCount(),
      columns: await projectInspectorPage.getProjectColumnCount(),
      beads: await projectInspectorPage.getProjectBeadCount(),
      colors: await projectInspectorPage.getProjectColorCount()
    };


    // Verify the statistics are numeric and valid
    expect(typeof newStats.rows).toBe('number');
    expect(typeof newStats.columns).toBe('number');
    expect(typeof newStats.beads).toBe('number');
    expect(typeof newStats.colors).toBe('number');

    // Names should be different (different projects loaded)
    expect(newStats.name).not.toBe(initialStats.name);
  });

  test('should show zero values for empty project', async ({ projectInspectorPage }) => {
    // Navigate directly to inspector (should show default/empty state)
    await projectInspectorPage.goto();

    // After enabling ppinspector in beforeEach, expanded view MUST be visible
    await expect(projectInspectorPage.isExpandedSummaryVisible()).resolves.toBe(true);

    // Test that all our getter methods return valid numbers even for empty project
    const projectName = await projectInspectorPage.getProjectName();
    const rowCount = await projectInspectorPage.getProjectRowCount();
    const columnCount = await projectInspectorPage.getProjectColumnCount();
    const beadCount = await projectInspectorPage.getProjectBeadCount();
    const colorCount = await projectInspectorPage.getProjectColorCount();

    // For empty/no project, verify proper defaults
    if (projectName === 'No Project') {
      expect(rowCount).toBe(0);
      expect(columnCount).toBe(0);
      expect(beadCount).toBe(0);
      expect(colorCount).toBe(0);
    }

    // All values should always be valid numbers
    expect(typeof columnCount).toBe('number');
    expect(typeof beadCount).toBe('number');
    expect(typeof colorCount).toBe('number');
    expect(Number.isFinite(columnCount)).toBe(true);
    expect(Number.isFinite(beadCount)).toBe(true);
    expect(Number.isFinite(colorCount)).toBe(true);
  });

  test('should handle missing or invalid project data gracefully', async ({ projectInspectorPage }) => {
    await projectInspectorPage.goto();

    // After enabling ppinspector in beforeEach, expanded view MUST be visible
    await expect(projectInspectorPage.isExpandedSummaryVisible()).resolves.toBe(true);

    // Test that all our getter methods return valid numbers even in edge cases
    const columnCount = await projectInspectorPage.getProjectColumnCount();
    const beadCount = await projectInspectorPage.getProjectBeadCount();
    const colorCount = await projectInspectorPage.getProjectColorCount();

    // These should always be numbers, never NaN or undefined
    expect(typeof columnCount).toBe('number');
    expect(typeof beadCount).toBe('number');
    expect(typeof colorCount).toBe('number');

    expect(Number.isFinite(columnCount)).toBe(true);
    expect(Number.isFinite(beadCount)).toBe(true);
    expect(Number.isFinite(colorCount)).toBe(true);
  });
});

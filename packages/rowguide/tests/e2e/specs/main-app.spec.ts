import { test, expect } from '../fixtures/test-fixtures';

test.describe('Main Application', () => {
  test.beforeEach(async ({ projectViewPage }) => {
    // Navigate to the default route (which redirects to /project)
    await projectViewPage.goto();
    await projectViewPage.waitForAngular();
  });

  test('should load the application successfully', async ({ projectViewPage }) => {
    await projectViewPage.verifyPageLoaded();

    const title = await projectViewPage.getTitle();
    expect(title).toContain('Rowguide');
  });

  test('should redirect root to project view', async ({ projectViewPage }) => {
    await projectViewPage.goto();
    await projectViewPage.waitForAngular();

    // Should redirect from / to /project
    expect(projectViewPage.getCurrentUrl()).toContain('/project');
  });

  test('should have accessible navigation', async ({ projectViewPage }) => {
    await projectViewPage.checkAccessibility();

    // Verify toolbar and navigation are accessible
    await projectViewPage.waitForToolbar();
  });

  test('should navigate between pages via sidenav', async ({ projectViewPage, projectSelectorPage, settingsPage }) => {
    // Open sidenav
    await projectViewPage.openSideNav();

    // Navigate to project selector
    await projectViewPage.navigateViaMenu('project-selector');
    await projectSelectorPage.waitForProjectSelectorData();
    expect(projectViewPage.getCurrentUrl()).toContain('/project-selector');

    // Navigate to settings
    await projectViewPage.openSideNav();
    await projectViewPage.navigateViaMenu('settings');
    await settingsPage.waitForSettingsData();
    expect(projectViewPage.getCurrentUrl()).toContain('/settings');

    // Navigate back to project view
    await projectViewPage.openSideNav();
    await projectViewPage.navigateViaMenu('project');
    await projectViewPage.waitForProjectViewData();
    expect(projectViewPage.getCurrentUrl()).toContain('/project');
  });

  test('should be responsive on different screen sizes', async ({ projectViewPage, page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await projectViewPage.waitForMaterialComponents();

    // Verify sidenav works on mobile
    await projectViewPage.openSideNav();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await projectViewPage.waitForMaterialComponents();
  });

  test('should handle browser back/forward navigation', async ({ projectViewPage, projectSelectorPage, page }) => {
    // Navigate to project selector
    await projectViewPage.openSideNav();
    await projectViewPage.navigateViaMenu('project-selector');
    await projectSelectorPage.waitForProjectSelectorData();

    // Use browser back button
    await page.goBack();
    await projectViewPage.waitForAngular();
    expect(projectViewPage.getCurrentUrl()).toContain('/project');

    // Use browser forward button
    await page.goForward();
    await projectViewPage.waitForAngular();
    expect(projectViewPage.getCurrentUrl()).toContain('/project-selector');
  });

  test('should maintain state after page reload', async ({ projectViewPage, page }) => {
    // Navigate to project selector
    await projectViewPage.openSideNav();
    await projectViewPage.navigateViaMenu('project-selector');
    await projectViewPage.waitForAngular();

    // Reload the page
    await page.reload();
    await projectViewPage.waitForAngular();

    // Verify we're still on the same page
    expect(projectViewPage.getCurrentUrl()).toContain('/project-selector');
  });

  test('should handle error boundaries', async ({ projectViewPage, page }) => {
    // Verify error boundary is present in the DOM (use first() to handle multiple instances)
    const errorBoundary = page.locator('app-error-boundary').first();
    await expect(errorBoundary).toBeAttached();

    // Test basic error recovery functionality
    await projectViewPage.waitForToolbar();
    const title = await projectViewPage.getTitle();
    expect(title).toContain('Rowguide');
  });

  test('should display project context in toolbar', async ({ projectViewPage, page }) => {
    await projectViewPage.waitForToolbar();

    // Verify toolbar shows project information
    const toolbar = page.locator('mat-toolbar');
    const toolbarText = await toolbar.textContent();
    expect(toolbarText).toContain('Project:');
  });
});

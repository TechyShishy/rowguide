import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Page Object for Project View functionality
 * Handles interactions with the project pattern tracking interface
 * Used for both /project and /project/:id routes
 *
 * Aligns with ProjectComponent structure:
 * - app-error-boundary with retry functionality
 * - mat-accordion with app-row components
 * - advance-button-container with comprehensive navigation controls
 * - Bottom sheet integration for bead count display
 * - Keyboard navigation support
 */
export class ProjectViewPage extends BasePage {
  // Main container structure
  private readonly errorBoundary = this.page.locator('app-error-boundary');
  private readonly accordion = this.page.locator('mat-accordion');

  // Row structure
  private readonly rows = this.page.locator('app-row');
  private readonly rowPanels = this.rows.locator('mat-expansion-panel');
  private readonly rowHeaders = this.rowPanels.locator(
    'mat-expansion-panel-header'
  );
  private readonly rowTitles = this.rowHeaders.locator('mat-panel-title');

  // Step structure
  private readonly steps = this.rows.locator('app-step');
  private readonly stepChips = this.steps.locator('mat-chip');

  // Navigation controls
  private readonly advanceButtonContainer = this.page.locator(
    '.advance-button-container'
  );
  private readonly retreatRowButton = this.advanceButtonContainer
    .locator('button')
    .filter({ hasText: 'Retreat Row' });
  private readonly retreatStepButton = this.advanceButtonContainer
    .locator('button')
    .filter({ hasText: 'Retreat Step' });
  private readonly advanceStepButton = this.advanceButtonContainer
    .locator('button')
    .filter({ hasText: 'Advance Step' });
  private readonly advanceRowButton = this.advanceButtonContainer
    .locator('button')
    .filter({ hasText: 'Advance Row' });
  private readonly retreatMultipleButton = this.advanceButtonContainer
    .locator('button')
    .filter({ hasText: /Retreat \d+ Steps/ });
  private readonly advanceMultipleButton = this.advanceButtonContainer
    .locator('button')
    .filter({ hasText: /Advance \d+ Steps/ });
  private readonly beadCountButton = this.advanceButtonContainer
    .locator('button[mat-button]')
    .first();

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the project view (current project)
   */
  override async goto(): Promise<void> {
    await super.goto('/project');
    await this.waitForPageLoad();
    await this.waitForAngular();
    await this.waitForProjectViewData();
  }

  /**
   * Navigate to a specific project by ID
   */
  async gotoProject(projectId: number): Promise<void> {
    await super.goto(`/project/${projectId}`);
    await this.waitForPageLoad();
    await this.waitForAngular();
    await this.waitForProjectViewData();
  }

  /**
   * Wait for project view specific data to load
   * This implements the data loading detection specific to the project tracking view
   */
  async waitForProjectViewData(): Promise<void> {
    await this.waitForAngular();
    await this.waitForToolbar();

    // Wait for error boundary and accordion structure
    await this.waitForUIElements(['app-error-boundary', 'mat-accordion'], 8000);
    await this.waitForMaterialComponents();

    // Ensure advance button container is present (even if no project loaded)
    await expect(this.advanceButtonContainer).toBeVisible();
  }

  /**
   * Verify the project view page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    // Should have accordion structure and advance buttons
    await expect(this.accordion).toBeVisible();
    await expect(this.advanceButtonContainer).toBeVisible();

    // At minimum should have navigation buttons
    await expect(this.advanceStepButton).toBeVisible();
  }

  // Project structure methods

  /**
   * Get the number of rows in the current project
   */
  async getRowCount(): Promise<number> {
    return await this.rows.count();
  }

  /**
   * Get row titles (e.g., "Row 1", "Rows 1 & 2" for combine12 setting)
   */
  async getRowTitles(): Promise<string[]> {
    const count = await this.getRowCount();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const title = await this.rowTitles.nth(i).textContent();
      if (title) titles.push(title);
    }

    return titles;
  }

  /**
   * Expand a row by index
   */
  async expandRow(index: number): Promise<void> {
    const rowPanel = this.rowPanels.nth(index);
    const isExpanded = await rowPanel.getAttribute('aria-expanded');

    if (isExpanded !== 'true') {
      await this.rowHeaders.nth(index).click();
      await this.waitForMaterialComponents();
    }
  }

  /**
   * Get the number of steps in a specific row
   */
  async getStepCountInRow(rowIndex: number): Promise<number> {
    const row = this.rows.nth(rowIndex);
    return await row.locator('app-step').count();
  }

  /**
   * Click on a specific step in a row
   */
  async clickStep(rowIndex: number, stepIndex: number): Promise<void> {
    await this.expandRow(rowIndex);
    const row = this.rows.nth(rowIndex);
    const step = row.locator('app-step').nth(stepIndex);
    await step.click();
    await this.waitForAngular();
  }

  /**
   * Get step content (bead count and description)
   */
  async getStepContent(rowIndex: number, stepIndex: number): Promise<string> {
    const row = this.rows.nth(rowIndex);
    const step = row.locator('app-step').nth(stepIndex);
    return (await step.textContent()) || '';
  }

  /**
   * Check if a step is marked as current
   */
  async isStepCurrent(rowIndex: number, stepIndex: number): Promise<boolean> {
    const row = this.rows.nth(rowIndex);
    const step = row.locator('app-step').nth(stepIndex);
    const classes = (await step.getAttribute('class')) || '';
    return classes.includes('current-step') || classes.includes('is-current');
  }

  // Navigation methods

  /**
   * Advance to next step
   */
  async advanceStep(): Promise<void> {
    await this.advanceStepButton.click();
    await this.waitForAngular();
  }

  /**
   * Retreat to previous step
   */
  async retreatStep(): Promise<void> {
    await this.retreatStepButton.click();
    await this.waitForAngular();
  }

  /**
   * Advance to next row
   */
  async advanceRow(): Promise<void> {
    await this.advanceRowButton.click();
    await this.waitForAngular();
  }

  /**
   * Retreat to previous row
   */
  async retreatRow(): Promise<void> {
    await this.retreatRowButton.click();
    await this.waitForAngular();
  }

  /**
   * Advance multiple steps (using settings-based count)
   */
  async advanceMultipleSteps(): Promise<void> {
    await this.advanceMultipleButton.click();
    await this.waitForAngular();
  }

  /**
   * Retreat multiple steps (using settings-based count)
   */
  async retreatMultipleSteps(): Promise<void> {
    await this.retreatMultipleButton.click();
    await this.waitForAngular();
  }

  /**
   * Get the current multi-advance step count from button text
   */
  async getMultiAdvanceCount(): Promise<number> {
    const buttonText = await this.advanceMultipleButton.textContent();
    const match = buttonText?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 3; // Default value
  }

  /**
   * Open bead count bottom sheet
   */
  async openBeadCountBottomSheet(): Promise<void> {
    await this.beadCountButton.click();
    await this.waitForAngular();
    // Wait for bottom sheet to appear
    await this.page.waitForSelector('mat-bottom-sheet-container', {
      timeout: 5000,
    });
  }

  /**
   * Get current bead count from the button
   */
  async getCurrentBeadCount(): Promise<string> {
    return (await this.beadCountButton.textContent()) || '';
  }

  // Keyboard navigation methods

  /**
   * Use keyboard navigation (arrow keys)
   */
  async useKeyboardNavigation(
    key: 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown'
  ): Promise<void> {
    await this.page.keyboard.press(key);
    await this.waitForAngular();
  }

  /**
   * Advance step using right arrow key
   */
  async advanceStepWithKeyboard(): Promise<void> {
    await this.useKeyboardNavigation('ArrowRight');
  }

  /**
   * Retreat step using left arrow key
   */
  async retreatStepWithKeyboard(): Promise<void> {
    await this.useKeyboardNavigation('ArrowLeft');
  }

  /**
   * Advance row using down arrow key
   */
  async advanceRowWithKeyboard(): Promise<void> {
    await this.useKeyboardNavigation('ArrowDown');
  }

  /**
   * Retreat row using up arrow key
   */
  async retreatRowWithKeyboard(): Promise<void> {
    await this.useKeyboardNavigation('ArrowUp');
  }

  // Verification methods

  /**
   * Get the current project name from the toolbar
   */
  async getProjectName(): Promise<string> {
    return await this.getCurrentProjectName();
  }

  /**
   * Check if project has any rows
   */
  async hasRows(): Promise<boolean> {
    return (await this.rows.count()) > 0;
  }

  /**
   * Check if advance buttons are visible (indicates project is loaded)
   */
  async hasAdvanceButtons(): Promise<boolean> {
    return await this.advanceButtonContainer.isVisible();
  }

  /**
   * Verify the project is not "No Project"
   */
  async verifyProjectLoaded(): Promise<void> {
    await this.waitForProjectContext(); // This now waits for actual project, not "No Project"
    const projectName = await this.getProjectName();
    expect(projectName).not.toBe('No Project');
    expect(projectName).not.toBe('');
  }

  /**
   * Verify accordion structure is properly loaded
   */
  async verifyAccordionStructure(): Promise<void> {
    await expect(this.accordion).toBeVisible();
    await expect(this.accordion).toHaveAttribute('multi', 'true');
  }

  /**
   * Verify all navigation buttons are present
   */
  async verifyNavigationButtons(): Promise<void> {
    await expect(this.retreatRowButton).toBeVisible();
    await expect(this.retreatStepButton).toBeVisible();
    await expect(this.retreatMultipleButton).toBeVisible();
    await expect(this.beadCountButton).toBeVisible();
    await expect(this.advanceStepButton).toBeVisible();
    await expect(this.advanceMultipleButton).toBeVisible();
    await expect(this.advanceRowButton).toBeVisible();
  }

  /**
   * Verify mark mode functionality by checking CSS class application
   * Mark mode is applied to the app-project host element via @HostBinding
   */
  async verifyMarkModeSupport(): Promise<void> {
    const projectElement = this.page.locator('app-project');

    // Verify the project element exists
    await expect(projectElement).toBeVisible();

    // Check if the element has mark mode classes applied
    // Mark mode classes are: 'mark-mode' and 'mark-mode-{number}' (1-6)
    const elementClasses = (await projectElement.getAttribute('class')) || '';
    const hasMarkModeClass = elementClasses.includes('mark-mode');

    // If mark mode is active, verify the specific mode class pattern
    if (hasMarkModeClass) {
      // Should have both 'mark-mode' and 'mark-mode-{number}' classes
      const hasSpecificModeClass = /mark-mode-[1-6]/.test(elementClasses);
      expect(hasSpecificModeClass).toBe(true);

      // Verify advance button container responds to mark mode with background color
      const advanceContainer = this.advanceButtonContainer;
      const containerStyles = await advanceContainer.evaluate(
        (el) => getComputedStyle(el).backgroundColor
      );
      // Should have a non-default background color when mark mode is active
      expect(containerStyles).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    }

    // Mark mode functionality is correctly implemented whether active or not
  }

  // Mark mode testing methods

  /**
   * Get the current mark mode from the app-project CSS classes
   */
  async getCurrentMarkMode(): Promise<number> {
    const projectElement = this.page.locator('app-project');
    const elementClasses = (await projectElement.getAttribute('class')) || '';

    // Extract mark mode number from 'mark-mode-{number}' class
    const modeMatch = elementClasses.match(/mark-mode-(\d+)/);
    return modeMatch ? parseInt(modeMatch[1]) : 0;
  }

  /**
   * Check if mark mode is currently active (has 'mark-mode' class)
   */
  async isMarkModeActive(): Promise<boolean> {
    const projectElement = this.page.locator('app-project');
    const elementClasses = (await projectElement.getAttribute('class')) || '';
    return elementClasses.includes('mark-mode');
  }

  /**
   * Verify mark mode CSS classes are correctly applied
   */
  async verifyMarkModeClasses(expectedMode: number): Promise<void> {
    const projectElement = this.page.locator('app-project');
    const elementClasses = (await projectElement.getAttribute('class')) || '';

    if (expectedMode === 0) {
      // Default mode - should not have mark mode classes
      expect(elementClasses).not.toContain('mark-mode');
    } else {
      // Active mark mode - should have both 'mark-mode' and 'mark-mode-{number}'
      expect(elementClasses).toContain('mark-mode');
      expect(elementClasses).toContain(`mark-mode-${expectedMode}`);
    }
  }

  /**
   * Verify advance button container styling responds to mark mode
   */
  async verifyAdvanceButtonStyling(markMode: number): Promise<void> {
    const containerStyles = await this.advanceButtonContainer.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );

    if (markMode === 0) {
      // Default mode may have default styling
      // Just verify it's a valid color value
      expect(containerStyles).toMatch(/^rgb/);
    } else {
      // Active mark mode should have specific background color
      expect(containerStyles).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
      expect(containerStyles).toMatch(/^rgb/); // Valid RGB color
    }
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
}

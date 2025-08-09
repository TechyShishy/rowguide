import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Page Object for Settings functionality
 * Handles interactions with application settings and configuration
 *
 * Aligns with SettingsComponent structure:
 * - app-error-boundary with retry functionality
 * - Reactive form with mat-slide-toggle controls
 * - mat-slider components for numeric settings
 * - mat-select for color model selection
 * - All changes automatically persist via form value changes
 */
export class SettingsPage extends BasePage {
  // Main container structure
  private readonly errorBoundary = this.page.locator('app-error-boundary');
  private readonly settingsForm = this.page.locator('form[formGroup]');
  private readonly settingsCard = this.page.locator('mat-card');

  // Toggle controls
  private readonly combine12Toggle = this.page.locator('mat-slide-toggle[formcontrolname="combine12"]');
  private readonly lrDesignatorsToggle = this.page.locator('mat-slide-toggle[formcontrolname="lrdesignators"]');
  private readonly flamMarkersToggle = this.page.locator('mat-slide-toggle[formcontrolname="flammarkers"]');
  private readonly ppInspectorToggle = this.page.locator('mat-slide-toggle[formcontrolname="ppinspector"]');
  private readonly zoomToggle = this.page.locator('mat-slide-toggle[formcontrolname="zoom"]');

  // Slider controls
  private readonly scrollOffsetSlider = this.page.locator('mat-slider').filter({ hasText: 'Scroll Offset' });
  private readonly multiAdvanceSlider = this.page.locator('mat-slider').filter({ hasText: 'Multi-Advance Count' });
  private readonly scrollOffsetInput = this.scrollOffsetSlider.locator('input[formcontrolname="scrolloffset"]');
  private readonly multiAdvanceInput = this.multiAdvanceSlider.locator('input[formcontrolname="multiadvance"]');

  // Select controls
  private readonly colorModelField = this.page.locator('mat-form-field').filter({ hasText: 'Color Model' });
  private readonly colorModelSelect = this.colorModelField.locator('mat-select[formcontrolname="colorModel"]');

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the settings page
   */
  override async goto(): Promise<void> {
    await super.goto('/settings');
    await this.waitForPageLoad();
    await this.waitForAngular();
    await this.waitForSettingsData();
  }

  /**
   * Wait for settings form data to load (no navigation)
   */
  async waitForSettingsData(): Promise<void> {
    // Don't navigate - just wait for the form to be ready
    await this.waitForAngular();

    // Ensure settings form is present (use card instead of form since form might not be bound yet)
    await expect(this.settingsCard).toBeVisible();
  }

  /**
   * Verify the settings page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.errorBoundary).toBeVisible();
    await expect(this.settingsForm).toBeVisible();
    await expect(this.settingsCard).toBeVisible();
  }

  // Toggle control methods

  /**
   * Toggle the "Combine Rows 1&2" setting
   */
  async toggleCombineRows(): Promise<void> {
    await this.combine12Toggle.click();
    await this.waitForAngular();
  }

  /**
   * Get the current state of the "Combine Rows 1&2" toggle
   */
  async isCombineRowsEnabled(): Promise<boolean> {
    return await this.combine12Toggle.isChecked();
  }

  /**
   * Toggle the "L/R Designators" setting
   */
  async toggleLRDesignators(): Promise<void> {
    await this.lrDesignatorsToggle.click();
    await this.waitForAngular();
  }

  /**
   * Get the current state of the "L/R Designators" toggle
   */
  async isLRDesignatorsEnabled(): Promise<boolean> {
    return await this.lrDesignatorsToggle.isChecked();
  }

  /**
   * Toggle the "FLAM Markers" setting
   */
  async toggleFlamMarkers(): Promise<void> {
    await this.flamMarkersToggle.click();
    await this.waitForAngular();
  }

  /**
   * Get the current state of the "FLAM Markers" toggle
   */
  async isFlamMarkersEnabled(): Promise<boolean> {
    return await this.flamMarkersToggle.isChecked();
  }

  /**
   * Toggle the "Pretty Print Inspector Tab" setting
   */
  async togglePPInspector(): Promise<void> {
    // Click the button inside the toggle (this is the correct target)
    const button = this.ppInspectorToggle.locator('button[role="switch"]');
    await button.click();

    // Wait for Angular to process the change
    await this.waitForAngular();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the current state of the "Pretty Print Inspector Tab" toggle
   */
  async isPPInspectorEnabled(): Promise<boolean> {
    const toggle = this.page.locator('mat-slide-toggle[formcontrolname="ppinspector"]');

    // Check the main toggle element for the correct checked class
    const classList = await toggle.evaluate(el => Array.from(el.classList));
    const isMainToggleChecked = classList.includes('mat-mdc-slide-toggle-checked');

    // Also check the internal button for additional confirmation
    const button = toggle.locator('button[role="switch"]');
    const buttonClassList = await button.evaluate(el => Array.from(el.classList));
    const ariaChecked = await button.getAttribute('aria-checked');
    const isButtonSelected = buttonClassList.includes('mdc-switch--selected');
    const isAriaChecked = ariaChecked === 'true';

    // All three should agree for a proper enabled state
    return isMainToggleChecked && isButtonSelected && isAriaChecked;
  }

  /**
   * Toggle the "Zoom Current Step" setting
   */
  async toggleZoom(): Promise<void> {
    await this.zoomToggle.click();
    await this.waitForAngular();
  }

  /**
   * Get the current state of the "Zoom Current Step" toggle
   */
  async isZoomEnabled(): Promise<boolean> {
    return await this.zoomToggle.isChecked();
  }

  // Slider control methods

  /**
   * Set the scroll offset value (-4 to 1)
   */
  async setScrollOffset(value: number): Promise<void> {
    await this.scrollOffsetInput.fill(value.toString());
    await this.waitForAngular();
  }

  /**
   * Get the current scroll offset value
   */
  async getScrollOffset(): Promise<number> {
    const value = await this.scrollOffsetInput.inputValue();
    return parseInt(value);
  }

  /**
   * Set the multi-advance count (1 to 25)
   */
  async setMultiAdvanceCount(value: number): Promise<void> {
    await this.multiAdvanceInput.fill(value.toString());
    await this.waitForAngular();
  }

  /**
   * Get the current multi-advance count
   */
  async getMultiAdvanceCount(): Promise<number> {
    const value = await this.multiAdvanceInput.inputValue();
    return parseInt(value);
  }

  // Color model selection methods

  /**
   * Select a color model from the dropdown
   */
  async selectColorModel(option: 'None (Manual Entry)' | 'Miyuki Delica (DB)'): Promise<void> {
    await this.colorModelSelect.click();
    await this.page.locator('mat-option').filter({ hasText: option }).click();
    await this.waitForAngular();
  }

  /**
   * Get the currently selected color model
   */
  async getSelectedColorModel(): Promise<string> {
    return await this.colorModelSelect.textContent() || '';
  }

  // Verification methods

  /**
   * Verify all settings controls are present and functional
   */
  async verifyAllControlsPresent(): Promise<void> {
    // Toggle controls
    await expect(this.combine12Toggle).toBeVisible();
    await expect(this.lrDesignatorsToggle).toBeVisible();
    await expect(this.flamMarkersToggle).toBeVisible();
    await expect(this.ppInspectorToggle).toBeVisible();
    await expect(this.zoomToggle).toBeVisible();

    // Slider controls
    await expect(this.scrollOffsetSlider).toBeVisible();
    await expect(this.multiAdvanceSlider).toBeVisible();

    // Select controls
    await expect(this.colorModelField).toBeVisible();
    await expect(this.colorModelSelect).toBeVisible();
  }

  /**
   * Verify the settings form is properly bound
   */
  async verifyFormBinding(): Promise<void> {
    // Check that the form has the formGroup directive
    const formGroup = await this.settingsForm.getAttribute('formgroup');
    expect(formGroup).not.toBeNull();

    // Verify all form controls have proper binding
    await expect(this.combine12Toggle).toHaveAttribute('formcontrolname', 'combine12');
    await expect(this.scrollOffsetInput).toHaveAttribute('formcontrolname', 'scrolloffset');
    await expect(this.colorModelSelect).toHaveAttribute('formcontrolname', 'colorModel');
  }

  // Error handling methods

  /**
   * Trigger error boundary retry
   */
  async retryOnError(): Promise<void> {
    const retryButton = this.errorBoundary.locator('button').filter({ hasText: 'Retry' });
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

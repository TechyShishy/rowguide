---
layout: page
title: Accessibility Guidelines
permalink: /architecture/accessibility-guidelines/
---

# Accessibility Guidelines

## Overview

The Rowguide application is designed to be fully accessible to all users, including those with disabilities. This document outlines the comprehensive accessibility implementation, ARIA patterns, keyboard navigation, and inclusive design principles used throughout the application.

## Accessibility Architecture

### Core Accessibility Principles

```
Accessibility Implementation
├── ARIA Documentation        # Semantic markup and roles
├── Keyboard Navigation       # Full keyboard support
├── Screen Reader Support     # Assistive technology integration
├── Visual Accessibility     # Color contrast and visual aids
└── Motor Accessibility      # Alternative input methods
```

### Accessibility Standards

```typescript
interface AccessibilityStandards {
  // WCAG 2.1 AAA Compliance
  wcagLevel: 'AAA';

  // Core Requirements
  keyboardNavigation: true;
  screenReaderSupport: true;
  colorContrastRatio: 7; // AAA level
  focusManagement: true;

  // Advanced Features
  voiceNavigation: boolean;
  gestureSupport: boolean;
  cognitiveAccessibility: boolean;

  // Testing Requirements
  automatedTesting: true;
  manualTesting: true;
  userTesting: true;
}
```

## ARIA Implementation

### Semantic Markup and Roles

```typescript
@Component({
  selector: 'app-project',
  template: `
    <main
      role="main"
      aria-label="Pattern tracking project"
      [attr.aria-busy]="isLoading"
      [attr.aria-describedby]="isLoading ? 'loading-status' : null">

      <div id="loading-status"
           class="sr-only"
           [attr.aria-live]="isLoading ? 'polite' : null">
        {% raw %}{{ isLoading ? 'Loading project data...' : '' }}{% endraw %}
      </div>

      <header role="banner">
        <h1 id="project-title"
            [attr.aria-label]="'Project: ' + project.name">
          {{ project.name }}
        </h1>

        <nav role="navigation"
             aria-labelledby="project-nav-label">
          <h2 id="project-nav-label" class="sr-only">
            Project Navigation
          </h2>

          <app-project-navigation
            [project]="project"
            [currentPosition]="currentPosition"
            (positionChange)="onPositionChange($event)"
            role="menubar"
            aria-label="Pattern navigation controls">
          </app-project-navigation>
        </nav>
      </header>

      <section role="region"
               aria-labelledby="pattern-section-label">
        <h2 id="pattern-section-label" class="sr-only">
          Pattern Grid
        </h2>

        <app-pattern-grid
          [project]="project"
          [position]="currentPosition"
          (stepClick)="onStepClick($event)"
          role="grid"
          aria-label="Pattern step grid"
          [attr.aria-rowcount]="project.rows.length"
          [attr.aria-colcount]="getMaxStepsInRow(project)">
        </app-pattern-grid>
      </section>

      <aside role="complementary"
             aria-labelledby="step-info-label">
        <h2 id="step-info-label" class="sr-only">
          Current Step Information
        </h2>

        <app-step-info
          [step]="currentStep"
          [position]="currentPosition"
          role="status"
          aria-live="polite"
          aria-atomic="true">
        </app-step-info>
      </aside>
    </main>
  `
})
export class ProjectComponent implements OnInit, OnDestroy {
  @Input() project!: Project;
  @Input() currentPosition!: Position;

  isLoading = false;
  currentStep?: Step;

  constructor(
    private accessibilityService: AccessibilityService,
    private announcer: LiveAnnouncer
  ) {}

  ngOnInit(): void {
    this.accessibilityService.setPageTitle(`Project: ${this.project.name}`);
    this.accessibilityService.setLandmarks();
  }

  onPositionChange(position: Position): void {
    this.currentPosition = position;
    this.currentStep = this.getStepAtPosition(position);

    // Announce position change to screen readers
    this.announcer.announce(
      `Moved to row ${position.row + 1}, step ${position.step + 1}. ${this.currentStep?.description || 'No description'}`
    );
  }

  onStepClick(step: Step): void {
    // Announce step selection
    this.announcer.announce(`Selected step: ${step.description}`);
  }

  getMaxStepsInRow(project: Project): number {
    return Math.max(...project.rows.map(row => row.steps.length));
  }
}
```

### Pattern Grid ARIA Implementation

```typescript
@Component({
  selector: 'app-pattern-grid',
  template: `
    <div
      class="pattern-grid"
      role="grid"
      [attr.aria-label]="gridLabel"
      [attr.aria-rowcount]="rows.length"
      [attr.aria-colcount]="maxColumns"
      [attr.aria-activedescendant]="activeStepId"
      (keydown)="onKeyDown($event)">

      <div
        *ngFor="let row of rows; let rowIndex = index; trackBy: trackByRowId"
        class="pattern-row"
        role="row"
        [attr.aria-rowindex]="rowIndex + 1"
        [attr.aria-label]="'Row ' + (rowIndex + 1) + ' of ' + rows.length">

        <app-step
          *ngFor="let step of row.steps; let stepIndex = index; trackBy: trackByStepId"
          [step]="step"
          [position]="{ row: rowIndex, step: stepIndex }"
          [isCurrent]="isCurrentStep(rowIndex, stepIndex)"
          [isActive]="isActiveStep(rowIndex, stepIndex)"
          (click)="onStepClick(step, rowIndex, stepIndex)"
          (focus)="onStepFocus(step, rowIndex, stepIndex)"
          role="gridcell"
          [attr.aria-colindex]="stepIndex + 1"
          [attr.aria-selected]="isCurrentStep(rowIndex, stepIndex)"
          [attr.aria-label]="getStepAriaLabel(step, rowIndex, stepIndex)"
          [attr.aria-describedby]="getStepDescriptionId(step)"
          [attr.id]="getStepId(rowIndex, stepIndex)"
          tabindex="-1">
        </app-step>
      </div>

      <!-- Hidden descriptions for screen readers -->
      <div class="sr-only">
        <div
          *ngFor="let row of rows; let rowIndex = index"
          *ngFor="let step of row.steps; let stepIndex = index"
          [id]="getStepDescriptionId(step)"
          [attr.aria-label]="getDetailedStepDescription(step, rowIndex, stepIndex)">
          {% raw %}{{ getDetailedStepDescription(step, rowIndex, stepIndex) }}{% endraw %}
        </div>
      </div>
    </div>
  `
})
export class PatternGridComponent implements OnInit, OnDestroy {
  @Input() project!: Project;
  @Input() position!: Position;
  @Output() stepClick = new EventEmitter<{ step: Step; position: Position }>();
  @Output() positionChange = new EventEmitter<Position>();

  rows: Row[] = [];
  maxColumns = 0;
  activeStepId = '';
  gridLabel = '';

  constructor(
    private keyboardNav: KeyboardNavigationService,
    private announcer: LiveAnnouncer
  ) {}

  ngOnInit(): void {
    this.rows = this.project.rows;
    this.maxColumns = Math.max(...this.rows.map(row => row.steps.length));
    this.gridLabel = `Pattern grid with ${this.rows.length} rows and up to ${this.maxColumns} steps per row`;
    this.activeStepId = this.getStepId(this.position.row, this.position.step);
  }

  onKeyDown(event: KeyboardEvent): void {
    const handled = this.keyboardNav.handleGridNavigation(event, {
      currentPosition: this.position,
      maxRows: this.rows.length,
      maxColumns: this.maxColumns,
      onMove: (newPosition) => {
        this.moveToPosition(newPosition);
      },
      onActivate: () => {
        this.activateCurrentStep();
      }
    });

    if (handled) {
      event.preventDefault();
    }
  }

  private moveToPosition(newPosition: Position): void {
    if (this.isValidPosition(newPosition)) {
      this.position = newPosition;
      this.activeStepId = this.getStepId(newPosition.row, newPosition.step);

      // Move focus to new position
      const newStepElement = document.getElementById(this.activeStepId);
      if (newStepElement) {
        newStepElement.focus();
      }

      // Announce movement
      const step = this.getStepAtPosition(newPosition);
      this.announcer.announce(
        `Moved to row ${newPosition.row + 1}, step ${newPosition.step + 1}. ${step?.description || 'Empty step'}`
      );

      this.positionChange.emit(newPosition);
    }
  }

  getStepAriaLabel(step: Step, rowIndex: number, stepIndex: number): string {
    const isCurrentLabel = this.isCurrentStep(rowIndex, stepIndex) ? 'Current step. ' : '';
    const positionLabel = `Row ${rowIndex + 1}, step ${stepIndex + 1}. `;
    const contentLabel = `${step.description}. Count: ${step.count}. `;

    return isCurrentLabel + positionLabel + contentLabel;
  }

  getDetailedStepDescription(step: Step, rowIndex: number, stepIndex: number): string {
    const position = `Position: Row ${rowIndex + 1}, Step ${stepIndex + 1}`;
    const content = `Description: ${step.description}`;
    const count = `Count: ${step.count}`;
    const color = step.color ? `Color: ${step.color}` : 'No color specified';

    return `${position}. ${content}. ${count}. ${color}.`;
  }

  getStepId(rowIndex: number, stepIndex: number): string {
    return `step-${rowIndex}-${stepIndex}`;
  }

  getStepDescriptionId(step: Step): string {
    return `step-desc-${step.id}`;
  }
}
```

## Keyboard Navigation

### Comprehensive Keyboard Support

```typescript
@Injectable({ providedIn: 'root' })
export class KeyboardNavigationService {
  private keyHandlers = new Map<string, KeyHandler>();

  constructor() {
    this.setupKeyHandlers();
  }

  private setupKeyHandlers(): void {
    // Grid navigation
    this.keyHandlers.set('ArrowUp', this.moveUp.bind(this));
    this.keyHandlers.set('ArrowDown', this.moveDown.bind(this));
    this.keyHandlers.set('ArrowLeft', this.moveLeft.bind(this));
    this.keyHandlers.set('ArrowRight', this.moveRight.bind(this));

    // Grid navigation with modifiers
    this.keyHandlers.set('Home', this.moveToStartOfRow.bind(this));
    this.keyHandlers.set('End', this.moveToEndOfRow.bind(this));
    this.keyHandlers.set('PageUp', this.moveToStartOfGrid.bind(this));
    this.keyHandlers.set('PageDown', this.moveToEndOfGrid.bind(this));

    // Activation
    this.keyHandlers.set('Enter', this.activate.bind(this));
    this.keyHandlers.set(' ', this.activate.bind(this)); // Space

    // Application shortcuts
    this.keyHandlers.set('F1', this.showHelp.bind(this));
    this.keyHandlers.set('Escape', this.exitMode.bind(this));

    // Navigation shortcuts
    this.keyHandlers.set('ctrl+Home', this.goToProjectStart.bind(this));
    this.keyHandlers.set('ctrl+End', this.goToProjectEnd.bind(this));
    this.keyHandlers.set('ctrl+f', this.openSearch.bind(this));
  }

  handleGridNavigation(event: KeyboardEvent, options: GridNavigationOptions): boolean {
    const key = this.getKeyString(event);
    const handler = this.keyHandlers.get(key);

    if (handler) {
      return handler(event, options);
    }

    return false;
  }

  private getKeyString(event: KeyboardEvent): string {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');

    const key = event.key;
    return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
  }

  private moveUp(event: KeyboardEvent, options: GridNavigationOptions): boolean {
    const newPosition = {
      row: Math.max(0, options.currentPosition.row - 1),
      step: options.currentPosition.step
    };

    options.onMove(newPosition);
    return true;
  }

  private moveDown(event: KeyboardEvent, options: GridNavigationOptions): boolean {
    const newPosition = {
      row: Math.min(options.maxRows - 1, options.currentPosition.row + 1),
      step: options.currentPosition.step
    };

    options.onMove(newPosition);
    return true;
  }

  private moveLeft(event: KeyboardEvent, options: GridNavigationOptions): boolean {
    const newPosition = {
      row: options.currentPosition.row,
      step: Math.max(0, options.currentPosition.step - 1)
    };

    options.onMove(newPosition);
    return true;
  }

  private moveRight(event: KeyboardEvent, options: GridNavigationOptions): boolean {
    const newPosition = {
      row: options.currentPosition.row,
      step: Math.min(options.maxColumns - 1, options.currentPosition.step + 1)
    };

    options.onMove(newPosition);
    return true;
  }

  private moveToStartOfRow(event: KeyboardEvent, options: GridNavigationOptions): boolean {
    const newPosition = {
      row: options.currentPosition.row,
      step: 0
    };

    options.onMove(newPosition);
    return true;
  }

  private moveToEndOfRow(event: KeyboardEvent, options: GridNavigationOptions): boolean {
    const newPosition = {
      row: options.currentPosition.row,
      step: options.maxColumns - 1
    };

    options.onMove(newPosition);
    return true;
  }

  private activate(event: KeyboardEvent, options: GridNavigationOptions): boolean {
    options.onActivate();
    return true;
  }
}
```

### Focus Management

```typescript
@Injectable({ providedIn: 'root' })
export class FocusManagementService {
  private focusStack: HTMLElement[] = [];
  private currentFocusable: HTMLElement | null = null;

  constructor(private focusTrap: FocusTrap) {}

  // Focus management for modal dialogs
  trapFocus(element: HTMLElement): void {
    this.focusStack.push(document.activeElement as HTMLElement);
    this.focusTrap.focusInitialElementWhenReady(element);
  }

  restoreFocus(): void {
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  // Focus management for dynamic content
  manageFocus(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);

    if (focusableElements.length === 0) {
      // Make container focusable if no focusable children
      container.setAttribute('tabindex', '0');
      container.focus();
    } else {
      // Focus first focusable element
      focusableElements[0].focus();
    }
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(', '))) as HTMLElement[];
  }

  // Roving tabindex implementation
  setupRovingTabindex(container: HTMLElement): void {
    const items = this.getFocusableElements(container);

    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');

      item.addEventListener('focus', () => {
        this.updateRovingTabindex(items, index);
      });

      item.addEventListener('keydown', (event) => {
        this.handleRovingTabindexNavigation(event, items, index);
      });
    });
  }

  private updateRovingTabindex(items: HTMLElement[], activeIndex: number): void {
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
    });
  }

  private handleRovingTabindexNavigation(event: KeyboardEvent, items: HTMLElement[], currentIndex: number): void {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      event.preventDefault();
      this.updateRovingTabindex(items, newIndex);
      items[newIndex].focus();
    }
  }
}
```

## Screen Reader Support

### Live Announcements

```typescript
@Injectable({ providedIn: 'root' })
export class ScreenReaderService {
  private liveRegions = new Map<string, HTMLElement>();

  constructor(private announcer: LiveAnnouncer) {
    this.setupLiveRegions();
  }

  private setupLiveRegions(): void {
    // Create persistent live regions
    const statusRegion = this.createLiveRegion('status-announcements', 'polite');
    const alertRegion = this.createLiveRegion('alert-announcements', 'assertive');

    this.liveRegions.set('status', statusRegion);
    this.liveRegions.set('alert', alertRegion);
  }

  private createLiveRegion(id: string, politeness: 'polite' | 'assertive'): HTMLElement {
    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';

    document.body.appendChild(region);

    return region;
  }

  // Announce status changes
  announceStatus(message: string, delay = 0): void {
    setTimeout(() => {
      this.announcer.announce(message, 'polite');
    }, delay);
  }

  // Announce urgent alerts
  announceAlert(message: string): void {
    this.announcer.announce(message, 'assertive');
  }

  // Announce navigation changes
  announceNavigation(from: Position, to: Position, context: string): void {
    const message = `Moved from ${context} row ${from.row + 1}, step ${from.step + 1} to row ${to.row + 1}, step ${to.step + 1}`;
    this.announceStatus(message);
  }

  // Announce application state changes
  announceStateChange(state: string, details?: string): void {
    const message = details ? `${state}. ${details}` : state;
    this.announceStatus(message);
  }

  // Announce progress updates
  announceProgress(current: number, total: number, operation: string): void {
    const percentage = Math.round((current / total) * 100);
    const message = `${operation} progress: ${percentage}% complete, ${current} of ${total} items`;
    this.announceStatus(message);
  }
}
```

### Semantic Content Structure

```typescript
@Component({
  selector: 'app-step-info',
  template: `
    <article
      role="status"
      aria-live="polite"
      aria-atomic="true"
      [attr.aria-label]="stepInfoLabel">

      <header>
        <h3 id="step-info-title">
          Current Step Information
        </h3>
      </header>

      <dl class="step-details">
        <dt>Position</dt>
        <dd id="step-position">
          Row {% raw %}{{ position.row + 1 }}{% endraw %}, Step {% raw %}{{ position.step + 1 }}{% endraw %}
        </dd>

        <dt>Description</dt>
        <dd id="step-description">
          {% raw %}{{ step?.description || 'No description available' }}{% endraw %}
        </dd>

        <dt>Count</dt>
        <dd id="step-count">
          {% raw %}{{ step?.count || 0 }}{% endraw %}
        </dd>

        <dt>Color</dt>
        <dd id="step-color">
          <span [style.background-color]="step?.hexColor"
                class="color-swatch"
                [attr.aria-label]="getColorDescription(step?.color)">
          </span>
          {% raw %}{{ step?.color || 'No color specified' }}{% endraw %}
        </dd>

        <dt>Progress</dt>
        <dd id="step-progress">
          {% raw %}{{ getProgressDescription() }}{% endraw %}
        </dd>
      </dl>

      <footer>
        <button
          type="button"
          class="btn btn-secondary"
          (click)="markComplete()"
          [disabled]="!step"
          [attr.aria-describedby]="step ? 'mark-complete-desc' : null">
          Mark Complete
        </button>

        <div id="mark-complete-desc" class="sr-only">
          {% raw %}{{ step ? 'Mark this step as complete and move to next step' : 'No step selected' }}{% endraw %}
        </div>
      </footer>
    </article>
  `
})
export class StepInfoComponent implements OnInit, OnChanges {
  @Input() step?: Step;
  @Input() position!: Position;
  @Output() stepComplete = new EventEmitter<void>();

  stepInfoLabel = '';

  constructor(private screenReader: ScreenReaderService) {}

  ngOnInit(): void {
    this.updateStepInfoLabel();
  }

  ngOnChanges(): void {
    this.updateStepInfoLabel();
    this.announceStepChange();
  }

  private updateStepInfoLabel(): void {
    if (this.step) {
      this.stepInfoLabel = `Step information for ${this.step.description} at row ${this.position.row + 1}, step ${this.position.step + 1}`;
    } else {
      this.stepInfoLabel = 'No step selected';
    }
  }

  private announceStepChange(): void {
    if (this.step) {
      const message = `Step selected: ${this.step.description}. Count: ${this.step.count}. ${this.step.color ? `Color: ${this.step.color}` : 'No color specified'}`;
      this.screenReader.announceStatus(message, 500);
    }
  }

  getColorDescription(color?: string): string {
    if (!color) return 'No color';

    // Provide descriptive color names for common colors
    const colorDescriptions: { [key: string]: string } = {
      'red': 'Red',
      'blue': 'Blue',
      'green': 'Green',
      'yellow': 'Yellow',
      'purple': 'Purple',
      'orange': 'Orange',
      'pink': 'Pink',
      'brown': 'Brown',
      'black': 'Black',
      'white': 'White',
      'gray': 'Gray',
      'grey': 'Grey'
    };

    const lowerColor = color.toLowerCase();
    return colorDescriptions[lowerColor] || `Color ${color}`;
  }

  getProgressDescription(): string {
    // Calculate progress based on current position
    return `Step ${this.position.step + 1} of ${this.getTotalSteps()} in row ${this.position.row + 1}`;
  }

  markComplete(): void {
    if (this.step) {
      this.screenReader.announceStatus('Step marked as complete');
      this.stepComplete.emit();
    }
  }
}
```

## Visual Accessibility

### Color Contrast and Visual Design

```typescript
@Injectable({ providedIn: 'root' })
export class VisualAccessibilityService {
  private readonly CONTRAST_RATIOS = {
    AA_NORMAL: 4.5,
    AA_LARGE: 3,
    AAA_NORMAL: 7,
    AAA_LARGE: 4.5
  };

  constructor() {}

  // Check color contrast compliance
  checkColorContrast(foreground: string, background: string): ContrastResult {
    const fgLuminance = this.calculateLuminance(foreground);
    const bgLuminance = this.calculateLuminance(background);

    const contrast = this.calculateContrastRatio(fgLuminance, bgLuminance);

    return {
      ratio: contrast,
      aaCompliant: contrast >= this.CONTRAST_RATIOS.AA_NORMAL,
      aaaCompliant: contrast >= this.CONTRAST_RATIOS.AAA_NORMAL,
      recommendation: this.getContrastRecommendation(contrast)
    };
  }

  private calculateLuminance(color: string): number {
    const rgb = this.hexToRgb(color);

    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private calculateContrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  private hexToRgb(hex: string): number[] {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  // Generate accessible color palette
  generateAccessiblePalette(baseColor: string): AccessiblePalette {
    const baseRgb = this.hexToRgb(baseColor);

    return {
      primary: baseColor,
      primaryDark: this.adjustColor(baseRgb, 0.8),
      primaryLight: this.adjustColor(baseRgb, 1.2),
      textOnPrimary: this.getAccessibleTextColor(baseColor),
      borderColor: this.adjustColor(baseRgb, 0.7),
      hoverColor: this.adjustColor(baseRgb, 1.1),
      focusColor: this.adjustColor(baseRgb, 0.9)
    };
  }

  private getAccessibleTextColor(backgroundColor: string): string {
    const bgLuminance = this.calculateLuminance(backgroundColor);

    // Use white text on dark backgrounds, black text on light backgrounds
    return bgLuminance > 0.5 ? '#000000' : '#ffffff';
  }

  private adjustColor(rgb: number[], factor: number): string {
    const adjusted = rgb.map(c => Math.round(Math.min(255, Math.max(0, c * factor))));
    return `#${adjusted.map(c => c.toString(16).padStart(2, '0')).join('')}`;
  }
}
```

### High Contrast Mode Support

```typescript
@Injectable({ providedIn: 'root' })
export class HighContrastService {
  private isHighContrastMode = false;
  private mediaQuery: MediaQueryList;

  constructor(private renderer: Renderer2) {
    this.mediaQuery = window.matchMedia('(prefers-contrast: high)');
    this.isHighContrastMode = this.mediaQuery.matches;

    this.mediaQuery.addEventListener('change', (e) => {
      this.isHighContrastMode = e.matches;
      this.applyHighContrastMode();
    });

    this.applyHighContrastMode();
  }

  private applyHighContrastMode(): void {
    if (this.isHighContrastMode) {
      this.renderer.addClass(document.body, 'high-contrast');
    } else {
      this.renderer.removeClass(document.body, 'high-contrast');
    }
  }

  isHighContrast(): boolean {
    return this.isHighContrastMode;
  }

  getHighContrastColors(): HighContrastColors {
    return {
      background: '#000000',
      foreground: '#ffffff',
      border: '#ffffff',
      focus: '#ffff00',
      selection: '#0080ff',
      error: '#ff0000',
      success: '#00ff00',
      warning: '#ffff00'
    };
  }
}
```

## Motor Accessibility

### Alternative Input Methods

```typescript
@Injectable({ providedIn: 'root' })
export class MotorAccessibilityService {
  private touchTargetMinSize = 44; // 44px minimum touch target
  private clickTimeout = 300; // 300ms for double-click detection

  constructor(private gestureHandler: GestureHandler) {}

  // Ensure touch targets meet minimum size requirements
  validateTouchTargets(container: HTMLElement): TouchTargetValidation[] {
    const interactiveElements = container.querySelectorAll(
      'button, input, select, textarea, a, [tabindex], [role="button"], [role="link"]'
    );

    const validations: TouchTargetValidation[] = [];

    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const isValid = rect.width >= this.touchTargetMinSize && rect.height >= this.touchTargetMinSize;

      validations.push({
        element: element as HTMLElement,
        isValid,
        currentSize: { width: rect.width, height: rect.height },
        recommendedSize: { width: this.touchTargetMinSize, height: this.touchTargetMinSize }
      });
    });

    return validations;
  }

  // Setup gesture support
  setupGestureSupport(element: HTMLElement): void {
    this.gestureHandler.setupGestures(element, {
      onSwipeLeft: () => this.handleSwipeLeft(),
      onSwipeRight: () => this.handleSwipeRight(),
      onSwipeUp: () => this.handleSwipeUp(),
      onSwipeDown: () => this.handleSwipeDown(),
      onPinch: (scale: number) => this.handlePinch(scale),
      onTap: (event: Event) => this.handleTap(event),
      onLongPress: (event: Event) => this.handleLongPress(event)
    });
  }

  private handleSwipeLeft(): void {
    // Navigate to previous step
    this.dispatchNavigationEvent('previous');
  }

  private handleSwipeRight(): void {
    // Navigate to next step
    this.dispatchNavigationEvent('next');
  }

  private handleSwipeUp(): void {
    // Navigate to previous row
    this.dispatchNavigationEvent('up');
  }

  private handleSwipeDown(): void {
    // Navigate to next row
    this.dispatchNavigationEvent('down');
  }

  private handlePinch(scale: number): void {
    // Zoom in/out
    this.dispatchZoomEvent(scale);
  }

  private handleTap(event: Event): void {
    // Single tap - select step
    this.dispatchSelectionEvent(event);
  }

  private handleLongPress(event: Event): void {
    // Long press - show context menu
    this.dispatchContextMenuEvent(event);
  }

  private dispatchNavigationEvent(direction: string): void {
    const event = new CustomEvent('navigate', {
      detail: { direction },
      bubbles: true
    });

    document.dispatchEvent(event);
  }

  private dispatchZoomEvent(scale: number): void {
    const event = new CustomEvent('zoom', {
      detail: { scale },
      bubbles: true
    });

    document.dispatchEvent(event);
  }

  private dispatchSelectionEvent(originalEvent: Event): void {
    const event = new CustomEvent('stepSelect', {
      detail: { originalEvent },
      bubbles: true
    });

    document.dispatchEvent(event);
  }

  private dispatchContextMenuEvent(originalEvent: Event): void {
    const event = new CustomEvent('contextMenu', {
      detail: { originalEvent },
      bubbles: true
    });

    document.dispatchEvent(event);
  }
}
```

## Accessibility Testing

### Automated Testing

```typescript
@Injectable({ providedIn: 'root' })
export class AccessibilityTestingService {
  private axeCore: any;

  constructor() {
    this.loadAxeCore();
  }

  private async loadAxeCore(): Promise<void> {
    // Load axe-core for automated accessibility testing
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.7.0/axe.min.js';
    script.onload = () => {
      this.axeCore = (window as any).axe;
    };
    document.head.appendChild(script);
  }

  async runAccessibilityAudit(element?: HTMLElement): Promise<AccessibilityAuditResult> {
    if (!this.axeCore) {
      throw new Error('Axe-core not loaded');
    }

    const options = {
      rules: {
        // Enable all WCAG 2.1 AAA rules
        'color-contrast-enhanced': { enabled: true },
        'link-in-text-block': { enabled: true },
        'meta-refresh': { enabled: true },
        'meta-viewport': { enabled: true }
      }
    };

    try {
      const results = await this.axeCore.run(element || document, options);

      return {
        passed: results.passes,
        violations: results.violations,
        incomplete: results.incomplete,
        inaccessible: results.inaccessible,
        summary: {
          totalTests: results.passes.length + results.violations.length + results.incomplete.length,
          passedTests: results.passes.length,
          failedTests: results.violations.length,
          incompleteTests: results.incomplete.length
        }
      };
    } catch (error) {
      throw new Error(`Accessibility audit failed: ${error}`);
    }
  }

  async validateKeyboardNavigation(container: HTMLElement): Promise<KeyboardNavigationResult> {
    const focusableElements = this.getFocusableElements(container);
    const results: KeyboardNavigationResult = {
      totalFocusableElements: focusableElements.length,
      keyboardAccessible: true,
      tabOrder: [],
      issues: []
    };

    for (let i = 0; i < focusableElements.length; i++) {
      const element = focusableElements[i];

      // Check if element is keyboard accessible
      const isKeyboardAccessible = this.isKeyboardAccessible(element);

      if (!isKeyboardAccessible) {
        results.keyboardAccessible = false;
        results.issues.push({
          element,
          issue: 'Element is not keyboard accessible',
          recommendation: 'Add appropriate keyboard event handlers'
        });
      }

      // Check tab order
      const tabIndex = element.getAttribute('tabindex');
      results.tabOrder.push({
        element,
        tabIndex: tabIndex ? parseInt(tabIndex) : 0,
        inOrder: this.isInCorrectTabOrder(element, i)
      });
    }

    return results;
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]'
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(', '))) as HTMLElement[];
  }

  private isKeyboardAccessible(element: HTMLElement): boolean {
    // Check if element has keyboard event handlers
    const hasKeyboardHandler = element.onkeydown || element.onkeyup || element.onkeypress;

    // Check if element has appropriate ARIA attributes
    const hasAriaRole = element.getAttribute('role');
    const hasAriaLabel = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');

    // Check if element is natively focusable
    const isNativelyFocusable = ['button', 'input', 'select', 'textarea', 'a'].includes(element.tagName.toLowerCase());

    return isNativelyFocusable || (hasKeyboardHandler && hasAriaRole && hasAriaLabel);
  }

  private isInCorrectTabOrder(element: HTMLElement, expectedIndex: number): boolean {
    const tabIndex = element.getAttribute('tabindex');

    if (!tabIndex || tabIndex === '0') {
      return true; // Natural tab order
    }

    const numericTabIndex = parseInt(tabIndex);
    return numericTabIndex === expectedIndex + 1;
  }
}
```

### Manual Testing Checklist

```typescript
interface AccessibilityTestingChecklist {
  keyboardNavigation: {
    tabThroughAllElements: boolean;
    enterActivatesElements: boolean;
    spaceActivatesElements: boolean;
    escapeClosesModals: boolean;
    arrowKeysNavigateGrids: boolean;
    homeEndNavigation: boolean;
    skipLinks: boolean;
    focusVisible: boolean;
    focusTrapping: boolean;
    logicalTabOrder: boolean;
  };

  screenReader: {
    allContentAnnounced: boolean;
    headingStructure: boolean;
    landmarkRoles: boolean;
    formLabels: boolean;
    buttonLabels: boolean;
    linkPurpose: boolean;
    tableHeaders: boolean;
    listStructure: boolean;
    liveRegions: boolean;
    statusUpdates: boolean;
  };

  visualAccessibility: {
    colorContrast: boolean;
    colorNotOnlyIndicator: boolean;
    textScaling: boolean;
    zoomSupport: boolean;
    motionReduction: boolean;
    highContrastMode: boolean;
    darkModeSupport: boolean;
  };

  motorAccessibility: {
    touchTargetSize: boolean;
    gestureSupport: boolean;
    alternativeInputs: boolean;
    timeoutExtensions: boolean;
    clickTargetSpacing: boolean;
    dragAndDropAlternatives: boolean;
  };

  cognitiveAccessibility: {
    clearInstructions: boolean;
    errorPrevention: boolean;
    errorRecovery: boolean;
    consistentNavigation: boolean;
    predictableInteractions: boolean;
    contextHelp: boolean;
    progressIndicators: boolean;
  };
}
```

## Best Practices

### Accessibility Guidelines

1. **Semantic HTML**: Use proper HTML elements and ARIA roles
2. **Keyboard Navigation**: Ensure all functionality is keyboard accessible
3. **Screen Reader Support**: Provide meaningful labels and descriptions
4. **Color Contrast**: Maintain WCAG 2.1 AAA contrast ratios
5. **Focus Management**: Implement proper focus handling and trapping
6. **Alternative Text**: Provide descriptive alt text for images
7. **Form Accessibility**: Use proper labels and error handling
8. **Live Regions**: Announce dynamic content changes

### Implementation Checklist

- [ ] ARIA roles and properties implemented
- [ ] Keyboard navigation fully functional
- [ ] Screen reader announcements working
- [ ] Color contrast meets AAA standards
- [ ] Focus management implemented
- [ ] Touch targets meet minimum size
- [ ] Alternative input methods supported
- [ ] Automated accessibility testing integrated
- [ ] Manual testing completed
- [ ] User testing with assistive technologies

## Conclusion

The accessibility implementation in Rowguide ensures that all users, regardless of their abilities, can effectively use the pattern tracking application. Through comprehensive ARIA implementation, keyboard navigation, screen reader support, and visual accessibility features, the application provides an inclusive experience that meets and exceeds WCAG 2.1 AAA standards.

The accessibility architecture supports:
- **Full keyboard navigation** with intuitive shortcuts
- **Screen reader compatibility** with meaningful announcements
- **Visual accessibility** with high contrast and color-blind friendly design
- **Motor accessibility** with gesture support and alternative inputs
- **Cognitive accessibility** with clear instructions and error prevention

This comprehensive approach ensures that Rowguide is usable by everyone, making pattern tracking accessible to the entire crafting community.

---
layout: page
title: Accessibility Implementation Guide
permalink: /code-examples/accessibility/
---

# Accessibility Implementation Guide

## Enhanced Step Component with Full Accessibility

```typescript
import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  HostBinding,
  ElementRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatRippleModule } from "@angular/material/core";
import { MatTooltipModule } from "@angular/material/tooltip";

import { Step } from "../../../../core/models";

@Component({
  selector: "app-step",
  standalone: true,
  imports: [CommonModule, MatRippleModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="step-button"
      [class.active]="isActive"
      [class.completed]="isCompleted"
      [class.highlighted]="isHighlighted"
      [attr.aria-label]="stepAriaLabel"
      [attr.aria-pressed]="isActive"
      [attr.aria-describedby]="stepDescriptionId"
      [attr.aria-current]="isActive ? 'step' : null"
      [matTooltip]="tooltipText"
      [matTooltipDisabled]="!showTooltip"
      matRipple
      [matRippleDisabled]="disabled"
      (click)="onStepClick()"
      (focus)="onFocus()"
      (blur)="onBlur()"
      type="button"
      role="button"
      tabindex="0"
    >
      <span class="step-count" aria-hidden="true">
        {{ step.count }}
      </span>

      <span
        class="step-description"
        [id]="stepDescriptionId"
        [attr.aria-label]="step.description || 'No description'"
      >
        {{ step.description || "Step " + step.id }}
      </span>

      <span *ngIf="isCompleted" class="completion-indicator" aria-hidden="true">
        ✓
      </span>

      <!-- Screen reader only content -->
      <span class="sr-only">
        {{ screenReaderContent }}
      </span>
    </button>
  `,
  styles: [
    `
      .step-button {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border: 2px solid transparent;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
        width: 100%;
        text-align: left;
        font-family: inherit;
        font-size: 1rem;

        /* Ensure minimum touch target size */
        min-height: 44px;
        min-width: 44px;
      }

      .step-button:hover {
        background: #f5f5f5;
        border-color: #ddd;
      }

      .step-button:focus {
        outline: none;
        border-color: #2196f3;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
      }

      .step-button:focus-visible {
        border-color: #2196f3;
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.4);
      }

      .step-button.active {
        background: #e3f2fd;
        border-color: #2196f3;
        color: #1976d2;
      }

      .step-button.completed {
        background: #e8f5e8;
        border-color: #4caf50;
      }

      .step-button.highlighted {
        animation: highlight 2s ease-in-out;
      }

      .step-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .step-count {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 2rem;
        height: 2rem;
        background: #f0f0f0;
        border-radius: 50%;
        font-weight: bold;
        font-size: 0.9rem;
      }

      .step-button.active .step-count {
        background: #2196f3;
        color: white;
      }

      .step-button.completed .step-count {
        background: #4caf50;
        color: white;
      }

      .step-description {
        flex: 1;
        font-weight: 500;
      }

      .completion-indicator {
        color: #4caf50;
        font-weight: bold;
        font-size: 1.2rem;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      @keyframes highlight {
        0%,
        100% {
          background: white;
        }
        50% {
          background: #fff3cd;
        }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .step-button {
          border-width: 3px;
        }

        .step-button:focus {
          border-color: #000;
          box-shadow: 0 0 0 2px #fff, 0 0 0 4px #000;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .step-button,
        .completion-indicator {
          transition: none;
        }

        .step-button.highlighted {
          animation: none;
          background: #fff3cd;
        }
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .step-button {
          background: #2d2d2d;
          color: #fff;
          border-color: #555;
        }

        .step-button:hover {
          background: #404040;
        }

        .step-count {
          background: #555;
          color: #fff;
        }
      }
    `,
  ],
})
export class StepComponent {
  @Input() step!: Step;
  @Input() isActive = false;
  @Input() isCompleted = false;
  @Input() isHighlighted = false;
  @Input() disabled = false;
  @Input() showTooltip = true;
  @Input() index = 0;
  @Input() totalSteps = 0;

  @Output() stepClicked = new EventEmitter<Step>();
  @Output() stepFocused = new EventEmitter<Step>();
  @Output() stepBlurred = new EventEmitter<Step>();

  @HostBinding("attr.role") role = "listitem";
  @HostBinding("attr.aria-setsize") get ariaSetsize() {
    return this.totalSteps;
  }
  @HostBinding("attr.aria-posinset") get ariaPosInSet() {
    return this.index + 1;
  }

  constructor(private elementRef: ElementRef) {}

  // Keyboard event handlers
  @HostListener("keydown.enter", ["$event"])
  @HostListener("keydown.space", ["$event"])
  onKeyboardActivate(event: KeyboardEvent): void {
    event.preventDefault();
    if (!this.disabled) {
      this.onStepClick();
    }
  }

  @HostListener("keydown.arrowup", ["$event"])
  onArrowUp(event: KeyboardEvent): void {
    event.preventDefault();
    this.focusPreviousStep();
  }

  @HostListener("keydown.arrowdown", ["$event"])
  onArrowDown(event: KeyboardEvent): void {
    event.preventDefault();
    this.focusNextStep();
  }

  @HostListener("keydown.home", ["$event"])
  onHome(event: KeyboardEvent): void {
    event.preventDefault();
    this.focusFirstStep();
  }

  @HostListener("keydown.end", ["$event"])
  onEnd(event: KeyboardEvent): void {
    event.preventDefault();
    this.focusLastStep();
  }

  get stepAriaLabel(): string {
    const parts = [
      `Step ${this.index + 1} of ${this.totalSteps}`,
      this.step.description || `Step ${this.step.id}`,
      `Count: ${this.step.count}`,
    ];

    if (this.isActive) {
      parts.push("Currently selected");
    }

    if (this.isCompleted) {
      parts.push("Completed");
    }

    return parts.join(", ");
  }

  get stepDescriptionId(): string {
    return `step-desc-${this.step.id}`;
  }

  get tooltipText(): string {
    if (!this.showTooltip) return "";

    const parts = [this.step.description || `Step ${this.step.id}`];

    if (this.step.count > 1) {
      parts.push(`Repeat ${this.step.count} times`);
    }

    return parts.join(" - ");
  }

  get screenReaderContent(): string {
    const parts = [];

    if (this.isActive) {
      parts.push("Current step");
    }

    if (this.isCompleted) {
      parts.push("Completed");
    }

    if (this.step.count > 1) {
      parts.push(`Repeat ${this.step.count} times`);
    }

    return parts.join(", ");
  }

  onStepClick(): void {
    if (!this.disabled) {
      this.stepClicked.emit(this.step);
      this.announceStepSelection();
    }
  }

  onFocus(): void {
    this.stepFocused.emit(this.step);
  }

  onBlur(): void {
    this.stepBlurred.emit(this.step);
  }

  focus(): void {
    this.elementRef.nativeElement.querySelector(".step-button")?.focus();
  }

  private focusPreviousStep(): void {
    const currentElement = this.elementRef.nativeElement;
    const previousStep =
      currentElement.previousElementSibling?.querySelector(".step-button");
    if (previousStep) {
      previousStep.focus();
    }
  }

  private focusNextStep(): void {
    const currentElement = this.elementRef.nativeElement;
    const nextStep =
      currentElement.nextElementSibling?.querySelector(".step-button");
    if (nextStep) {
      nextStep.focus();
    }
  }

  private focusFirstStep(): void {
    const currentElement = this.elementRef.nativeElement;
    const container = currentElement.parentElement;
    const firstStep = container?.querySelector(".step-button");
    if (firstStep) {
      firstStep.focus();
    }
  }

  private focusLastStep(): void {
    const currentElement = this.elementRef.nativeElement;
    const container = currentElement.parentElement;
    const allSteps = container?.querySelectorAll(".step-button");
    if (allSteps && allSteps.length > 0) {
      (allSteps[allSteps.length - 1] as HTMLElement).focus();
    }
  }

  private announceStepSelection(): void {
    // Create a live region announcement for screen readers
    const announcement = `Selected ${
      this.step.description || `step ${this.step.id}`
    }`;
    this.createLiveAnnouncement(announcement);
  }

  private createLiveAnnouncement(message: string): void {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
```

## Accessible Row Component

```typescript
import {
  Component,
  Input,
  Output,
  EventEmitter,
  QueryList,
  ViewChildren,
  AfterViewInit,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";

import { Row, Step } from "../../../../core/models";
import { StepComponent } from "../step/step.component";

@Component({
  selector: "app-row",
  standalone: true,
  imports: [CommonModule, StepComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="row-container"
      [attr.aria-label]="rowAriaLabel"
      role="region"
      [attr.aria-expanded]="isExpanded"
      [attr.aria-describedby]="rowDescriptionId"
    >
      <div class="row-header">
        <button
          class="row-toggle"
          [attr.aria-label]="toggleAriaLabel"
          [attr.aria-expanded]="isExpanded"
          [attr.aria-controls]="stepsContainerId"
          (click)="toggleExpanded()"
          type="button"
        >
          <span class="row-number">Row {{ row.id }}</span>
          <span class="row-summary" [id]="rowDescriptionId">
            {{ stepsSummary }}
          </span>
          <span class="toggle-icon" aria-hidden="true">
            {{ isExpanded ? "▼" : "▶" }}
          </span>
        </button>
      </div>

      <div
        class="steps-container"
        [id]="stepsContainerId"
        [attr.aria-hidden]="!isExpanded"
        [style.display]="isExpanded ? 'block' : 'none'"
        role="list"
        [attr.aria-label]="stepsAriaLabel"
      >
        <app-step
          *ngFor="let step of row.steps; trackBy: trackByStepId; let i = index"
          [step]="step"
          [index]="i"
          [totalSteps]="row.steps.length"
          [isActive]="activeStepId === step.id"
          [isCompleted]="isStepCompleted(step.id)"
          [disabled]="disabled"
          (stepClicked)="onStepClicked($event)"
          (stepFocused)="onStepFocused($event)"
        >
        </app-step>

        <div *ngIf="row.steps.length === 0" class="empty-row">
          <p>No steps in this row</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .row-container {
        margin-bottom: 1rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
      }

      .row-header {
        background: #f8f9fa;
        border-bottom: 1px solid #e0e0e0;
      }

      .row-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border: none;
        background: transparent;
        cursor: pointer;
        font-family: inherit;
        font-size: 1rem;
        text-align: left;
        transition: background-color 0.2s;

        /* Ensure minimum touch target */
        min-height: 44px;
      }

      .row-toggle:hover {
        background: rgba(0, 0, 0, 0.04);
      }

      .row-toggle:focus {
        outline: 2px solid #2196f3;
        outline-offset: -2px;
        background: rgba(33, 150, 243, 0.1);
      }

      .row-number {
        font-weight: bold;
        font-size: 1.1rem;
        color: #1976d2;
        min-width: 4rem;
      }

      .row-summary {
        flex: 1;
        color: #666;
      }

      .toggle-icon {
        font-size: 0.8rem;
        color: #999;
        transition: transform 0.2s;
      }

      .steps-container {
        padding: 0.5rem;
      }

      .empty-row {
        padding: 2rem;
        text-align: center;
        color: #999;
        font-style: italic;
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .row-container {
          border-width: 2px;
        }

        .row-toggle:focus {
          outline-width: 3px;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .toggle-icon,
        .row-toggle {
          transition: none;
        }
      }
    `,
  ],
})
export class RowComponent implements AfterViewInit {
  @Input() row!: Row;
  @Input() isExpanded = false;
  @Input() activeStepId: number | null = null;
  @Input() completedStepIds: number[] = [];
  @Input() disabled = false;
  @Input() index = 0;

  @Output() stepClicked = new EventEmitter<Step>();
  @Output() stepFocused = new EventEmitter<Step>();
  @Output() rowToggled = new EventEmitter<{ row: Row; expanded: boolean }>();

  @ViewChildren(StepComponent) stepComponents!: QueryList<StepComponent>;

  ngAfterViewInit(): void {
    // Set up keyboard navigation between steps
    this.setupKeyboardNavigation();
  }

  get rowAriaLabel(): string {
    return `Row ${this.row.id} with ${this.row.steps.length} steps`;
  }

  get toggleAriaLabel(): string {
    const state = this.isExpanded ? "Collapse" : "Expand";
    return `${state} row ${this.row.id} with ${this.row.steps.length} steps`;
  }

  get stepsContainerId(): string {
    return `steps-container-${this.row.id}`;
  }

  get rowDescriptionId(): string {
    return `row-desc-${this.row.id}`;
  }

  get stepsAriaLabel(): string {
    return `Steps for row ${this.row.id}`;
  }

  get stepsSummary(): string {
    if (this.row.steps.length === 0) {
      return "No steps";
    }

    if (this.row.steps.length === 1) {
      return "1 step";
    }

    return `${this.row.steps.length} steps`;
  }

  trackByStepId(index: number, step: Step): number {
    return step.id;
  }

  isStepCompleted(stepId: number): boolean {
    return this.completedStepIds.includes(stepId);
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.rowToggled.emit({
      row: this.row,
      expanded: this.isExpanded,
    });

    // Announce state change
    const message = this.isExpanded
      ? `Expanded row ${this.row.id}`
      : `Collapsed row ${this.row.id}`;
    this.announceStateChange(message);
  }

  onStepClicked(step: Step): void {
    this.stepClicked.emit(step);
  }

  onStepFocused(step: Step): void {
    this.stepFocused.emit(step);
  }

  focusFirstStep(): void {
    if (this.stepComponents.length > 0) {
      this.stepComponents.first.focus();
    }
  }

  focusLastStep(): void {
    if (this.stepComponents.length > 0) {
      this.stepComponents.last.focus();
    }
  }

  private setupKeyboardNavigation(): void {
    // Additional keyboard navigation logic if needed
    // Most navigation is handled by individual step components
  }

  private announceStateChange(message: string): void {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.className = "sr-only";
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
```

## Accessibility Service

```typescript
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  increasedTextSize: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
}

@Injectable({ providedIn: "root" })
export class AccessibilityService {
  private settings$ = new BehaviorSubject<AccessibilitySettings>({
    reduceMotion: false,
    highContrast: false,
    increasedTextSize: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
  });

  constructor() {
    this.detectSystemPreferences();
    this.loadUserPreferences();
  }

  getSettings(): Observable<AccessibilitySettings> {
    return this.settings$.asObservable();
  }

  updateSettings(updates: Partial<AccessibilitySettings>): void {
    const current = this.settings$.value;
    const updated = { ...current, ...updates };
    this.settings$.next(updated);
    this.saveUserPreferences(updated);
    this.applySettings(updated);
  }

  announceToScreenReader(
    message: string,
    priority: "polite" | "assertive" = "polite"
  ): void {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }

  focusElement(selector: string): boolean {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }

  private detectSystemPreferences(): void {
    const current = this.settings$.value;

    // Detect prefers-reduced-motion
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      current.reduceMotion = true;
    }

    // Detect prefers-contrast
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-contrast: high)").matches
    ) {
      current.highContrast = true;
    }

    this.settings$.next(current);
    this.applySettings(current);
  }

  private loadUserPreferences(): void {
    try {
      const saved = localStorage.getItem("accessibility-settings");
      if (saved) {
        const settings = JSON.parse(saved);
        this.updateSettings(settings);
      }
    } catch (error) {
      console.warn("Failed to load accessibility settings:", error);
    }
  }

  private saveUserPreferences(settings: AccessibilitySettings): void {
    try {
      localStorage.setItem("accessibility-settings", JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to save accessibility settings:", error);
    }
  }

  private applySettings(settings: AccessibilitySettings): void {
    const body = document.body;

    // Apply CSS classes based on settings
    body.classList.toggle("reduce-motion", settings.reduceMotion);
    body.classList.toggle("high-contrast", settings.highContrast);
    body.classList.toggle("large-text", settings.increasedTextSize);
    body.classList.toggle(
      "screen-reader-optimized",
      settings.screenReaderOptimized
    );
    body.classList.toggle("keyboard-navigation", settings.keyboardNavigation);
  }
}
```

---
layout: page
title: Error Handling Implementation
permalink: /code-examples/error-handling/
---

# Error Handling Service Implementation

## Core Error Handler Service

```typescript
import { Injectable } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { BehaviorSubject, Observable } from "rxjs";

export interface AppError {
  id: string;
  message: string;
  code?: string;
  context?: any;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ErrorNotification {
  message: string;
  action?: string;
  duration?: number;
}

@Injectable({ providedIn: "root" })
export class ErrorHandlerService {
  private errors$ = new BehaviorSubject<AppError[]>([]);
  private notifications$ = new BehaviorSubject<ErrorNotification | null>(null);

  constructor(private logger: NGXLogger) {}

  /**
   * Handle application errors with context and user feedback
   */
  handleError(
    error: unknown,
    context?: string,
    userMessage?: string,
    severity: AppError["severity"] = "medium"
  ): void {
    const appError: AppError = {
      id: this.generateErrorId(),
      message: this.extractErrorMessage(error),
      context,
      timestamp: new Date(),
      severity,
    };

    // Log error with full context
    this.logger.error("Application Error", {
      error: appError,
      originalError: error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Store error for potential reporting
    this.addError(appError);

    // Show user notification
    if (userMessage || severity === "high" || severity === "critical") {
      this.showNotification({
        message:
          userMessage || "An unexpected error occurred. Please try again.",
        action: severity === "critical" ? "Reload Page" : "Dismiss",
        duration: severity === "critical" ? 0 : 5000,
      });
    }

    // Report critical errors immediately
    if (severity === "critical") {
      this.reportCriticalError(appError);
    }
  }

  /**
   * Handle specific database errors
   */
  handleDatabaseError(error: unknown, operation: string): void {
    this.handleError(
      error,
      `Database operation: ${operation}`,
      "Unable to save your changes. Please check your connection and try again.",
      "high"
    );
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: unknown, url?: string): void {
    this.handleError(
      error,
      `Network request: ${url}`,
      "Unable to connect to the server. Please check your internet connection.",
      "medium"
    );
  }

  /**
   * Handle validation errors
   */
  handleValidationError(errors: string[], context?: string): void {
    const errorMessage =
      errors.length === 1
        ? errors[0]
        : `Multiple validation errors: ${errors.join(", ")}`;

    this.handleError(
      new Error(errorMessage),
      `Validation: ${context}`,
      errorMessage,
      "low"
    );
  }

  /**
   * Get error notifications observable
   */
  getNotifications(): Observable<ErrorNotification | null> {
    return this.notifications$.asObservable();
  }

  /**
   * Clear current notification
   */
  clearNotification(): void {
    this.notifications$.next(null);
  }

  /**
   * Get all errors for debugging/reporting
   */
  getErrors(): Observable<AppError[]> {
    return this.errors$.asObservable();
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Unknown error occurred";
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addError(error: AppError): void {
    const currentErrors = this.errors$.value;
    // Keep only last 50 errors to prevent memory issues
    const updatedErrors = [error, ...currentErrors].slice(0, 50);
    this.errors$.next(updatedErrors);
  }

  private showNotification(notification: ErrorNotification): void {
    this.notifications$.next(notification);
  }

  private reportCriticalError(error: AppError): void {
    // Implement external error reporting here
    // Example: Send to Sentry, LogRocket, etc.
    console.error("Critical Error Reported:", error);
  }
}
```

## Error Boundary Component

```typescript
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { Subject, takeUntil } from "rxjs";

import {
  ErrorHandlerService,
  AppError,
} from "../services/error-handler.service";

@Component({
  selector: "app-error-boundary",
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div *ngIf="hasError; else content" class="error-boundary">
      <mat-card class="error-card" [ngClass]="'error-' + errorSeverity">
        <mat-card-header>
          <mat-icon mat-card-avatar [ngSwitch]="errorSeverity">
            <span *ngSwitchCase="'critical'">error</span>
            <span *ngSwitchCase="'high'">warning</span>
            <span *ngSwitchDefault>info</span>
          </mat-icon>
          <mat-card-title>{{ errorTitle }}</mat-card-title>
          <mat-card-subtitle *ngIf="errorSubtitle">{{
            errorSubtitle
          }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <p>{{ errorMessage }}</p>
          <details *ngIf="showDetails && errorDetails">
            <summary>Technical Details</summary>
            <pre>{{ errorDetails }}</pre>
          </details>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="dismiss()" *ngIf="canDismiss">
            Dismiss
          </button>
          <button mat-raised-button color="primary" (click)="retry()">
            {{ retryLabel }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>

    <ng-template #content>
      <ng-content></ng-content>
    </ng-template>
  `,
  styles: [
    `
      .error-boundary {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 200px;
        padding: 1rem;
      }

      .error-card {
        max-width: 500px;
        width: 100%;
      }

      .error-critical {
        border-left: 4px solid #f44336;
      }

      .error-high {
        border-left: 4px solid #ff9800;
      }

      .error-medium {
        border-left: 4px solid #2196f3;
      }

      .error-low {
        border-left: 4px solid #4caf50;
      }

      pre {
        background: #f5f5f5;
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        overflow-x: auto;
      }
    `,
  ],
})
export class ErrorBoundaryComponent implements OnDestroy {
  @Input() showDetails = false;
  @Input() canDismiss = true;
  @Input() retryLabel = "Try Again";
  @Output() retryClicked = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  hasError = false;
  errorMessage = "";
  errorTitle = "Something went wrong";
  errorSubtitle = "";
  errorDetails = "";
  errorSeverity: "low" | "medium" | "high" | "critical" = "medium";

  private destroy$ = new Subject<void>();

  constructor(private errorHandler: ErrorHandlerService) {
    this.errorHandler
      .getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        if (notification) {
          this.showError(notification.message);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  showError(
    message: string,
    title?: string,
    severity: "low" | "medium" | "high" | "critical" = "medium",
    details?: string
  ): void {
    this.hasError = true;
    this.errorMessage = message;
    this.errorTitle = title || this.getDefaultTitle(severity);
    this.errorSeverity = severity;
    this.errorDetails = details || "";
    this.canDismiss = severity !== "critical";
  }

  retry(): void {
    this.hasError = false;
    this.retryClicked.emit();
  }

  dismiss(): void {
    this.hasError = false;
    this.dismissed.emit();
    this.errorHandler.clearNotification();
  }

  private getDefaultTitle(severity: string): string {
    switch (severity) {
      case "critical":
        return "Critical Error";
      case "high":
        return "Error";
      case "medium":
        return "Something went wrong";
      case "low":
        return "Notice";
      default:
        return "Something went wrong";
    }
  }
}
```

## Usage Examples

### In Services

```typescript
@Injectable({ providedIn: "root" })
export class ProjectDbService {
  constructor(
    private indexedDbService: IndexedDbService,
    private errorHandler: ErrorHandlerService
  ) {}

  async loadProjects(): Promise<Project[]> {
    try {
      const db = await this.indexedDbService.openDB();
      const projects = await db.getAll("projects");
      return projects.filter(isValidProject);
    } catch (error) {
      this.errorHandler.handleDatabaseError(error, "load projects");
      return [];
    }
  }

  async updateProject(project: Project): Promise<boolean> {
    if (!hasValidId(project)) {
      this.errorHandler.handleValidationError(
        ["Project must have a valid ID"],
        "update project"
      );
      return false;
    }

    try {
      const db = await this.indexedDbService.openDB();
      await db.put("projects", project);
      return true;
    } catch (error) {
      this.errorHandler.handleDatabaseError(error, "update project");
      return false;
    }
  }
}
```

### In Components

```typescript
@Component({
  selector: "app-project-form",
  template: `
    <app-error-boundary (retryClicked)="onRetry()">
      <form [formGroup]="projectForm" (ngSubmit)="onSubmit()">
        <!-- form content -->
      </form>
    </app-error-boundary>
  `,
})
export class ProjectFormComponent {
  constructor(
    private errorHandler: ErrorHandlerService,
    private projectService: ProjectService
  ) {}

  async onSubmit(): Promise<void> {
    if (this.projectForm.invalid) {
      const errors = this.getFormErrors();
      this.errorHandler.handleValidationError(errors, "project form");
      return;
    }

    try {
      const project = this.createProjectFromForm();
      await this.projectService.saveProject(project);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        "save project form",
        "Unable to save project. Please try again.",
        "high"
      );
    }
  }

  onRetry(): void {
    // Reset form state or retry last operation
    this.onSubmit();
  }

  private getFormErrors(): string[] {
    const errors: string[] = [];
    Object.keys(this.projectForm.controls).forEach((key) => {
      const control = this.projectForm.get(key);
      if (control?.errors) {
        errors.push(`${key}: ${Object.keys(control.errors).join(", ")}`);
      }
    });
    return errors;
  }
}
```

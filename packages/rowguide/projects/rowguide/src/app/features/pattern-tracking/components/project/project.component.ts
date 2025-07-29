import { CommonModule, NgFor } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  HostListener,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { BehaviorSubject, Observable, firstValueFrom, of } from 'rxjs';
import {
  combineLatestWith,
  distinctUntilChanged,
  filter,
  map,
  skipWhile,
  switchMap,
  take,
} from 'rxjs/operators';

import { Position } from '../../../../core/models/position';
import {
  Project,
  Row,
  isValidProject,
  SafeAccess,
  hasValidId,
} from '../../../../core/models';
import { MarkModeService, SettingsService } from '../../../../core/services';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { ProjectActions } from '../../../../core/store/actions/project-actions';
import {
  selectCurrentProject,
  selectZippedRows,
  selectCurrentPosition,
} from '../../../../core/store/selectors/project-selectors';
import { HierarchicalList } from '../../../../shared/utils/hierarchical-list';
import { sanity } from '../../../../shared/utils/sanity';
import { PeyoteShorthandService } from '../../../file-import/loaders';
import { ZipperService } from '../../../file-import/services';
import { ProjectService } from '../../../project-management/services';
import { BeadCountBottomSheet } from '../bead-count-bottom-sheet/bead-count-bottom-sheet';
import { RowComponent } from '../row/row.component';
import { StepComponent } from '../step/step.component';
import { ErrorBoundaryComponent } from '../../../../shared/components/error-boundary/error-boundary.component';

/**
 * Main project component implementing hierarchical navigation for pattern tracking.
 * Manages project display, step-by-step navigation, and mark mode functionality.
 *
 * Core Responsibilities:
 * - **Hierarchical Navigation**: Implements HierarchicalList for tree-like navigation
 * - **Route-Based Project Loading**: Loads projects based on URL parameters with fallbacks
 * - **Mark Mode Management**: Handles mark mode state with CSS class binding
 * - **Keyboard Navigation**: Provides arrow key navigation through pattern steps
 * - **Position Persistence**: Saves current position to localStorage for session continuity
 * - **Error Recovery**: Integrates with error boundary for graceful error handling
 *
 * Architecture Features:
 * - Uses OnPush change detection for optimal performance
 * - Reactive state management through ReactiveStateStore integration
 * - Observable-driven UI updates with null safety patterns
 * - Hierarchical component structure (Project → Row → Step)
 * - Integration with settings for display customization
 *
 * Navigation Patterns:
 * - Step-by-step navigation with automatic row advancement
 * - Multi-step advancement with configurable step count
 * - Keyboard shortcuts for all navigation actions
 * - Position tracking with persistence across sessions
 * - End-of-pattern handling with automatic reset
 *
 * @example
 * ```typescript
 * // Basic component usage in routing
 * {
 *   path: 'project/:id',
 *   component: ProjectComponent
 * }
 *
 * // Navigation interaction
 * <app-project></app-project>
 *
 * // Programmatic navigation
 * this.router.navigate(['project', { id: projectId }]);
 *
 * // Mark mode integration
 * <app-project [class.mark-mode]="markMode > 0"></app-project>
 *
 * // Error recovery integration
 * <app-error-boundary (retry)="onRetry()">
 *   <app-project></app-project>
 * </app-error-boundary>
 * ```
 */
@Component({
  selector: 'app-project',
  imports: [
    NgFor,
    RowComponent,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    CommonModule,
    ErrorBoundaryComponent,
  ],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectComponent implements HierarchicalList {
  /**
   * Observable stream of pattern rows with optional row combining based on settings.
   * Automatically applies combine12 setting to merge first two rows when enabled.
   * Provides null-safe access to project row data with distinctUntilChanged optimization.
   */
  rows$: Observable<Row[]> = this.store.select(selectZippedRows).pipe(
    map((rows) => rows ?? []),
    distinctUntilChanged()
  );

  /**
   * Observable stream of current position coordinates within the pattern.
   * Provides fallback to origin position (0,0) for null safety and consistent state.
   * Initialized in constructor to ensure store dependency is available.
   */
  position$!: Observable<Position>;

  /**
   * Project observable stream initialized in ngOnInit for route-based project loading.
   * Handles URL parameter parsing, project loading, and fallback to current project.
   */
  project$!: Observable<Project>;

  /**
   * Settings observable for multi-step advancement count.
   * Used by template for bulk navigation operations.
   */
  multiadvance$ = this.settingsService.multiadvance$;

  /**
   * ViewChildren query for accessing child RowComponent instances.
   * Required for hierarchical navigation and component tree management.
   */
  @ViewChildren(RowComponent) children!: QueryList<RowComponent>;

  /**
   * Observable stream of child RowComponent QueryList for reactive navigation.
   * Enables navigation system to respond to dynamic component changes.
   */
  children$: BehaviorSubject<QueryList<RowComponent>> = new BehaviorSubject<
    QueryList<RowComponent>
  >(new QueryList<RowComponent>());

  /**
   * Observable stream of currently active StepComponent for position tracking.
   * Central reference for navigation operations and current step highlighting.
   */
  currentStep$: BehaviorSubject<StepComponent | null> =
    new BehaviorSubject<StepComponent | null>(null);

  /**
   * HierarchicalList interface implementation - component index in parent collection.
   * Always 0 for root project component as it has no siblings.
   */
  index: number = 0;

  /**
   * HierarchicalList interface implementation - parent component reference.
   * Always null for root project component.
   */
  parent = null;

  /**
   * HierarchicalList interface implementation - previous sibling reference.
   * Always null for root project component.
   */
  prev = null;

  /**
   * HierarchicalList interface implementation - next sibling reference.
   * Always null for root project component.
   */
  next = null;

  /**
   * Host binding for mark mode CSS classes with dynamic class generation.
   * Applies 'mark-mode' and specific 'mark-mode-{number}' classes based on current mode.
   *
   * @returns Space-separated string of CSS classes for mark mode styling
   *
   * @example
   * ```typescript
   * // Mark mode 0 (default): no classes
   * // Mark mode 1: 'mark-mode mark-mode-1'
   * // Mark mode 2: 'mark-mode mark-mode-2'
   * ```
   */
  @HostBinding('class') get cssClasses() {
    const classes = [];
    if (this.markMode > 0) {
      classes.push('mark-mode');
      classes.push(`mark-mode-${this.markMode}`);
    }
    return classes.join(' ');
  }

  /**
   * Current mark mode state for pattern step marking and visual feedback.
   * Updated through MarkModeService integration and BeadCountBottomSheet interaction.
   */
  markMode: number = 0;

  /**
   * Creates an instance of ProjectComponent with comprehensive dependency injection.
   * Initializes all required services for project management, navigation, and state tracking.
   *
   * @param projectService - Service for project data management and persistence
   * @param logger - NGX logger for debugging and performance tracking
   * @param cdr - Change detector for manual change detection triggers
   * @param route - Activated route for URL parameter access and navigation
   * @param router - Router service for programmatic navigation
   * @param settingsService - Settings service for user preferences and configuration
   * @param peyoteShorthandService - Service for pattern parsing and conversion
   * @param zipperService - Service for step processing and row combination
   * @param bottomSheet - Material bottom sheet for mark mode interface
   * @param markModeService - Service for mark mode state management
   * @param store - Reactive state store for centralized state management
   */
  constructor(
    private projectService: ProjectService,
    private logger: NGXLogger,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    public settingsService: SettingsService,
    private peyoteShorthandService: PeyoteShorthandService,
    private zipperService: ZipperService,
    private bottomSheet: MatBottomSheet,
    private markModeService: MarkModeService,
    private store: ReactiveStateStore
  ) {
    // Initialize position$ after store injection is complete
    this.position$ = this.store
      .select(selectCurrentPosition)
      .pipe(map((position) => position ?? { row: 0, step: 0 }));
  }

  /**
   * Initializes component lifecycle with route parameter handling and project loading.
   * Sets up reactive subscriptions for mark mode changes, route-based project loading,
   * and position-based navigation. Handles URL parameter parsing with fallbacks.
   *
   * Initialization Process:
   * 1. Subscribes to mark mode changes for real-time CSS class updates
   * 2. Handles route parameters with fallback to current project ID
   * 3. Sets up project observable with store integration and validation
   * 4. Configures row processing with combine12 setting integration
   * 5. Establishes current step tracking with hierarchical navigation
   *
   * @example
   * ```typescript
   * // Automatic initialization on component creation
   * // Handles routes like: /project/123 or /project (with fallback)
   *
   * // Mark mode subscription updates CSS classes
   * this.markModeService.markModeChanged$.subscribe(mode => {
   *   this.setMarkMode(mode); // Updates this.markMode and triggers cssClasses
   * });
   *
   * // Project loading with validation
   * this.project$ = this.route.paramMap.pipe(
   *   switchMap(id => this.projectService.loadProject(id))
   * );
   * ```
   */
  ngOnInit() {
    // Subscribe to real-time mark mode changes
    this.markModeService.markModeChanged$.subscribe((markMode) => {
      this.setMarkMode(markMode);
      this.cdr.markForCheck(); // Trigger change detection for OnPush
    });

    this.route.paramMap.subscribe((params) => {
      if (params.get('id') === null) {
        const currentId = this.projectService.loadCurrentProjectId();
        this.router.navigate(['project', { id: currentId?.id }]);
      }
    });

    this.project$ = this.route.paramMap.pipe(
      map((params) => {
        let id = parseInt(params.get('id') ?? '');
        if (isNaN(id)) {
          const currentId = this.projectService.loadCurrentProjectId();
          id = currentId?.id ?? 0;
        }
        return id;
      }),
      distinctUntilChanged(), // Prevent duplicate ID processing
      switchMap((id) => {
        // First check if this project is already in the store
        return this.store.select(selectCurrentProject).pipe(
          take(1),
          switchMap((currentProject) => {
            if (
              currentProject &&
              currentProject.id === id &&
              isValidProject(currentProject)
            ) {
              return of(currentProject);
            } else {
              return this.projectService
                .loadProject(id)
                .then((project) => project || ({ rows: [] } as Project));
            }
          })
        );
      }),
      map((project) => {
        if (!project || !isValidProject(project)) {
          this.logger.warn(
            'Invalid or null project loaded, using empty project'
          );
          return { rows: [] } as Project;
        }
        return project;
      })
    );

    this.rows$ = this.store.select(selectZippedRows);

    // Position observable is now handled by the store selector
    // No need to manually subscribe and update zippedRows since store manages state

    // NOTE: Position restoration moved to ngAfterViewInit to ensure ViewChildren are ready
  }

  /**
   * Initializes view children and sets up hierarchical navigation after view initialization.
   * Establishes component tree relationships and configures automatic current step activation.
   *
   * Post-View Initialization:
   * 1. Subscribes to RowComponent children changes for dynamic navigation updates
   * 2. Triggers change detection to ensure proper view rendering
   * 3. Sets up automatic step activation based on current position
   * 4. Handles distinctUntilChanged optimization for step selection
   *
   * @example
   * ```typescript
   * // Automatic view initialization after template rendering
   * // Sets up child component relationships
   *
   * this.children.changes.subscribe(children => {
   *   this.children$.next(children); // Update navigation observable
   *   this.cdr.detectChanges(); // Ensure view consistency
   * });
   *
   * // Note: Step activation is handled by position restoration in ngOnInit
   * // No need for additional onClick triggers here to avoid double activation
   * ```
   */
  ngAfterViewInit() {
    this.children.changes.subscribe((children) => {
      this.children$.next(children);
      this.cdr.detectChanges();
    });

    // Initial population of children$ - this is critical!
    this.children$.next(this.children);

    // NOW set up position restoration after ViewChildren are ready
    this.children$
      .pipe(
        combineLatestWith(this.position$),
        skipWhile(([children, _position]) => {
          return (
            children === null ||
            children === undefined ||
            children.get === undefined
          );
        }),
        map(([children, position]) => {
          const row = children?.get(position.row);
          if (!row) {
            return null;
          }

          // Ensure the row is open
          row.show();

          // Get the step - if children aren't ready yet, this will return null
          // and the filter/skipWhile will handle it
          const step = row.children?.get(position.step);
          if (!step) {
            return null;
          }
          return step;
        }),
        filter((step): step is StepComponent => step !== null),
        skipWhile(
          (step) =>
            step === null || step === undefined || step.index === undefined
        ),
        // Prevent infinite loops by filtering duplicate step objects
        // distinctUntilChanged ensures the same step isn't processed multiple times
        distinctUntilChanged((a, b) => {
          // Allow null -> step transitions
          if (a === null || b === null) {
            return a === b;
          }
          // Compare step identity by position
          return a?.index === b?.index && a?.row?.index === b?.row?.index;
        })
      )
      .subscribe(async (step: StepComponent) => {
        try {
          // Clear previous current step
          const currentStep = await firstValueFrom(this.currentStep$);
          if (currentStep && currentStep !== step) {
            currentStep.isCurrentStep = false;
          }

          // Set new current step
          step.isCurrentStep = true;
          step.row.show();

          // Update observables and persist position
          this.currentStep$.next(step);
          
          // Trigger change detection after state update
          this.cdr.detectChanges();
          
          // Fire-and-forget position save (don't await to avoid blocking)
          this.projectService.saveCurrentPosition(step.row.index, step.index);
        } catch (error) {
          console.warn('Failed to set current step:', error);
        }
      });

    // Note: Position restoration now handled above after ViewChildren are ready
  }

  /**
   * Opens Material bottom sheet for mark mode cycling and bead count display.
   * Integrates current step bead count with mark mode management interface.
   * Handles mark mode state synchronization between bottom sheet and component.
   *
   * Bottom Sheet Integration:
   * 1. Retrieves current step and bead count data
   * 2. Opens BeadCountBottomSheet with current mark mode and bead count
   * 3. Handles result processing and mark mode updates
   * 4. Synchronizes final mark mode state after dismissal
   *
   * @example
   * ```typescript
   * // User interaction triggering bottom sheet
   * <button (click)="openBeadCountBottomSheet()">
   *   Show Bead Count & Mark Mode
   * </button>
   *
   * // Bottom sheet data structure
   * const data = {
   *   markMode: this.markMode,     // Current mark mode (0-3+)
   *   beadCount: beadCount         // Current step bead count
   * };
   *
   * // Mark mode synchronization after dismissal
   * bottomSheetRef.afterDismissed().subscribe(result => {
   *   const finalMarkMode = bottomSheetRef.instance.data.markMode;
   *   if (finalMarkMode !== this.markMode) {
   *     this.setMarkMode(finalMarkMode); // Update component state
   *   }
   * });
   * ```
   */
  openBeadCountBottomSheet() {
    this.currentStep$
      .pipe(
        take(1),
        filter(
          (currentStep): currentStep is StepComponent => currentStep !== null
        ),
        switchMap((currentStep) => currentStep.beadCount$)
      )
      .subscribe((beadCount) => {
        const bottomSheetRef = this.bottomSheet.open(BeadCountBottomSheet, {
          data: {
            markMode: this.markMode,
            beadCount: beadCount,
          },
        });

        bottomSheetRef.afterDismissed().subscribe((result) => {
          // Get the final mark mode from the bottom sheet data
          const finalMarkMode = bottomSheetRef.instance.data.markMode;
          if (finalMarkMode !== this.markMode) {
            this.setMarkMode(finalMarkMode);
            this.cdr.markForCheck();
          }
        });
      });
  }

  /**
   * Updates the mark mode state and triggers CSS class binding updates.
   * Central method for mark mode state management called by MarkModeService
   * and BeadCountBottomSheet interactions.
   *
   * @param mode - The new mark mode number (0 = default, 1-3+ = marking states)
   *
   * @example
   * ```typescript
   * // Called by MarkModeService subscription
   * this.markModeService.markModeChanged$.subscribe(mode => {
   *   this.setMarkMode(mode); // Updates this.markMode
   * });
   *
   * // Triggers CSS class updates through @HostBinding
   * // mode 0: no classes
   * // mode 1: 'mark-mode mark-mode-1'
   * // mode 2: 'mark-mode mark-mode-2'
   *
   * // Used by bottom sheet for mark mode cycling
   * const finalMarkMode = bottomSheetRef.instance.data.markMode;
   * this.setMarkMode(finalMarkMode);
   * ```
   */
  private setMarkMode(mode: number) {
    this.markMode = mode;
  }

  /**
   * Advances to the next row in the pattern sequence.
   * Template method for row-level navigation controls and UI interactions.
   *
   * @example
   * ```typescript
   * // Template usage
   * <button (click)="onAdvanceRow()">Next Row</button>
   *
   * // Programmatic usage
   * this.onAdvanceRow(); // Moves to next row, first step
   * ```
   */
  onAdvanceRow() {
    this.doRowForward();
  }

  /**
   * Advances to the next step with automatic row progression and end-of-pattern handling.
   * Core navigation method that handles step-by-step advancement with intelligent
   * progression logic including automatic row advancement and project reset.
   *
   * Navigation Logic:
   * 1. Attempts to advance to next step in current row
   * 2. If end of row reached, advances to next row automatically
   * 3. If end of project reached, triggers project reset to beginning
   *
   * @example
   * ```typescript
   * // Template usage for step navigation
   * <button (click)="onAdvanceStep()">Next Step</button>
   *
   * // Keyboard navigation integration
   * @HostListener('keydown.ArrowRight')
   * async onRightArrow() {
   *   await this.onAdvanceStep();
   * }
   *
   * // Navigation flow example:
   * // Row 1, Step 5 → Row 1, Step 6 (normal advance)
   * // Row 1, Step 10 (last) → Row 2, Step 1 (row advance)
   * // Row 15, Step 8 (last row) → Row 1, Step 1 (project reset)
   * ```
   */
  async onAdvanceStep() {
    const endOfRow = await this.doStepForward();
    if (endOfRow) {
      const endOfProject = await this.doRowForward();
      if (endOfProject) {
        this.resetProject(true);
      }
    }
  }

  /**
   * Advances through multiple steps with configurable count and automatic boundary handling.
   * Enables bulk navigation through pattern sections with intelligent stopping at row boundaries.
   *
   * Bulk Navigation Logic:
   * 1. Iterates through specified number of steps
   * 2. Stops early if end of row is reached
   * 3. Preserves position state for consistent navigation
   *
   * @param x - Number of steps to advance (1-based count)
   *
   * @example
   * ```typescript
   * // Template usage with settings integration
   * <button (click)="onAdvanceXSteps(5)">Advance 5 Steps</button>
   *
   * // Multi-advance with settings
   * async onAdvanceMultipleSteps() {
   *   const count = await firstValueFrom(this.multiadvance$);
   *   await this.onAdvanceXSteps(count); // Uses user-configured step count
   * }
   *
   * // Boundary handling example:
   * // Row 1, Step 8 + advance 5 steps
   * // → Stops at Row 1, Step 10 (if last step in row)
   * // → Does not automatically advance to next row
   * ```
   */
  async onAdvanceXSteps(x: number) {
    for (let i = 0; i < x; i++) {
      const endOfRow = await this.doStepForward();
      if (endOfRow) {
        break;
      }
    }
  }

  /**
   * Retreats to the previous row in the pattern sequence.
   * Template method for backward row-level navigation controls and UI interactions.
   *
   * @example
   * ```typescript
   * // Template usage
   * <button (click)="onRetreatRow()">Previous Row</button>
   *
   * // Programmatic usage
   * this.onRetreatRow(); // Moves to previous row, first step
   * ```
   */
  onRetreatRow() {
    this.doRowBackward();
  }

  /**
   * Retreats to the previous step with automatic row regression and start-of-pattern handling.
   * Core backward navigation method that handles step-by-step retreat with intelligent
   * regression logic including automatic row retreat and project boundary handling.
   *
   * Navigation Logic:
   * 1. Attempts to retreat to previous step in current row
   * 2. If start of row reached, retreats to previous row automatically
   * 3. If start of project reached, triggers project reset to end
   * 4. Automatically positions to last step of retreated row
   *
   * @example
   * ```typescript
   * // Template usage for step navigation
   * <button (click)="onRetreatStep()">Previous Step</button>
   *
   * // Keyboard navigation integration
   * @HostListener('keydown.ArrowLeft')
   * async onLeftArrow() {
   *   await this.onRetreatStep();
   * }
   *
   * // Navigation flow example:
   * // Row 2, Step 3 → Row 2, Step 2 (normal retreat)
   * // Row 2, Step 1 → Row 1, Step 10 (row retreat + end position)
   * // Row 1, Step 1 → Row 15, Step 8 (project boundary + end position)
   * ```
   */
  async onRetreatStep() {
    const startOfRow = await this.doStepBackward();
    if (startOfRow) {
      const startOfProject = await this.doRowBackward();
      if (startOfProject) {
        this.resetProject(false);
      }
      this.doStepEnd();
    }
  }

  /**
   * Retreats through multiple steps with configurable count and automatic boundary handling.
   * Enables bulk backward navigation through pattern sections with intelligent stopping at row boundaries.
   *
   * Bulk Navigation Logic:
   * 1. Iterates through specified number of steps backward
   * 2. Stops early if start of row is reached
   * 3. Preserves position state for consistent navigation
   *
   * @param x - Number of steps to retreat (1-based count)
   *
   * @example
   * ```typescript
   * // Template usage with settings integration
   * <button (click)="onRetreatXSteps(3)">Retreat 3 Steps</button>
   *
   * // Multi-retreat with settings
   * async onRetreatMultipleSteps() {
   *   const count = await firstValueFrom(this.multiadvance$);
   *   await this.onRetreatXSteps(count); // Uses user-configured step count
   * }
   *
   * // Boundary handling example:
   * // Row 2, Step 5 - retreat 3 steps
   * // → Row 2, Step 2 (normal retreat)
   * // Row 2, Step 2 - retreat 5 steps
   * // → Stops at Row 2, Step 1 (start of row boundary)
   * ```
   */
  async onRetreatXSteps(x: number) {
    for (let i = 0; i < x; i++) {
      const startOfRow = await this.doStepBackward();
      if (startOfRow) {
        break;
      }
    }
  }

  /**
   * Template wrapper method for retreating multiple steps using settings configuration.
   * Combines settings-based step count with bulk retreat functionality for user convenience.
   *
   * @returns Promise that resolves when retreat operation completes
   *
   * @example
   * ```typescript
   * // Template usage with user-configured step count
   * <button (click)="onRetreatMultipleSteps()">
   *   Retreat {{ multiadvance$ | async }} Steps
   * </button>
   *
   * // Uses multiadvance setting (default: 3)
   * // User setting: 5 steps → retreats 5 steps
   * // Stops at row boundaries for safety
   * ```
   */
  async onRetreatMultipleSteps() {
    const x = await firstValueFrom(this.multiadvance$);
    return this.onRetreatXSteps(x);
  }

  /**
   * Template wrapper method for advancing multiple steps using settings configuration.
   * Combines settings-based step count with bulk advance functionality for user convenience.
   *
   * @returns Promise that resolves when advance operation completes
   *
   * @example
   * ```typescript
   * // Template usage with user-configured step count
   * <button (click)="onAdvanceMultipleSteps()">
   *   Advance {{ multiadvance$ | async }} Steps
   * </button>
   *
   * // Uses multiadvance setting (default: 3)
   * // User setting: 5 steps → advances 5 steps
   * // Stops at row boundaries for safety
   * ```
   */
  async onAdvanceMultipleSteps() {
    const x = await firstValueFrom(this.multiadvance$);
    return this.onAdvanceXSteps(x);
  }

  /**
   * Keyboard navigation handler for right arrow key press.   * Provides keyboard-based step advancement with same logic as onAdvanceStep().
   * Includes automatic row progression and end-of-pattern handling.
   *
   * @example
   * ```typescript
   * // Automatic keyboard handling
   * // User presses right arrow → onRightArrow() called
   *
   * // Navigation behavior matches onAdvanceStep():
   * // Row 1, Step 5 → Row 1, Step 6 (normal advance)
   * // Row 1, Step 10 (last) → Row 2, Step 1 (row advance)
   * // Row 15, Step 8 (last row) → Row 1, Step 1 (project reset)
   * ```
   */
  @HostListener('keydown.ArrowRight', ['$event'])
  async onRightArrow() {
    const endOfRow = await this.doStepForward();
    if (endOfRow) {
      const endOfProject = await this.doRowForward();
      if (endOfProject) {
        this.resetProject(true);
      }
    }
  }

  /**
   * Keyboard navigation handler for left arrow key press.
   * Provides keyboard-based step retreat with same logic as onRetreatStep().
   * Includes automatic row regression and start-of-pattern handling.
   *
   * @example
   * ```typescript
   * // Automatic keyboard handling
   * // User presses left arrow → onLeftArrow() called
   *
   * // Navigation behavior matches onRetreatStep():
   * // Row 2, Step 3 → Row 2, Step 2 (normal retreat)
   * // Row 2, Step 1 → Row 1, Step 10 (row retreat + end position)
   * // Row 1, Step 1 → Row 15, Step 8 (project boundary + end position)
   * ```
   */
  @HostListener('keydown.ArrowLeft', ['$event'])
  async onLeftArrow() {
    const startOfRow = await this.doStepBackward();
    if (startOfRow) {
      const startOfProject = await this.doRowBackward();
      if (startOfProject) {
        this.resetProject(false);
      }
      this.doStepEnd();
    }
  }

  /**
   * Keyboard navigation handler for up arrow key press.
   * Provides keyboard-based row retreat for quick vertical navigation.
   *
   * @example
   * ```typescript
   * // Automatic keyboard handling
   * // User presses up arrow → onUpArrow() called
   *
   * // Navigation behavior:
   * // Row 3, Step 5 → Row 2, Step 1 (previous row, first step)
   * // Row 1, Step 8 → stays at Row 1, Step 8 (no previous row)
   * ```
   */
  @HostListener('keydown.ArrowUp', ['$event'])
  onUpArrow() {
    this.doRowBackward();
  }

  /**   * Keyboard navigation handler for down arrow key press.
   * Provides keyboard-based row advancement for quick vertical navigation.
   *
   * @example
   * ```typescript
   * // Automatic keyboard handling
   * // User presses down arrow → onDownArrow() called
   *
   * // Navigation behavior:
   * // Row 2, Step 5 → Row 3, Step 1 (next row, first step)
   * // Row 15, Step 8 (last row) → stays at Row 15, Step 8 (no next row)
   * ```
   */
  @HostListener('keydown.ArrowDown', ['$event'])
  onDownArrow() {
    this.doRowForward();
  }

  async sanityPresumptiveStep() {
    if (sanity) {
      const currentStep = await firstValueFrom(this.currentStep$);
      if (currentStep === null || currentStep === undefined) {
        return;
      }
      const presumptiveStep = currentStep.row.children.get(currentStep.index);
      if (presumptiveStep !== currentStep) {
        throw new Error(
          'Sanity check failed, presumptive step is not current step'
        );
      }
    }
  }
  async sanityPresumptiveRow() {
    if (sanity) {
      const currentStep = await firstValueFrom(this.currentStep$);
      if (currentStep === null || currentStep === undefined) {
        return;
      }
      const presumptiveRow = currentStep.row.project.children.get(
        currentStep.row.index
      );
      if (presumptiveRow !== currentStep.row) {
        throw new Error(
          'Sanity check failed, presumptive row is not current row'
        );
      }
    }
  }

  async doStepForward(): Promise<boolean> {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return true;
    }
    this.sanityPresumptiveStep();
    const nextStep = currentStep.row.children.get(currentStep.index + 1);
    if (nextStep === null || nextStep === undefined) {
      return true;
    }
    currentStep.isCurrentStep = false;
    nextStep.isCurrentStep = true;
    nextStep.row.show();
    this.projectService.saveCurrentPosition(nextStep.row.index, nextStep.index);
    this.currentStep$.next(nextStep);
    return false;
  }
  async doStepBackward(): Promise<boolean> {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return true;
    }
    this.sanityPresumptiveStep();
    const prevStep = currentStep.row.children.get(currentStep.index - 1);
    if (prevStep === null || prevStep === undefined) {
      return true;
    }
    currentStep.isCurrentStep = false;
    prevStep.isCurrentStep = true;
    prevStep.row.show();
    this.projectService.saveCurrentPosition(prevStep.row.index, prevStep.index);
    this.currentStep$.next(prevStep);
    return false;
  }
  async doStepEnd() {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return;
    }
    const lastStep = currentStep.row.children.last;
    lastStep.isCurrentStep = true;
    this.projectService.saveCurrentPosition(lastStep.row.index, lastStep.index);
    this.currentStep$.next(lastStep);
  }
  async doRowForward(): Promise<boolean> {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return true;
    }
    currentStep.isCurrentStep = false;
    currentStep.row.hide();
    const nextParent = currentStep.row.project.children.get(
      currentStep.row.index + 1
    );
    if (nextParent === null || nextParent === undefined) {
      return true;
    }
    nextParent.show();
    nextParent.children.first.onClick(new Event('click'));
    //this.projectService.saveCurrentPosition(nextParent.index, 0);
    //this.currentStep$.next(nextParent.children.first);
    return false;
  }
  async doRowBackward(): Promise<boolean> {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return true;
    }
    currentStep.isCurrentStep = false;
    currentStep.row.hide();
    const prevParent = currentStep.row.project.children.get(
      currentStep.row.index - 1
    );
    if (prevParent === null || prevParent === undefined) {
      return true;
    }
    prevParent.show();
    await prevParent.children.first.onClick(new Event('click'));
    //this.projectService.saveCurrentPosition(prevParent.index, 0);
    //this.currentStep$.next(prevParent.children.first);
    return false;
  }

  resetProject(_forward: boolean) {}

  /**
   * Error boundary retry handler that recovers from component errors.
   *
   * This method is called by the error boundary component when the user clicks
   * the retry button after an error occurs. It provides a clean recovery mechanism
   * by reinitializing the component state and reloading project data.
   *
   * @public
   * @returns {void}
   *
   * @example
   * ```html
   * <!-- Template usage with error boundary -->
   * <app-error-boundary (retry)="onRetry()">
   *   <div class="project-content">
   *     <!-- Project content that might error -->
   *   </div>
   * </app-error-boundary>
   * ```
   *
   * @example
   * ```typescript
   * // Error boundary integration
   * export class ProjectComponent {
   *   onRetry(): void {
   *     // Automatically reinitializes component state
   *     // Reloads project data from route parameters
   *     // Resets navigation hierarchy position
   *   }
   * }
   * ```
   *
   * The retry mechanism provides:
   * - Complete component state reset via ngOnInit()
   * - Route parameter re-evaluation for project loading
   * - Navigation hierarchy position restoration
   * - Reactive state stream re-subscription
   *
   * @see {@link ngOnInit} For the initialization logic being called
   * @see {@link HierarchicalList} For navigation state that gets restored
   * @since 1.0.0
   */
  onRetry(): void {
    // Simple retry that calls ngOnInit to refresh the component state
    this.ngOnInit();
  }
}
function deepCopy(value: any): any {
  return JSON.parse(JSON.stringify(value));
}

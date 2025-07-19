import {
  Component,
  HostListener,
  Input,
  OnInit,
  QueryList,
} from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { NGXLogger } from 'ngx-logger';
import { Observable, combineLatest, firstValueFrom, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { Step } from '../../../../core/models/step';
import { FlamService, SettingsService, MarkModeService } from '../../../../core/services';
import { HierarchicalList } from '../../../../shared/utils/hierarchical-list';
import { ZipperService } from '../../../file-import/services';
import { ProjectService } from '../../../project-management/services';
import { RowComponent } from '../row/row.component';

/**
 * StepComponent - Interactive Pattern Step with Marking and Visual Feedback
 *
 * A sophisticated Angular component that renders individual pattern steps with
 * advanced marking capabilities, visual feedback, and intelligent state management.
 * Provides the core interaction mechanism for pattern tracking, including step
 * selection, mark mode cycling, and dynamic visual indicators for pattern analysis.
 *
 * @example
 * ```html
 * <!-- Basic step usage in row display -->
 * <app-step
 *   [step]="patternStep"
 *   [index]="stepIndex"
 *   [row]="rowComponent">
 * </app-step>
 * ```
 *
 * @example
 * ```typescript
 * // Component integration with marking system
 * export class PatternTrackingComponent {
 *   onStepInteraction(stepComponent: StepComponent): void {
 *     // Check step state
 *     if (stepComponent.isCurrentStep) {
 *       console.log('Current step selected');
 *     }
 *
 *     // Access marking state
 *     if (stepComponent.marked > 0) {
 *       console.log(`Step marked with mode: ${stepComponent.marked}`);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Advanced FLAM integration for pattern analysis
 * export class PatternAnalysisComponent {
 *   analyzeStep(step: StepComponent): void {
 *     // Check FLAM markers
 *     if (step.isFirstStep) {
 *       console.log('First appearance of this pattern');
 *     }
 *
 *     if (step.isLastStep) {
 *       console.log('Last appearance of this pattern');
 *     }
 *
 *     // Access bead count
 *     step.beadCount$.subscribe(count => {
 *       console.log(`Cumulative beads: ${count}`);
 *     });
 *   }
 * }
 * ```
 *
 * Key capabilities include:
 * - Interactive step selection with current state management
 * - Mark mode cycling (1-6) for pattern tracking and progress indication
 * - FLAM (First/Last Appearance Map) integration with visual markers
 * - Dynamic CSS class binding for rich visual feedback
 * - Cumulative bead count calculation with reactive updates
 * - Zoom level integration for enhanced visibility
 * - Settings-based feature toggling (FLAM markers, zoom)
 * - Hierarchical navigation support for keyboard and programmatic access
 *
 * The component serves as the atomic unit of pattern interaction, providing
 * the foundation for complex pattern tracking workflows while maintaining
 * optimal performance through reactive programming patterns.
 *
 * @see {@link HierarchicalList} For navigation interface implementation
 * @see {@link RowComponent} For parent row component coordination
 * @see {@link FlamService} For First/Last Appearance Map integration
 * @since 1.0.0
 */
@Component({
  /**
   * Material Design chip selector for step representation.
   *
   * @selector app-step
   * @imports MatChipsModule for Material Design chip styling
   * @template ./step.component.html
   * @styles ./step.component.scss
   *
   * @hostBindings Dynamic CSS class binding system for rich visual feedback:
   * - `[class.current]`: Applied when `isCurrentStep` is true for active step highlighting
   * - `[class.first]`: Applied when `isFirstStep` is true for FLAM first appearance marker
   * - `[class.last]`: Applied when `isLastStep` is true for FLAM last appearance marker
   * - `[class.zoom]`: Applied when `isZoomed` is true for enhanced visibility
   * - `[class.marked-1]` through `[class.marked-6]`: Applied based on mark mode value for progress tracking
   *
   * The host binding system provides automatic CSS class application based on
   * component state, enabling rich visual feedback without template complexity.
   * Mark mode classes (marked-1 through marked-6) correspond to different
   * tracking states for pattern progress indication.
   */
  selector: 'app-step',
  imports: [MatChipsModule],
  templateUrl: './step.component.html',
  styleUrl: './step.component.scss',
  host: {
    '[class.current]': 'isCurrentStep',
    '[class.first]': 'isFirstStep',
    '[class.last]': 'isLastStep',
    '[class.zoom]': 'isZoomed',
    '[class.marked-1]': 'marked === 1',
    '[class.marked-2]': 'marked === 2',
    '[class.marked-3]': 'marked === 3',
    '[class.marked-4]': 'marked === 4',
    '[class.marked-5]': 'marked === 5',
    '[class.marked-6]': 'marked === 6',
  },
})
export class StepComponent implements HierarchicalList, OnInit {
  /**
   * The step data model containing pattern instruction and bead count information.
   *
   * @type {Step}
   *
   * Primary data binding for the component, providing:
   * - Step identification and pattern description
   * - Bead count information for calculation
   * - Pattern instruction text and formatting
   *
   * @example
   * ```html
   * <app-step [step]="patternStep"></app-step>
   * ```
   */
  @Input() step!: Step;

  /**
   * Visual highlighting state for temporary emphasis.
   *
   * @property
   * @type {boolean}
   * @default false
   *
   * Controls temporary visual highlighting for search results,
   * navigation feedback, or other transient emphasis needs.
   * Separate from current step marking for flexible UI control.
   */
  highlighted: boolean = false;

  /**
   * Current step state indicating active position in pattern tracking.
   *
   * @property
   * @type {boolean}
   * @default false
   *
   * Indicates whether this step is the currently active step in the
   * pattern tracking workflow. Can be set externally via onClick events
   * or programmatically for navigation coordination. Triggers 'current'
   * CSS class binding for visual feedback.
   */
  isCurrentStep = false; // Can be set externally (via onClick)

  /**
   * Mark mode state for pattern progress tracking (0-6).
   *
   * @property
   * @type {number}
   * @default 0
   *
   * Represents the current mark mode applied to this step:
   * - 0: Unmarked (default state)
   * - 1-6: Various mark modes for different tracking purposes
   *
   * Can be set externally via onClick events in mark mode or programmatically
   * for batch marking operations. Triggers corresponding 'marked-X' CSS class
   * binding for visual representation.
   *
   * @example
   * ```typescript
   * // Mark step with mode 3
   * stepComponent.marked = 3;
   * // Results in 'marked-3' CSS class being applied
   * ```
   */
  marked: number = 0; // Can be set externally (via onClick in mark mode)

  /**
   * Private backing field for zoom state management.
   *
   * @private
   * @type {boolean}
   * @default false
   *
   * Internal storage for zoom state, managed by reactive observables
   * and exposed through the isZoomed getter for host class binding.
   */
  private _isZoomed = false;

  /**
   * Private backing field for FLAM first appearance state.
   *
   * @private
   * @type {boolean}
   * @default false
   *
   * Internal storage for first appearance state from FLAM analysis,
   * managed by reactive observables and exposed through the
   * isFirstStep getter for host class binding.
   */
  private _isFirstStep = false;

  /**
   * Private backing field for FLAM last appearance state.
   *
   * @private
   * @type {boolean}
   * @default false
   *
   * Internal storage for last appearance state from FLAM analysis,
   * managed by reactive observables and exposed through the
   * isLastStep getter for host class binding.
   */
  private _isLastStep = false;

  /**
   * Read-only getter for zoom state with reactive updates from settings.
   *
   * @readonly
   * @type {boolean}
   * @returns {boolean} Current zoom state based on user settings
   *
   * Provides controlled access to the zoom state managed by reactive
   * observables. The zoom state is determined by user settings and
   * automatically triggers CSS class binding for enhanced step visibility.
   *
   * The getter pattern ensures that zoom state can only be modified
   * through the reactive settings system, maintaining data consistency
   * and preventing unauthorized direct manipulation.
   *
   * @example
   * ```typescript
   * // Check zoom state
   * if (stepComponent.isZoomed) {
   *   console.log('Step is in zoom mode');
   * }
   * ```
   *
   * @see {@link SettingsService.zoom$} For zoom state observable
   */
  get isZoomed(): boolean {
    return this._isZoomed;
  }

  /**
   * Read-only getter for FLAM first appearance state with reactive updates.
   *
   * @readonly
   * @type {boolean}
   * @returns {boolean} True if this is the first appearance of the pattern in FLAM analysis
   *
   * Provides controlled access to the first appearance state determined by
   * FLAM (First/Last Appearance Map) analysis. This state is reactively
   * computed based on pattern analysis and user settings for FLAM markers.
   *
   * When true, indicates this step represents the first occurrence of its
   * pattern description in the entire project, enabling visual marking
   * for pattern analysis and optimization workflows.
   *
   * @example
   * ```typescript
   * // Check for first appearance
   * if (stepComponent.isFirstStep) {
   *   console.log('First occurrence of this pattern');
   * }
   * ```
   *
   * @see {@link FlamService.isFirstStep} For FLAM analysis logic
   * @see {@link SettingsService.flammarkers$} For FLAM marker settings
   */
  get isFirstStep(): boolean {
    return this._isFirstStep;
  }

  /**
   * Read-only getter for FLAM last appearance state with reactive updates.
   *
   * @readonly
   * @type {boolean}
   * @returns {boolean} True if this is the last appearance of the pattern in FLAM analysis
   *
   * Provides controlled access to the last appearance state determined by
   * FLAM (First/Last Appearance Map) analysis. This state is reactively
   * computed based on pattern analysis and user settings for FLAM markers.
   *
   * When true, indicates this step represents the final occurrence of its
   * pattern description in the entire project, enabling visual marking
   * for pattern completion tracking and analysis workflows.
   *
   * @example
   * ```typescript
   * // Check for last appearance
   * if (stepComponent.isLastStep) {
   *   console.log('Final occurrence of this pattern');
   * }
   * ```
   *
   * @see {@link FlamService.isLastStep} For FLAM analysis logic
   * @see {@link SettingsService.flammarkers$} For FLAM marker settings
   */
  get isLastStep(): boolean {
    return this._isLastStep;
  }

  /**
   * Zero-based index position of this step within the row sequence.
   *
   * @type {number}
   * @default 0
   *
   * Used for hierarchical navigation, bead count calculations, and
   * relative step operations. Essential for implementing prev/next
   * navigation and cumulative bead count computation.
   *
   * @example
   * ```html
   * <app-step [index]="stepIndex"></app-step>
   * ```
   */
  @Input() index: number = 0;

  /**
   * Reference to the parent RowComponent for coordination and navigation.
   *
   * @type {RowComponent}
   *
   * Provides access to row-level context including project reference,
   * mark mode state, and navigation coordination. Enables step-to-row
   * and step-to-project communication for integrated functionality.
   *
   * @example
   * ```html
   * <app-step [row]="rowComponent"></app-step>
   * ```
   */
  @Input() row!: RowComponent;

  /**
   * Reference to the parent component in the hierarchical navigation structure.
   *
   * @property
   * @type {HierarchicalList}
   *
   * Part of the HierarchicalList interface implementation, providing
   * upward navigation capabilities within the pattern hierarchy.
   */
  parent!: HierarchicalList;

  /**
   * Reference to the previous step in the navigation sequence.
   *
   * @property
   * @type {HierarchicalList | null}
   *
   * Enables backward navigation through the step sequence. Null if
   * this is the first step in the row.
   */
  prev!: HierarchicalList | null;

  /**
   * Reference to the next step in the navigation sequence.
   *
   * @property
   * @type {HierarchicalList | null}
   *
   * Enables forward navigation through the step sequence. Null if
   * this is the last step in the row.
   */
  next!: HierarchicalList | null;

  /**
   * Empty QueryList for HierarchicalList interface compliance.
   *
   * @property
   * @type {QueryList<HierarchicalList>}
   *
   * Steps are leaf nodes in the hierarchical structure, so children
   * is always empty. Required for HierarchicalList interface compliance.
   */
  children: QueryList<HierarchicalList> = new QueryList<HierarchicalList>();

  /**
   * Observable stream for cumulative bead count calculation with reactive updates.
   *
   * @property
   * @type {Observable<number>}
   * @default of(0)
   *
   * Provides reactive access to the cumulative bead count from the beginning
   * of the row up to and including this step. Automatically updates when
   * zipped rows change, enabling real-time bead count tracking for pattern
   * progress and material estimation.
   *
   * The calculation iterates through all steps from index 0 to the current
   * step index, summing their individual bead counts for a running total.
   *
   * @example
   * ```typescript
   * // Subscribe to bead count updates
   * stepComponent.beadCount$.subscribe(count => {
   *   console.log(`Total beads to this step: ${count}`);
   * });
   * ```
   *
   * @see {@link ProjectService.zippedRows$} For row data source
   * @see {@link ZipperService} For step processing utilities
   */
  beadCount$: Observable<number> = of(0);

  /**
   * Constructs StepComponent with comprehensive services for step management and pattern analysis.
   *
   * @param {FlamService} flamService - First/Last Appearance Map analysis for pattern markers
   * @param {SettingsService} settingsService - User preferences for FLAM markers and zoom state
   * @param {ProjectService} projectService - Project-level data access for bead count calculations
   * @param {NGXLogger} logger - Structured logging for debugging and monitoring
   * @param {ZipperService} zipperService - Step processing utilities for data transformation
   * @param {MarkModeService} markModeService - Service for managing step markings and mark mode state
   *
   * Initializes the step component with dependency injection for:
   * - FLAM service for analyzing first/last appearance markers in pattern analysis
   * - Settings service for reactive updates to zoom and FLAM marker preferences
   * - Project service for accessing zipped rows data for bead count calculations
   * - Logger service for debugging step interactions and state changes
   * - Zipper service for step expansion and processing utilities
   * - Mark mode service for persistent step marking management
   *
   * The constructor establishes the foundation for reactive property management,
   * pattern analysis integration, and user preference synchronization.
   *
   * @example
   * ```typescript
   * // Component instantiation through Angular DI
   * // StepComponent automatically receives injected dependencies
   * constructor(
   *   private flamService: FlamService,
   *   private settingsService: SettingsService,
   *   private projectService: ProjectService,
   *   private logger: NGXLogger,
   *   private zipperService: ZipperService,
   *   private markModeService: MarkModeService
   * ) {
   *   // Initialization handled by Angular framework
   * }
   * ```
   *
   * @since 1.0.0
   */
  constructor(
    private flamService: FlamService,
    private settingsService: SettingsService,
    private projectService: ProjectService,
    private logger: NGXLogger,
    private zipperService: ZipperService,
    private markModeService: MarkModeService
  ) {}

  /**
   * Initializes reactive property subscriptions and bead count calculation.
   *
   * @returns {void}
   *
   * Sets up comprehensive reactive data streams for step state management:
   *
   * 1. **Combined Settings and FLAM Subscription**: Monitors settings for FLAM
   *    markers, zoom level, and FLAM analysis results to update visual state
   * 2. **Bead Count Observable**: Creates reactive stream for cumulative bead
   *    count calculation based on project data
   * 3. **Step Mark Observable**: Reactive monitoring of step marking state changes
   *
   * The method uses combineLatest to efficiently manage multiple observable
   * sources, ensuring consistent state updates when any dependency changes.
   * FLAM markers are conditionally applied based on user settings, providing
   * performance optimization when markers are disabled.
   *
   * @example
   * ```typescript
   * // Automatic setup when component initializes
   * ngOnInit() {
   *   // Multi-stream reactive setup
   *   combineLatest([
   *     this.settingsService.flammarkers$,
   *     this.settingsService.zoom$,
   *     this.flamService.isFirstStep(this.row.index, this.step),
   *     this.flamService.isLastStep(this.row.index, this.step),
   *   ]).subscribe(([flammarkers, zoom, isFirstStep, isLastStep]) => {
   *     // Update visual state based on combined inputs
   *   });
   * }
   * ```
   *
   * @see {@link FlamService.isFirstStep} For first appearance analysis
   * @see {@link FlamService.isLastStep} For last appearance analysis
   * @see {@link SettingsService.flammarkers$} For FLAM marker settings
   * @see {@link SettingsService.zoom$} For zoom level settings
   * @see {@link ProjectService.zippedRows$} For bead count data source
   * @see {@link MarkModeService.getStepMark$} For reactive step marking
   * @since 1.0.0
   */
  ngOnInit() {
    combineLatest([
      this.settingsService.flammarkers$,
      this.settingsService.zoom$,
      this.flamService.isFirstStep(this.row.index, this.step),
      this.flamService.isLastStep(this.row.index, this.step),
    ]).subscribe(([flammarkers, zoom, isFirstStep, isLastStep]) => {
      if (flammarkers) {
        this._isFirstStep = isFirstStep;
        this._isLastStep = isLastStep;
      } else {
        this._isFirstStep = false;
        this._isLastStep = false;
      }
      this._isZoomed = zoom;
    });

    // Set up reactive step marking that updates when project marked steps change
    this.markModeService.getStepMark$(this.row.index, this.index).subscribe(markMode => {
      this.marked = markMode;
    });

    this.beadCount$ = this.projectService.zippedRows$.pipe(
      map((rows) => rows[this.row.index]),
      map((row) => {
        let beadCount = 0;
        //const expandedSteps = this.zipperService.expandSteps(row.steps);
        for (let i = 0; i <= this.index; i++) {
          beadCount += row.steps[i].count;
        }
        return beadCount;
      })
    );
  }

  /**
   * Handles step click events with intelligent mark mode and selection logic.
   *
   * @param {any} _e - Click event object (parameter unused but required for signature)
   * @returns {Promise<void>}
   *
   * Implements sophisticated click handling with dual behavior modes:
   *
   * **Mark Mode Behavior**: When the project is in mark mode, toggles the
   * marking state between unmarked (0) and the current mark mode value.
   * Uses MarkModeService for persistent step marking that survives sessions.
   * All toggle logic and validation is handled by the service layer.
   *
   * **Selection Mode Behavior**: When not in mark mode, performs current
   * step selection with coordinated state management:
   * 1. Clears the previous current step's state
   * 2. Sets this step as the new current step
   * 3. Persists the position to project storage
   * 4. Updates the project's current step observable
   *
   * The method delegates all business logic to appropriate services,
   * maintaining clean separation of concerns between UI and business logic.
   * Component state updates automatically via reactive subscriptions.
   *
   * @example
   * ```typescript
   * // User clicks step - behavior determined by service state
   * async onClick(event): Promise<void> {
   *   if (this.markModeService.canMarkSteps()) {
   *     // Service handles all toggle logic and persistence
   *     await this.markModeService.toggleStepMark(this.row.index, this.index);
   *     // Component state updates automatically via reactive subscription
   *   } else {
   *     // Handle navigation mode
   *     await this.selectAsCurrentStep();
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Mark mode interaction flow with service delegation
   * // Component just calls service - all logic centralized
   * onClick() // → Service toggles step, component reacts to state change
   * onClick() // → Service toggles step, component reacts to state change
   * ```
   *
   * @see {@link ProjectService.saveCurrentPosition} For position persistence
   * @see {@link MarkModeService.toggleStepMark} For step marking toggle logic
   * @see {@link MarkModeService.canMarkSteps} For marking mode validation
   * @since 1.0.0
   */
  @HostListener('click', ['$event'])
  async onClick(_e: any) {
    // Use service method to check if marking is enabled
    if (this.markModeService.canMarkSteps()) {
      // Delegate toggle logic to service - no business logic in component
      await this.markModeService.toggleStepMark(this.row.index, this.index);
      
      // Note: Component state (this.marked) automatically updates via reactive subscription
      // No manual state synchronization needed
      
      return;
    }
    
    // Handle navigation mode (when not in mark mode)
    const currentStep = await firstValueFrom(this.row.project.currentStep$);
    if (currentStep) {
      currentStep.isCurrentStep = false;
    }
    this.isCurrentStep = true;
    this.projectService.saveCurrentPosition(this.row.index, this.index);
    this.row.project.currentStep$.next(this);
  }
}

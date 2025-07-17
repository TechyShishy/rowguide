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
import { FlamService, SettingsService } from '../../../../core/services';
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
 * @component
 * @implements {HierarchicalList} Provides hierarchical navigation capabilities
 * @implements {OnInit} Handles reactive property initialization and observables setup
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
 * @description
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
 * @see {@link MarkModeService} For mark mode state management
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
   * @description
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
   * @input
   * @required
   * @type {Step}
   * 
   * @description
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
   * @description
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
   * @description
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
   * @range 0-6
   * 
   * @description
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
   * @description
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
   * @description
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
   * @description
   * Internal storage for last appearance state from FLAM analysis,
   * managed by reactive observables and exposed through the 
   * isLastStep getter for host class binding.
   */
  private _isLastStep = false;

  /**
   * Read-only getter for zoom state with reactive updates from settings.
   * 
   * @getter
   * @readonly
   * @type {boolean}
   * @returns {boolean} Current zoom state based on user settings
   * 
   * @description
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
   * @see {@link _isZoomed} For private backing field
   */
  get isZoomed(): boolean {
    return this._isZoomed;
  }
  
  /**
   * Read-only getter for FLAM first appearance state with reactive updates.
   * 
   * @getter
   * @readonly
   * @type {boolean}
   * @returns {boolean} True if this is the first appearance of the pattern in FLAM analysis
   * 
   * @description
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
   * @getter
   * @readonly
   * @type {boolean}
   * @returns {boolean} True if this is the last appearance of the pattern in FLAM analysis
   * 
   * @description
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
   * @input
   * @type {number}
   * @default 0
   * 
   * @description
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
   * @input
   * @required
   * @type {RowComponent}
   * 
   * @description
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
   * @implements {HierarchicalList.parent}
   * 
   * @description
   * Part of the HierarchicalList interface implementation, providing
   * upward navigation capabilities within the pattern hierarchy.
   */
  parent!: HierarchicalList;
  
  /**
   * Reference to the previous step in the navigation sequence.
   * 
   * @property
   * @type {HierarchicalList | null}
   * @implements {HierarchicalList.prev}
   * 
   * @description
   * Enables backward navigation through the step sequence. Null if
   * this is the first step in the row.
   */
  prev!: HierarchicalList | null;
  
  /**
   * Reference to the next step in the navigation sequence.
   * 
   * @property
   * @type {HierarchicalList | null}
   * @implements {HierarchicalList.next}
   * 
   * @description
   * Enables forward navigation through the step sequence. Null if
   * this is the last step in the row.
   */
  next!: HierarchicalList | null;
  
  /**
   * Empty QueryList for HierarchicalList interface compliance.
   * 
   * @property
   * @type {QueryList<HierarchicalList>}
   * @implements {HierarchicalList.children}
   * 
   * @description
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
   * @description
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
   * @constructor
   * @param {FlamService} flamService - First/Last Appearance Map analysis for pattern markers
   * @param {SettingsService} settingsService - User preferences for FLAM markers and zoom state
   * @param {ProjectService} projectService - Project-level data access for bead count calculations
   * @param {NGXLogger} logger - Structured logging for debugging and monitoring
   * @param {ZipperService} zipperService - Step processing utilities for data transformation
   * 
   * @description
   * Initializes the step component with dependency injection for:
   * - FLAM service for analyzing first/last appearance markers in pattern analysis
   * - Settings service for reactive updates to zoom and FLAM marker preferences
   * - Project service for accessing zipped rows data for bead count calculations
   * - Logger service for debugging step interactions and state changes
   * - Zipper service for step expansion and processing utilities
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
   *   private zipperService: ZipperService
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
    private zipperService: ZipperService
  ) {}

  /**
   * Initializes reactive property subscriptions and bead count calculation.
   * 
   * @lifecycle
   * @implements {OnInit.ngOnInit}
   * @returns {void}
   * 
   * @description
   * Sets up comprehensive reactive data streams for step state management:
   * 
   * 1. **Combined Settings and FLAM Subscription**: Monitors settings for FLAM
   *    markers, zoom level, and FLAM analysis results to update visual state
   * 2. **Bead Count Observable**: Creates reactive stream for cumulative bead
   *    count calculation based on project data
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

    /*if (this.settingsService.flammarkers$.value) {
      this.isFirstStep = this.flamService.isFirstStep(
        this.row.index,
        this.step
      );
      this.isLastStep = this.flamService.isLastStep(this.row.index, this.step);
    } else {
      this.isFirstStep = false;
      this.isLastStep = false;
    }

    this.settingsService.zoom$.subscribe((value) => {
      this.isZoomed = value;
    });
    this.isZoomed = this.settingsService.zoom$.value;*/

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
   * @hostListener click
   * @async
   * @param {any} _e - Click event object (parameter unused but required for signature)
   * @returns {Promise<void>}
   * 
   * @description
   * Implements sophisticated click handling with dual behavior modes:
   * 
   * **Mark Mode Behavior**: When the project is in mark mode, toggles the
   * marking state between unmarked (0) and the current mark mode value.
   * Provides intuitive toggle behavior for pattern progress tracking.
   * 
   * **Selection Mode Behavior**: When not in mark mode, performs current
   * step selection with coordinated state management:
   * 1. Clears the previous current step's state
   * 2. Sets this step as the new current step
   * 3. Persists the position to project storage
   * 4. Updates the project's current step observable
   * 
   * The method uses async/await pattern for safe observable value access
   * and ensures proper state transitions between different steps.
   * 
   * @example
   * ```typescript
   * // Automatic click handling via @HostListener
   * // User clicks step in mark mode
   * async onClick(event): Promise<void> {
   *   if (this.row.project.markMode) {
   *     // Toggle marking: 0 ↔ current mark mode
   *     this.marked = this.marked === markMode ? 0 : markMode;
   *   } else {
   *     // Set as current step with state coordination
   *     await this.selectAsCurrentStep();
   *   }
   * }
   * ```
   * 
   * @example
   * ```typescript
   * // Mark mode interaction flow
   * // If step is unmarked (marked = 0) and mark mode = 3:
   * onClick() // → marked becomes 3
   * onClick() // → marked becomes 0 (toggle off)
   * onClick() // → marked becomes 3 (toggle on)
   * ```
   * 
   * @requires row.project to be initialized for mark mode and current step access
   * @see {@link ProjectComponent.markMode} For mark mode state
   * @see {@link ProjectComponent.currentStep$} For current step observable
   * @see {@link ProjectService.saveCurrentPosition} For position persistence
   * @since 1.0.0
   */
  @HostListener('click', ['$event'])
  async onClick(_e: any) {
    if (this.row.project.markMode) {
      if (this.marked === this.row.project.markMode) {
        this.marked = 0;
      } else {
        this.marked = this.row.project.markMode;
      }
      return;
    }
    const currentStep = await firstValueFrom(this.row.project.currentStep$);
    if (currentStep) {
      currentStep.isCurrentStep = false;
    }
    this.isCurrentStep = true;
    this.projectService.saveCurrentPosition(this.row.index, this.index);
    this.row.project.currentStep$.next(this);
  }
}

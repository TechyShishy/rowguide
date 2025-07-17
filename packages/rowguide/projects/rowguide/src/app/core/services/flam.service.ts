import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { ProjectDbService } from '../../data/services';
import { ProjectService } from '../../features/project-management/services';
import { FLAM } from '../models/flam';
import { Row } from '../models/row';
import { Step } from '../models/step';
import { SettingsService } from './settings.service';
import { ReactiveStateStore } from '../store/reactive-state-store';
import { ProjectActions } from '../store/actions/project-actions';
import { selectCurrentProject } from '../store/selectors/project-selectors';

/**
 * Service for generating and managing FLAM (First/Last Appearance Map) data structures.
 * Provides pattern analysis capabilities by tracking where each unique step description
 * first appears and last appears within a pattern, along with total occurrence counts.
 *
 * FLAM is essential for:
 * - Pattern visualization and analysis
 * - Color mapping for visual representation
 * - Step navigation and highlighting
 * - Pattern complexity analysis
 * - Bead count calculations
 *
 * Features:
 * - Automatic FLAM generation from pattern rows
 * - Reactive FLAM updates when patterns change
 * - Color mapping persistence and restoration
 * - First/last appearance detection for UI highlighting
 * - Integration with project data storage
 *
 * @example
 * ```typescript
 * // Basic usage
 * constructor(private flamService: FlamService) {}
 *
 * // Subscribe to FLAM updates
 * this.flamService.flam$.subscribe(flam => {
 *   this.displayFlamAnalysis(flam);
 * });
 *
 * // Check if step is first appearance
 * this.flamService.isFirstStep(rowIndex, step).subscribe(isFirst => {
 *   if (isFirst) {
 *     this.highlightFirstAppearance(step);
 *   }
 * });
 *
 * // Save color mappings
 * await this.flamService.saveColorMappingsToProject();
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class FlamService {
  /**
   * Reactive observable containing the current First/Last Appearance Map.
   * Automatically updates when pattern data changes. Each key represents a unique
   * step description with tracking data for appearances and counts.
   *
   * @example
   * ```typescript
   * // Subscribe to FLAM changes
   * this.flamService.flam$.subscribe(flam => {
   *   Object.keys(flam).forEach(stepDescription => {
   *     const data = flam[stepDescription];
   *     console.log(`${stepDescription}: appears ${data.count} times`);
   *     console.log(`First at: row ${data.firstAppearance[0]}, step ${data.firstAppearance[1]}`);
   *   });
   * });
   * ```
   */
  flam$: BehaviorSubject<FLAM> = new BehaviorSubject<FLAM>({});

  /**
   * Creates an instance of FlamService and sets up automatic FLAM generation.
   * Subscribes to project changes to regenerate FLAM when pattern data updates.
   *
   * @param logger - NGX logger for debugging and performance tracking
   * @param projectService - Service providing pattern row data
   * @param projectDbService - Database service for project persistence
   * @param settingsService - Settings service for configuration access
   * @param store - Reactive state store for project data access
   */
  constructor(
    private logger: NGXLogger,
    private projectService: ProjectService,
    private projectDbService: ProjectDbService,
    private settingsService: SettingsService,
    private store: ReactiveStateStore
  ) {
    this.projectService.zippedRows$
      .pipe(
        filter((rows) => rows.length !== 0),
        map((rows) => this.generateFLAM(rows))
      )
      .subscribe((flam) => {
        this.flam$.next(flam);
        // Load any saved color mappings after generating FLAM
        this.loadColorMappingsFromProject();
      });
  }

  /*inititalizeFLAM(force: boolean = false) {
    if (force == false && Object.keys(this.flam$.value).length != 0) return;
    if (
      force == false &&
      Object.keys(
        this.projectService.project$.value.firstLastAppearanceMap ?? {}
      ).length > 0
    ) {
      this.logger.trace(
        'Using cached FLAM:',
        this.projectService.project$.value.firstLastAppearanceMap
      );
      this.flam$.next(
        this.projectService.project$.value.firstLastAppearanceMap ?? {}
      );
    } else {
      this.projectService.zippedRows$
        .pipe(
          filter((rows) => rows.length !== 0),
          take(1)
        )
        .subscribe((rows) => {
          this.logger.debug('Generating FLAM1');
          this.flam$.next(this.generateFLAM(rows));
        });
    }
  }*/

  /**
   * Generates a First/Last Appearance Map from an array of pattern rows.
   * Analyzes each step to determine first appearance, last appearance, and total count.
   * Core algorithm for pattern analysis and visualization support.
   *
   * Algorithm:
   * 1. Iterates through all rows and steps in sequence
   * 2. For each unique step description, records first occurrence coordinates
   * 3. Updates last occurrence coordinates and cumulative count
   * 4. Returns complete FLAM data structure for analysis
   *
   * @param rows - Array of pattern rows containing step sequences
   * @returns FLAM object mapping step descriptions to appearance data
   *
   * @example
   * ```typescript
   * // Generate FLAM from pattern data
   * const rows = [
   *   { steps: [{ description: 'A', count: 2 }, { description: 'B', count: 1 }] },
   *   { steps: [{ description: 'B', count: 3 }, { description: 'C', count: 1 }] }
   * ];
   *
   * const flam = this.flamService.generateFLAM(rows);
   * // Result:
   * // {
   * //   'A': { firstAppearance: [0, 0], lastAppearance: [0, 0], count: 2 },
   * //   'B': { firstAppearance: [0, 1], lastAppearance: [1, 0], count: 4 },
   * //   'C': { firstAppearance: [1, 1], lastAppearance: [1, 1], count: 1 }
   * // }
   * ```
   */
  generateFLAM(rows: Row[]): FLAM {
    let flam: FLAM = {};
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      for (let j = 0; j < row.steps.length; j++) {
        let step = row.steps[j];
        if (flam[step.description] != undefined) {
          flam[step.description].lastAppearance = [i, j];
          flam[step.description].count += step.count;
        } else {
          flam[step.description] = {
            key: step.description,
            firstAppearance: [i, j],
            lastAppearance: [i, j],
            count: step.count,
          };
        }
      }
    }
    this.logger.trace('Generated FLAM:', flam);
    return flam;
  }

  /**
   * Determines if a given step represents the first appearance of its pattern.
   * Used for UI highlighting and visual indicators in pattern display.
   * Returns observable boolean for reactive UI updates.
   *
   * @param row - Zero-based row index in the pattern
   * @param step - Step object containing description and position data
   * @returns Observable boolean indicating first appearance status
   *
   * @example
   * ```typescript
   * // Check first appearance for UI highlighting
   * this.flamService.isFirstStep(rowIndex, step).subscribe(isFirst => {
   *   if (isFirst) {
   *     this.addFirstAppearanceClass(stepElement);
   *   }
   * });
   *
   * // Use in template with async pipe
   * isFirstStep$ = this.flamService.isFirstStep(this.rowIndex, this.step);
   * ```
   */
  isFirstStep(row: number, step: Step): Observable<boolean> {
    //this.inititalizeFLAM();
    return this.flam$.pipe(
      map((flam) => flam[step.description]),
      filter((flamStep) => flamStep != undefined),
      map((flamStep) => flamStep.firstAppearance),
      map(
        ([firstRow, firstStep]) => firstRow == row && firstStep == step.id - 1
      )
    );
  }

  /**
   * Determines if a given step represents the last appearance of its pattern.
   * Complementary to isFirstStep for complete appearance tracking.
   * Returns observable boolean for reactive UI updates and pattern completion indicators.
   *
   * @param row - Zero-based row index in the pattern
   * @param step - Step object containing description and position data
   * @returns Observable boolean indicating last appearance status
   *
   * @example
   * ```typescript
   * // Check last appearance for completion highlighting
   * this.flamService.isLastStep(rowIndex, step).subscribe(isLast => {
   *   if (isLast) {
   *     this.addLastAppearanceClass(stepElement);
   *   }
   * });
   *
   * // Combined first/last checking
   * const isFirst$ = this.flamService.isFirstStep(rowIndex, step);
   * const isLast$ = this.flamService.isLastStep(rowIndex, step);
   *
   * combineLatest([isFirst$, isLast$]).subscribe(([first, last]) => {
   *   this.updateStepStyling(first, last);
   * });
   * ```
   */
  isLastStep(row: number, step: Step): Observable<boolean> {
    //this.inititalizeFLAM();
    return this.flam$.pipe(
      map((flam) => flam[step.description]),
      filter((flamStep) => flamStep != undefined),
      map((flamStep) => flamStep.lastAppearance),
      map(([lastRow, lastStep]) => lastRow == row && lastStep == step.id - 1)
    );
  }

  /**
   * Extracts color mappings from the current FLAM and persists them to the project.
   * Saves color assignments for pattern steps to maintain visual consistency
   * across sessions. Handles database persistence and error recovery.
   *
   * Process:
   * 1. Extracts color mappings from current FLAM data
   * 2. Updates project with color mapping data
   * 3. Persists changes to IndexedDB
   * 4. Provides error handling and logging
   *
   * @returns Promise that resolves when colors are saved successfully
   *
   * @example
   * ```typescript
   * // Save colors after user updates
   * async onColorChanged(stepDescription: string, color: string) {
   *   const flam = this.flamService.flam$.value;
   *   flam[stepDescription].color = color;
   *   this.flamService.flam$.next(flam);
   *
   *   await this.flamService.saveColorMappingsToProject();
   * }
   *
   * // Save after bulk color updates
   * async onSaveAllColors() {
   *   try {
   *     await this.flamService.saveColorMappingsToProject();
   *     this.notificationService.success('Colors saved successfully');
   *   } catch (error) {
   *     this.notificationService.error('Failed to save colors');
   *   }
   * }
   * ```
   */
  async saveColorMappingsToProject(): Promise<void> {
    const currentFlam = this.flam$.value;
    const colorMapping: { [key: string]: string } = {};

    // Extract only the color mappings from FLAM
    Object.keys(currentFlam).forEach((key) => {
      if (currentFlam[key].color) {
        colorMapping[key] = currentFlam[key].color;
      }
    });

    // Update the project with color mappings using async/await
    try {
      const currentProject = await firstValueFrom(
        this.store.select(selectCurrentProject)
      );

      if (currentProject) {
        const updatedProject = { ...currentProject, colorMapping };
        this.store.dispatch(
          ProjectActions.updateProjectSuccess(updatedProject)
        );
        // Save to database
        await this.projectDbService.updateProject(updatedProject);
        this.logger.debug('Saved color mappings to project:', colorMapping);
      }
    } catch (error) {
      this.logger.error('Failed to save color mappings:', error);
    }
  }

  /**
   * Loads previously saved color mappings from the project into the current FLAM.
   * Restores color assignments to maintain visual consistency when reopening projects.
   * Called automatically when FLAM is regenerated to preserve user color preferences.
   *
   * Process:
   * 1. Retrieves current project from state store
   * 2. Applies saved color mappings to matching FLAM entries
   * 3. Updates FLAM observable with restored colors
   * 4. Handles missing mappings gracefully
   *
   * @returns Promise that resolves when colors are restored successfully
   *
   * @example
   * ```typescript
   * // Manual color restoration (automatically called on FLAM generation)
   * async onProjectLoaded() {
   *   await this.flamService.loadColorMappingsFromProject();
   * }
   *
   * // Check if colors were restored
   * this.flamService.flam$.subscribe(flam => {
   *   const hasColors = Object.values(flam).some(entry => entry.color);
   *   if (hasColors) {
   *     console.log('Colors restored from saved project');
   *   }
   * });
   * ```
   */
  async loadColorMappingsFromProject(): Promise<void> {
    try {
      const currentProject = await firstValueFrom(
        this.store.select(selectCurrentProject)
      );

      if (currentProject?.colorMapping) {
        const currentFlam = this.flam$.value;

        // Apply saved color mappings to current FLAM
        Object.keys(currentProject.colorMapping).forEach((key) => {
          if (currentFlam[key]) {
            currentFlam[key].color = currentProject.colorMapping![key];
          }
        });

        this.flam$.next(currentFlam);
        this.logger.debug(
          'Loaded color mappings from project:',
          currentProject.colorMapping
        );
      }
    } catch (error) {
      this.logger.error('Failed to load color mappings:', error);
    }
  }
}

import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { ProjectDbService } from '../../data/services';
import { ProjectService } from '../../features/project-management/services';
import { FLAM } from '../models/flam';
import { Row } from '../models/row';
import { Step } from '../models/step';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class FlamService {
  flam$: BehaviorSubject<FLAM> = new BehaviorSubject({} as FLAM);

  constructor(
    private logger: NGXLogger,
    private projectService: ProjectService,
    private projectDbService: ProjectDbService,
    private settingsService: SettingsService
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

  isLastStep(row: number, step: Step): Observable<boolean> {
    //this.inititalizeFLAM();
    return this.flam$.pipe(
      map((flam) => flam[step.description]),
      filter((flamStep) => flamStep != undefined),
      map((flamStep) => flamStep.lastAppearance),
      map(([lastRow, lastStep]) => lastRow == row && lastStep == step.id - 1)
    );
  }

  // Extract color mappings from FLAM and save to project
  saveColorMappingsToProject(): void {
    const currentFlam = this.flam$.value;
    const colorMapping: { [key: string]: string } = {};

    // Extract only the color mappings from FLAM
    Object.keys(currentFlam).forEach((key) => {
      if (currentFlam[key].color) {
        colorMapping[key] = currentFlam[key].color;
      }
    });

    // Update the project with color mappings
    const currentProject = this.projectService.project$.value;
    if (currentProject) {
      currentProject.colorMapping = colorMapping;
      this.projectService.project$.next(currentProject);
      // Save to database
      this.projectDbService.updateProject(currentProject);
      this.logger.debug('Saved color mappings to project:', colorMapping);
    }
  }

  // Load color mappings from project into FLAM
  loadColorMappingsFromProject(): void {
    const currentProject = this.projectService.project$.value;
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
  }
}

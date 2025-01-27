import { Injectable } from '@angular/core';
import { Project } from './project';
import { ProjectService } from './project.service';
import { FLAM } from './flam';
import { NGXLogger } from 'ngx-logger';
import { Step } from './step';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { SettingsService } from './settings.service';
import { Row } from './row';
import { take } from 'rxjs/internal/operators/take';
import { filter } from 'rxjs/internal/operators/filter';
import { distinctUntilChanged, map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FlamService {
  flam$: BehaviorSubject<FLAM> = new BehaviorSubject({} as FLAM);

  constructor(
    private logger: NGXLogger,
    private projectService: ProjectService,
    private settingsService: SettingsService
  ) {
    this.projectService.zippedRows$
      .pipe(
        filter((rows) => rows.length !== 0),
        map((rows) => this.generateFLAM(rows))
      )
      .subscribe((flam) => this.flam$.next(flam));
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
        } else {
          flam[step.description] = {
            key: step.description,
            firstAppearance: [i, j],
            lastAppearance: [i, j],
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
}

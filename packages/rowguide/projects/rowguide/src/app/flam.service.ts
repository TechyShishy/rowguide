import { Injectable } from '@angular/core';
import { Project } from './project';
import { ProjectService } from './project.service';
import { FLAM } from './flam';
import { NGXLogger } from 'ngx-logger';
import { Step } from './step';

@Injectable({
  providedIn: 'root',
})
export class FlamService {
  constructor(
    private logger: NGXLogger,
    private projectService: ProjectService
  ) {}

  flam: FLAM = {};

  inititalizeFLAM(force: boolean = false) {
    if (force == false && Object.keys(this.flam).length != 0) return;
    this.flam = this.generateFLAM(this.projectService.project);
  }

  generateFLAM(project: Project): FLAM {
    let flam: FLAM = {};
    for (let i = 0; i < project.rows.length; i++) {
      let row = project.rows[i];
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
    this.logger.debug('Generated FLAM:', JSON.stringify(flam));
    return flam;
  }
  isFirstStep(row: number, step: Step): boolean {
    this.inititalizeFLAM();
    if (
      this.flam[step.description].firstAppearance[0] == row &&
      this.flam[step.description].firstAppearance[1] == step.id - 1
    ) {
      return true;
    } else {
      return false;
    }
  }
  isLastStep(row: number, step: Step): boolean {
    this.inititalizeFLAM();
    if (
      this.flam[step.description].lastAppearance[0] == row &&
      this.flam[step.description].lastAppearance[1] == step.id - 1
    ) {
      return true;
    } else {
      return false;
    }
  }
}

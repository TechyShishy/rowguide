import { Injectable } from '@angular/core';
import { Step } from '../../../core/models/step';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class ZipperService {

  constructor(private logger: NGXLogger) { }

  expandSteps(steps: Step[]) {
    const rowSteps: Step[] = [];
    steps.forEach((step) => {
      for (let i = 0; i < step.count; i++) {
        rowSteps.push({ count: 1, description: step.description, id: i });
      }
    });
    return rowSteps;
  }

  compressSteps(steps: Step[]) {
    const rowSteps: Step[] = [];
    let currentStep: Step = {} as Step;
    steps.forEach((step) => {
      if (!currentStep.description) {
        currentStep = {} as Step;
        currentStep.description = step.description;
        currentStep.count = step.count;
        currentStep.id = 1;
      } else if (currentStep.description === step.description) {
        currentStep.count += step.count;
      } else {
        rowSteps.push(currentStep);
        const newId = currentStep.id + 1;
        currentStep = {} as Step;
        currentStep.description = step.description;
        currentStep.count = step.count;
        currentStep.id = newId;
      }
    });
    if (currentStep) {
      rowSteps.push(currentStep);
    }
    return rowSteps;
  }

  zipperSteps(steps1: Step[], steps2: Step[]): Step[] {
    const expandedSteps1 = this.expandSteps(steps1);
    const expandedSteps2 = this.expandSteps(steps2);
    if (
      expandedSteps1.length !== expandedSteps2.length &&
      expandedSteps1.length !== expandedSteps2.length + 1 &&
      expandedSteps1.length !== expandedSteps2.length - 1
    ) {
      this.logger.warn('Row steps do not match:', steps1, steps2);
      return [];
    }
    const expandedZippedSteps: Step[] = [];
    expandedSteps1.forEach((step, index) => {
      expandedZippedSteps.push(step);
      if (expandedSteps2[index]) {
        expandedZippedSteps.push(expandedSteps2[index]);
      }
    });
    if (expandedSteps1.length > expandedSteps2.length) {
      expandedZippedSteps.push(expandedSteps1[expandedSteps1.length - 1]);
    }
    const zippedSteps = this.compressSteps(expandedZippedSteps);
    return zippedSteps;
  }
}

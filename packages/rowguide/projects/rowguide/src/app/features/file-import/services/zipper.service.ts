import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Step, ModelFactory } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class ZipperService {
  constructor(private logger: NGXLogger) {}

  expandSteps(steps: Step[]): Step[] {
    const rowSteps: Step[] = [];
    steps.forEach((step, index) => {
      for (let i = 0; i < step.count; i++) {
        rowSteps.push(
          ModelFactory.createStep({
            id: index * step.count + i,
            count: 1,
            description: step.description,
          })
        );
      }
    });
    return rowSteps;
  }

  compressSteps(steps: Step[]): Step[] {
    const rowSteps: Step[] = [];
    let currentStep: Step | null = null;
    let idCounter = 1;

    steps.forEach((step) => {
      if (!currentStep) {
        currentStep = ModelFactory.createStep({
          id: idCounter++,
          description: step.description,
          count: step.count,
        });
      } else if (currentStep.description === step.description) {
        currentStep.count += step.count;
      } else {
        rowSteps.push(currentStep);
        currentStep = ModelFactory.createStep({
          id: idCounter++,
          description: step.description,
          count: step.count,
        });
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

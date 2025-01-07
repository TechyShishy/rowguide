import { Injectable } from '@angular/core';
import { Project } from '../project';
import { Row } from '../row';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class PeyoteShorthandService {
  constructor(private logger: NGXLogger) {}

  toRGP(projectString: string, delimiter: string = ' '): Project {
    this.logger.debug('Loading project from string', projectString);
    const project: Project = { rows: [] };

    if (!projectString.trim()) {
      return project;
    }

    let lineNum = 1;
    projectString.split('\n').forEach((line) => {
      this.logger.trace('Line:', line);
      const row: Row = this.createRow(line, lineNum++, delimiter);
      project.rows.push(row);
    });

    return project;
  }

  private createRow(line: string, lineNum: number, delimiter: string): Row {
    const row: Row = { id: lineNum, steps: [] };
    let stepNum = 1;

    line.split(delimiter).forEach((step) => {
      this.logger.trace('Word:', step);
      const stepMatch = this.matchStep(step);

      if (stepMatch) {
        row.steps.push(this.createStep(stepMatch, stepNum++));
      } else {
        this.logger.warn('Invalid step:', step);
      }
    });

    return row;
  }

  private matchStep(step: string): RegExpMatchArray | null {
    return step.match(/^\(([0-9]+)\)([a-zA-Z]+)/);
  }

  private createStep(stepMatch: RegExpMatchArray, stepNum: number) {
    const count = parseInt(stepMatch[1]);
    const description = stepMatch[2];

    this.logger.trace('Count:', count);
    this.logger.trace('Description:', description);

    return { count, description, id: stepNum };
  }
}

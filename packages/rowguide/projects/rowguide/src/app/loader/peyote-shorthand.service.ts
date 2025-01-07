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
      const row: Row = this.createRow(line, lineNum, delimiter);
      if (row.steps.length > 0) {
        project.rows.push(row);
        lineNum++;
      }
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
    const patterns = [
      /^\(([0-9]+)\)([a-zA-Z0-91]+)/, // (1)stepA
      /^([0-9]+)\(([a-zA-Z0-9]+)\)/, // 1(stepA)
    ];

    for (const pattern of patterns) {
      const match = step.match(pattern);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private createStep(stepMatch: RegExpMatchArray, stepNum: number) {
    const count = parseInt(stepMatch[1]);
    const description = stepMatch[2];

    this.logger.trace('Count:', count);
    this.logger.trace('Description:', description);

    return { count, description, id: stepNum };
  }
}

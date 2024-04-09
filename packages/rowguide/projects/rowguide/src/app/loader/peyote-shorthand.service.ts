import { Injectable, Inject } from '@angular/core';
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
    let project = { rows: [] } as Project;
    let lineNum = 1;
    projectString.split('\n').forEach((line) => {
      this.logger.trace('Line:', line);
      let row: Row = { id: lineNum++, steps: [] };
      let stepNum = 1;
      line.split(delimiter).forEach((step) => {
        this.logger.trace('Word:', step);
        let stepMatch = step.match(/^\(([0-9]+)\)([a-zA-Z]+)/);
        if (stepMatch === null) {
          this.logger.warn('No number');
          return;
        }
        this.logger.trace('Count:', stepMatch[1]);
        this.logger.trace('Description:', stepMatch[2]);
        row.steps.push({
          count: parseInt(stepMatch[1]),
          description: stepMatch[2],
          id: stepNum++,
        });
      });
      project.rows.push(row);
    });
    return project;
  }
}

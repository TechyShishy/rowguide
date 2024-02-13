import { Injectable } from '@angular/core';
import { Project } from '../project';
import { Row } from '../row';
import { BeadProject } from '../bead-project';
import { Log } from '../log';
import { LoggerModule, NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class ShorthandService {
  constructor(private logger: NGXLogger) {}

  loadProject(projectString: string, delimiter: string = ' '): Project {
    this.logger.debug('Loading project from string', projectString);
    let project: BeadProject = { id: 0, rows: [] };
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

import { Injectable } from '@angular/core';
import { Project } from '../project';
import { Row } from '../row';
import { BeadProject } from '../bead-project';
import { Log } from '../log';

@Injectable({
  providedIn: 'root',
})
export class ShorthandService {
  constructor() {}

  static loadProject(projectString: string, delimiter: string = ' '): Project {
    Log.info('Loading project from string', projectString);
    let project: BeadProject = { id: 0, rows: [] };
    let lineNum = 1;
    projectString.split('\n').forEach((line) => {
      Log.debug('Line:', line);
      let row: Row = { id: lineNum++, steps: [] };
      let stepNum = 1;
      line.split(delimiter).forEach((step) => {
        Log.debug('Word:', step);
        let stepMatch = step.match(/^\(([0-9]+)\)([a-zA-Z]+)/);
        if (stepMatch === null) {
          Log.warn('No number');
          return;
        }
        Log.debug('Count:', stepMatch[1]);
        Log.debug('Description:', stepMatch[2]);
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

import { Injectable } from '@angular/core';
import { Project } from '../project';
import { Row } from '../row';
import { BeadProject } from '../bead-project';

@Injectable({
  providedIn: 'root',
})
export class ShorthandService {
  constructor() {}

  static loadProject(projectString: string, delimiter: string = ' '): Project {
    //log.debug('Loading project from string', projectString);
    let project: BeadProject = { id: 0, rows: [] };
    let lineNum = 1;
    projectString.split('\n').forEach((line) => {
      //log.debug('Line:', line);
      let row: Row = { id: lineNum++, steps: [] };
      let stepNum = 1;
      line.split(delimiter).forEach((step) => {
        //log.debug('Word:', step);
        let stepMatch = step.match(/^\(([0-9]+)\)([a-zA-Z]+)/);
        let count = '';
        let description = '';
        if (stepMatch === null) {
          //log.debug('No number');
          return;
        }
        //log.debug('Number:', numberMatch[0]);
        count = stepMatch[1];
        description = stepMatch[2];
        //log.debug('Parsed:', step);
        row.steps.push({
          count: parseInt(count),
          description: description,
          id: stepNum++,
        });
      });
      project.rows.push(row);
    });
    return project;
  }
}

import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Project, Step, Row } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class C2ccrochetShorthandService {
  constructor(private logger: NGXLogger) {}

  loadProject(projectString: string, delimiter: string = ' '): Project {
    const rows = projectString.matchAll(
      /ROW (\d+): (↗|↙) (\d+) squares\n((?:\d+x[a-zA-Z]+, )+\dx+[a-zA-Z]+)/g
    );
    let project: Project = { id: 0, rows: [] };
    let rowId = 0;
    for (const row of rows) {
      rowId++;
      let projRow: Row = { id: rowId, steps: [] };
      const rowNumber = row[1];
      const rowDirection = row[2];
      const rowSquares = row[3];
      const rowStitches = row[4].matchAll(/(\d+)x([a-zA-Z]+)/g);
      let stitchId = 0;
      for (const stitch of rowStitches) {
        stitchId++;
        const stitchCount = stitch[1];
        const stitchColor = stitch[2];
        projRow.steps.push(<Step>{
          id: stitchId,
          count: parseInt(stitchCount),
          description: stitchColor,
        });
      }
      project.rows.push(projRow);
    }
    return project;
  }
}

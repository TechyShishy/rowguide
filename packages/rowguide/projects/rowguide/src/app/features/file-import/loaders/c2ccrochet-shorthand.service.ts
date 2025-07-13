import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Project, Row, Step } from '../../../core/models';
import { ErrorHandlerService } from '../../../core/services';

@Injectable({
  providedIn: 'root',
})
export class C2ccrochetShorthandService {
  constructor(
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService
  ) {}

  loadProject(projectString: string, delimiter: string = ' '): Project {
    let project: Project = { id: 0, rows: [] };
    try {
      if (!projectString || typeof projectString !== 'string') {
        throw new Error('Invalid project string provided');
      }

      const rows = projectString.matchAll(
        /ROW (\d+): (↗|↙) (\d+) squares\n((?:\d+x[a-zA-Z]+, )+\dx+[a-zA-Z]+)/g
      );

      let rowId = 0;

      for (const row of rows) {
        // Destructure with safe defaults
        const [
          ,
          rowNumber = '',
          rowDirection = '',
          rowSquares = '',
          stitchesString = '',
        ] = row;
        try {
          rowId++;
          let projRow: Row = { id: rowId, steps: [] };
          const rowStitches = stitchesString.matchAll(/(\d+)x([a-zA-Z]+)/g);

          let stitchId = 0;
          for (const stitch of rowStitches) {
            stitchId++;
            const stitchCount = stitch[1];
            const stitchColor = stitch[2];

            if (!stitchCount || !stitchColor) {
              throw new Error(
                `Invalid stitch data in row ${rowNumber}: ${stitch[0]}`
              );
            }

            const parsedCount = parseInt(stitchCount);
            if (isNaN(parsedCount) || parsedCount <= 0) {
              throw new Error(
                `Invalid stitch count in row ${rowNumber}: ${stitchCount}`
              );
            }

            projRow.steps.push(<Step>{
              id: stitchId,
              count: parsedCount,
              description: stitchColor,
            });
          }
          project.rows.push(projRow);
        } catch (error) {
          this.errorHandler.handleError(
            error,
            {
              operation: 'loadProject',
              service: 'C2ccrochetShorthandService',
              details: `Failed to parse row ${rowId} in C2C crochet pattern`,
              context: {
                rowNumber: rowNumber,
                rowDirection: rowDirection,
                rowSquares: rowSquares,
                currentRowId: rowId,
              },
            },
            'Failed to parse part of the crochet pattern. Some rows may be missing.',
            'medium'
          );
          // Continue processing other rows
        }
      }

      if (project.rows.length === 0) {
        throw new Error('No valid rows found in the pattern');
      }

      return project;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadProject',
          service: 'C2ccrochetShorthandService',
          details: 'Failed to parse C2C crochet shorthand pattern',
          context: {
            inputLength: projectString?.length || 0,
            inputType: typeof projectString,
            delimiter: delimiter,
            parsedRowsCount: project?.rows?.length || 0,
          },
        },
        'Failed to parse crochet pattern. Please check the format.',
        'medium'
      );
      // Return empty project as fallback
      return { id: 0, rows: [] };
    }
  }
}

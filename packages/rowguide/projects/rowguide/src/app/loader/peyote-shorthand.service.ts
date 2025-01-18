import { Injectable } from '@angular/core';
import { Project } from '../project';
import { Row } from '../row';
import { NGXLogger } from 'ngx-logger';
import { SettingsService } from '../settings.service';
import { NotificationService } from '../notification.service';

@Injectable({
  providedIn: 'root',
})
export class PeyoteShorthandService {
  constructor(
    private logger: NGXLogger,
    private settingsService: SettingsService,
    private notificationService: NotificationService
  ) {}

  toProject(projectString: string, delimiter: string = ' '): Project {
    this.logger.debug('Loading project from string', projectString);
    const project: Project = { rows: [] };

    if (!projectString.trim()) {
      return project;
    }

    let lineNum = 1;
    const projectRowSteps: number[] = [];
    projectString.split('\n').forEach((line) => {
      this.logger.trace('Line:', line);
      const { row, rowTotalSteps }: { row: Row; rowTotalSteps: number } =
        this.createRow(line, lineNum, delimiter);

      if (row.steps.length > 0) {
        projectRowSteps.push(rowTotalSteps);
        project.rows.push(row);
        lineNum++;
      }
    });

    this.checkStepCounts(projectRowSteps);

    return project;
  }

  private checkStepCounts(projectRowSteps: number[]): void {
    this.settingsService.combine12$.subscribe((combine12) => {
      const firstRow = combine12
        ? (projectRowSteps.shift() ?? 0) / 2
        : projectRowSteps.shift() ?? 0;
      const allStepsMatch = projectRowSteps.every((step) => step === firstRow);
      const evenStepsMatch = projectRowSteps.every((step,index) => index % 2 === 0 ? step === firstRow : true);
      const oddStepsMatch = projectRowSteps.every((step,index) => index % 2 === 1 ? step === firstRow : true);
      if (!allStepsMatch && !evenStepsMatch && !oddStepsMatch) {
        this.logger.warn('Row steps do not match:', firstRow, projectRowSteps);
        this.notificationService.snackbar(
          'Imported file has inconsistent step counts.  This may be a sign of a failed import.  Please send the file to the developer for review if the import was not successful.'
        );
      }
    });
  }

  private createRow(
    line: string,
    lineNum: number,
    delimiter: string
  ): { row: Row; rowTotalSteps: number } {
    let rowTotalSteps = 0;
    const row: Row = { id: lineNum, steps: [] };
    let stepNum = 1;

    this.stripRowTag(line)
      .split(delimiter)
      .forEach((step) => {
        this.logger.trace('Word:', step);
        const stepMatch = this.matchStep(step);

        if (stepMatch) {
          const { count, description, id } = this.createStep(
            stepMatch,
            stepNum++
          );
          rowTotalSteps += count;
          row.steps.push({ count, description, id });
        } else {
          this.logger.warn('Invalid step:', step);
        }
      });

    return { row, rowTotalSteps };
  }

  private stripRowTag(line: string): string {
    return line.replace(/^Row [0-9&]+ \([LR]\)\s+/, '');
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

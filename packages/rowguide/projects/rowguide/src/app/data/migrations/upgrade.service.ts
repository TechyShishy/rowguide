import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Step } from '../../core/models';
import { ZipperService } from '../../features/file-import/services';
import { MigrationDbService, ProjectDbService } from '../services';

@Injectable({
  providedIn: 'root',
})
export class UpgradeService {
  highestMigration: number = 1;

  constructor(
    private migrationDbService: MigrationDbService,
    private logger: NGXLogger,
    private indexedDBService: ProjectDbService,
    private zipperService: ZipperService
  ) {}
  async doNewMigrations() {
    for (let i = 1; i <= this.highestMigration; i++) {
      if (await this.migrationDbService.loadMigration(i)) {
        continue;
      }
      await this.applyMigration(i);
      await this.migrationDbService.addMigration(i, true);
    }
  }

  async applyMigration(id: number) {
    this.logger.info('Applying migration ', id);
    switch (id) {
      case 1:
        await this.migration1();
        break;
    }
  }
  async migration1() {
    const projects = await this.indexedDBService.loadProjects();

    for (const project of projects) {
      if (project.rows && project.rows.length >= 2) {
        const expandedRow1 = this.zipperService.expandSteps(
          project.rows[0].steps
        );
        const expandedRow2 = this.zipperService.expandSteps(
          project.rows[1].steps
        );
        if (expandedRow1.length / 2 === expandedRow2.length) {
          // Condition satisfied, apply migration
          const newSteps1: Step[] = [];
          const newSteps2: Step[] = [];
          expandedRow1.forEach((step, index) => {
            if (index % 2 === 0) {
              newSteps1.push(step);
            } else {
              newSteps2.push(step);
            }
          });
          project.rows.shift();
          project.rows.forEach((row) => {
            row.id++;
          });
          project.rows.unshift({
            id: 2,
            steps: this.zipperService.compressSteps(newSteps2),
          });
          project.rows.unshift({
            id: 1,
            steps: this.zipperService.compressSteps(newSteps1),
          });
          await this.indexedDBService.updateProject(project);
        }
      }
    }
  }
}

import { Component, ViewChild, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NGXLogger } from 'ngx-logger';
import { ngfModule } from 'angular-file';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { PeyoteShorthandService } from '../loader/peyote-shorthand.service';
import { ProjectService } from '../project.service';
import { MatCardModule } from '@angular/material/card';
import { gzip } from 'pako';
import fileDownload from 'js-file-download';
import { CommonModule } from '@angular/common';
import { Project } from '../project';
import { IndexedDBService } from '../indexed-db.service';
import { ProjectSummaryComponent } from '../project-summary/project-summary.component';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [
    MatButtonModule,
    ngfModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    FormsModule,
    CommonModule,
    ProjectSummaryComponent,
    MatExpansionModule,
  ],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.scss',
})
export class ProjectSelectorComponent {
  file: File = new File([], '');
  fileData: string = '';
  projects: Project[] = [];

  constructor(
    private logger: NGXLogger,
    private projectService: ProjectService,
    private indexedDBService: IndexedDBService
  ) {}
  importFile() {
    this.file.text().then((text) => {
      this.logger.debug('File text: ', text);
      this.fileData = text;
      this.saveProjectToIndexedDB(
        this.projectService.loadPeyote(this.fileData)
      );
      this.loadProjectsFromIndexedDB();
    });

    // TODO: Do something to move the user to the project view
  }
  loadProjectsFromIndexedDB() {
    this.indexedDBService.loadProjects().then((projects) => {
      this.projects = projects;
    });
  }
  ngAfterViewInit() {
    this.loadProjectsFromIndexedDB();
  }
  saveProjectToIndexedDB(project: Project) {
    this.indexedDBService.addProject(project);
  }
  downloadProject() {
    fileDownload(
      gzip(JSON.stringify(this.projectService.project)),
      'project.rgp',
      'application/x-rowguide-project'
    );
  }
}

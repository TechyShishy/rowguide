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
import { inflate } from 'pako';
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
    this.file.arrayBuffer().then((buffer) => {
      const gzipHeader = Uint8Array.from([0x1f, 0x8b]);
      const bufHeader = new Uint8Array(buffer.slice(0, 2));
      if (bufHeader[0] === gzipHeader[0] && bufHeader[1] === gzipHeader[1]) {
        this.logger.debug('Gzip file detected');
        const projectArray = inflate(buffer);
        const decoder = new TextDecoder();
        const projectString = decoder.decode(projectArray);
        const importProject = JSON.parse(projectString);
        this.saveProjectToIndexedDB(importProject);
        this.loadProjectsFromIndexedDB();
      } else {
        this.file.text().then((text) => {
          this.logger.debug('File text: ', text);
          this.fileData = text;
          this.saveProjectToIndexedDB(
            this.projectService.loadPeyote(this.file.name, this.fileData)
          );
          this.loadProjectsFromIndexedDB();
        });
      }
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

}

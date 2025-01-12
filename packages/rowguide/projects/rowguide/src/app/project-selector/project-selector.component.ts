import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NGXLogger } from 'ngx-logger';
import { ngfModule } from 'angular-file';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../project.service';
import { MatCardModule } from '@angular/material/card';
import { inflate } from 'pako';
import { CommonModule } from '@angular/common';
import { Project } from '../project';
import { IndexedDBService } from '../indexed-db.service';
import { ProjectSummaryComponent } from '../project-summary/project-summary.component';
import { BeadtoolPdfService } from '../loader/beadtool-pdf.service';
import { FlamService } from '../flam.service';

@Component({
  selector: 'app-project-selector',
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
    private indexedDBService: IndexedDBService,
    private flamService: FlamService,
    private beadtoolPdfService: BeadtoolPdfService
  ) {}
  async importFile() {
    const buffer = await this.file.arrayBuffer();
    const gzipHeader = Uint8Array.from([0x1f, 0x8b]);
    const pdfHeader = Uint8Array.from([0x25, 0x50, 0x44, 0x46]);
    const bufHeader = new Uint8Array(buffer.slice(0, 4));

    if (bufHeader[0] === gzipHeader[0] && bufHeader[1] === gzipHeader[1]) {
      this.logger.debug('Gzip file detected');
      const projectArray = inflate(buffer);
      const decoder = new TextDecoder();
      const projectString = decoder.decode(projectArray);
      const importProject = JSON.parse(projectString);
      this.indexedDBService.updateProject(importProject);
      this.loadProjectsFromIndexedDB();
    } else if (
      bufHeader[0] === pdfHeader[0] &&
      bufHeader[1] === pdfHeader[1] &&
      bufHeader[2] === pdfHeader[2] &&
      bufHeader[3] === pdfHeader[3]
    ) {
      this.logger.debug('PDF file detected');
      const bufferCopy = buffer.slice(0); // Ensure the buffer is not detached
      const bufferCopy2 = buffer.slice(0); // Ensure the buffer is not detached
      this.logger.debug('Buffer copied');
      this.fileData = await this.beadtoolPdfService.loadDocument(bufferCopy);
      if (this.fileData !== '') {
        this.logger.debug('Document loaded');
        await this.projectService.loadPeyote(this.file.name, this.fileData);
        this.logger.debug('Peyote loaded');
        let project = this.projectService.project$.value;
        project.image = await this.beadtoolPdfService.renderFrontPage(
          bufferCopy2
        );
        this.logger.debug('Image rendered');
        this.flamService.inititalizeFLAM(true);
        project.firstLastAppearanceMap = this.flamService.flam$.value;
        this.logger.debug('FLAM initialized');
        this.projectService.project$.next(project);
        await this.indexedDBService.updateProject(project);
        this.logger.debug('Project written to IndexedDB');
        this.projectService.ready.next(true);
        await this.loadProjectsFromIndexedDB();
        this.logger.debug('Projects loaded from IndexedDB');
        await this.projectService.saveCurrentPosition(0, 0);
        this.logger.debug('Current position saved');
      } else {
        this.logger.debug('Section not found');
      }
    } else {
      const text = await this.file.text();
      this.logger.debug('File text: ', text);
      this.fileData = text;
      await this.projectService.loadPeyote(this.file.name, this.fileData);
      let project = this.projectService.project$.value;
      this.flamService.inititalizeFLAM(true);
      project.firstLastAppearanceMap = this.flamService.flam$.value;
      this.projectService.project$.next(project);
      this.indexedDBService.updateProject(project);
      this.projectService.ready.next(true);
      this.loadProjectsFromIndexedDB();
      this.projectService.saveCurrentPosition(0, 0);
    }

    // TODO: Do something to move the user to the project view
  }

  async extractSection(pdfFile: File) {
    const arrayBuffer = await pdfFile.arrayBuffer();
  }

  async loadProjectsFromIndexedDB() {
    this.projects = await this.indexedDBService.loadProjects();
  }

  async ngAfterViewInit() {
    await this.loadProjectsFromIndexedDB();
  }
  saveProjectToIndexedDB(project: Project) {
    this.indexedDBService.addProject(project);
  }
}

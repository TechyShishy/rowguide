import { Component, ElementRef, Input, Output } from '@angular/core';
import { Project } from '../project';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { IndexedDBService } from '../indexed-db.service';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../project.service';
import { MatButtonModule } from '@angular/material/button';
import fileDownload from 'js-file-download';
import { gzip } from 'pako';
import { FlamService } from '../flam.service';

@Component({
    selector: 'app-project-summary',
    imports: [
        MatExpansionModule,
        MatCardModule,
        MatInputModule,
        FormsModule,
        MatButtonModule,
    ],
    templateUrl: './project-summary.component.html',
    styleUrl: './project-summary.component.scss'
})
export class ProjectSummaryComponent {
  @Input() project!: Project;

  constructor(
    private indexedDBService: IndexedDBService,
    private projectService: ProjectService,
    private flamService: FlamService,
    private ref: ElementRef
  ) {}

  saveName() {
    this.indexedDBService.updateProject(this.project);
  }

  loadProject() {
    this.projectService.project = this.project;
    this.flamService.inititalizeFLAM(true);
    this.projectService.saveCurrentPosition(0, 0);
    this.projectService.loadCurrentProject();
  }
  deleteProject() {
    this.indexedDBService.deleteProject(this.project);
    // TODO: This feels hacky.  Find a better way to trigger a refresh of the project list.
    this.ref.nativeElement.hidden = true;
  }
  downloadProject() {
    fileDownload(
      gzip(JSON.stringify(this.project)),
      'project.rgp',
      'application/x-rowguide-project'
    );
  }
}

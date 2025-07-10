import { Component, ElementRef, Input } from '@angular/core';
import { Project } from '../project';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { ProjectDbService } from '../project-db.service';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import fileDownload from 'js-file-download';
import { gzip } from 'pako';
import { Router } from '@angular/router';
import { ProjectService } from '../project.service';

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
  styleUrl: './project-summary.component.scss',
})
export class ProjectSummaryComponent {
  @Input() project!: Project;

  constructor(
    private indexedDBService: ProjectDbService,
    private ref: ElementRef,
    private router: Router,
    private projectService: ProjectService
  ) {}

  saveName() {
    this.indexedDBService.updateProject(this.project);
  }

  loadProject() {
    this.projectService.saveCurrentProject(this.project.id ?? 0);
    this.router.navigate(['/project', { id: this.project.id }]);
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

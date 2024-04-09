import { Component, Input, Output } from '@angular/core';
import { Project } from '../project';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { IndexedDBService } from '../indexed-db.service';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../project.service';

@Component({
  selector: 'app-project-summary',
  standalone: true,
  imports: [MatExpansionModule, MatCardModule, MatInputModule, FormsModule],
  templateUrl: './project-summary.component.html',
  styleUrl: './project-summary.component.scss',
})
export class ProjectSummaryComponent {
  @Input() project!: Project;

  constructor(
    private indexedDBService: IndexedDBService,
    private projectService: ProjectService
  ) {}

  saveName() {
    this.indexedDBService.updateProject(this.project);
  }

  loadProject() {
    this.projectService.project = this.project;
    this.projectService.saveCurrentPosition(0, 0);
    this.projectService.ready.next(true);
  }
}

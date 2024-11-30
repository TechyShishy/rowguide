import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { ProjectSelectorComponent } from './project-selector/project-selector.component';
import { ProjectComponent } from './project/project.component';
import { SettingsComponent } from './settings/settings.component';
import { ProjectInspectorComponent } from './project-inspector/project-inspector.component';
import { ProjectService } from './project.service';
import { Project } from './project';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ProjectComponent,
    ProjectSelectorComponent,
    ProjectInspectorComponent,
    SettingsComponent,
    MatTabGroup,
    MatTab,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'rowguide';
  project!: Project;

  constructor(
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {
    this.project = this.projectService.project;
    this.projectService.ready.subscribe((ready) => {
      this.project = this.projectService.project;
      this.cdr.detectChanges();
    });
  }
}

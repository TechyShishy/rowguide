import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { ProjectSelectorComponent } from './project-selector/project-selector.component';
import { ProjectComponent } from './project/project.component';
import { SettingsComponent } from './settings/settings.component';
import { ProjectInspectorComponent } from './project-inspector/project-inspector.component';
import { ProjectService } from './project.service';
import { Project } from './project';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ProjectComponent,
    ProjectSelectorComponent,
    ProjectInspectorComponent,
    SettingsComponent,
    CommonModule,
    MatTabGroup,
    MatTab,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'rowguide';

  constructor(
    public projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {
    this.projectService.ready.subscribe((ready) => {
      this.cdr.detectChanges();
    });
  }
}

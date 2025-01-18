import { ChangeDetectorRef, Component } from '@angular/core';
import {
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { ProjectSelectorComponent } from './project-selector/project-selector.component';
import { ProjectComponent } from './project/project.component';
import { SettingsComponent } from './settings/settings.component';
import { ProjectInspectorComponent } from './project-inspector/project-inspector.component';
import { ProjectService } from './project.service';
import { Project } from './project';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificationComponent } from "./notification/notification.component";

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    RouterOutlet,
    RouterLink,
    NotificationComponent
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

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { ProjectSelectorComponent } from './project-selector/project-selector.component';
import { ProjectComponent } from './project/project.component';
import { SettingsComponent } from './settings/settings.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ProjectComponent,
    ProjectSelectorComponent,
    SettingsComponent,
    MatTabGroup,
    MatTab,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'rowguide';
}

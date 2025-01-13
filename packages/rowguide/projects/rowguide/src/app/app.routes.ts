import { Routes } from '@angular/router';
import { ProjectComponent } from './project/project.component';
import { ProjectSelectorComponent } from './project-selector/project-selector.component';
import { ProjectInspectorComponent } from './project-inspector/project-inspector.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
  { path: 'project', component: ProjectComponent },
  { path: 'project-selector', component: ProjectSelectorComponent },
  { path: 'project-inspector', component: ProjectInspectorComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '', redirectTo: '/project', pathMatch: 'full' },
];

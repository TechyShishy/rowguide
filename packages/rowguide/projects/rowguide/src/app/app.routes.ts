import { Routes } from '@angular/router';

import { ProjectComponent } from './features/pattern-tracking/components/project/project.component';
import { ProjectInspectorComponent } from './features/project-management/components/project-inspector/project-inspector.component';
import { ProjectSelectorComponent } from './features/project-management/components/project-selector/project-selector.component';
import { SettingsComponent } from './features/settings/components/settings/settings.component';

export const routes: Routes = [
  { path: 'project', component: ProjectComponent },
  { path: 'project/:id', component: ProjectComponent },
  { path: 'project-selector', component: ProjectSelectorComponent },
  { path: 'project-inspector', component: ProjectInspectorComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '', redirectTo: '/project', pathMatch: 'full' },
];

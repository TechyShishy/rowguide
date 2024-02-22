import { Component } from '@angular/core';
import { ProjectComponent } from '../project/project.component';
import { ProjectSelectorComponent } from '../project-selector/project-selector.component';
import { MatTabGroup, MatTab } from '@angular/material/tabs';

@Component({
  selector: 'app-viewport',
  standalone: true,
  imports: [],
  templateUrl: './viewport.component.html',
  styleUrl: './viewport.component.scss',
})
export class ViewportComponent {}

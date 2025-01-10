import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FlamService } from '../flam.service';
import { FLAM } from '../flam';
import { CommonModule, NgFor, NgForOf } from '@angular/common';
import { FLAMRow } from '../flamrow';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { SettingsService } from '../settings.service';
import { ProjectService } from '../project.service';
import { NGXLogger } from 'ngx-logger';

@Component({
    selector: 'app-project-inspector',
    imports: [CommonModule, MatCardModule, MatListModule],
    templateUrl: './project-inspector.component.html',
    styleUrls: ['./project-inspector.component.scss']
})
export class ProjectInspectorComponent implements OnInit {
  flam: Array<FLAMRow> = [];

  constructor(
    public flamService: FlamService,
    public settingsService: SettingsService,
    public projectService: ProjectService,
    public logger: NGXLogger
  ) {}

  ngOnInit() {
    this.flamService.inititalizeFLAM(true);
    this.flam = Object.values(this.flamService.flam);
  }
}

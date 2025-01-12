import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { FlamService } from '../flam.service';
import { CommonModule } from '@angular/common';
import { FLAMRow } from '../flamrow';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { SettingsService } from '../settings.service';
import { ProjectService } from '../project.service';
import { NGXLogger } from 'ngx-logger';
import { ProjectDbService } from '../project-db.service';
import { BehaviorSubject } from 'rxjs';
import { IndexedDBService } from '../indexed-db.service';

@Component({
  selector: 'app-project-inspector',
  imports: [CommonModule, MatCardModule, MatListModule],
  templateUrl: './project-inspector.component.html',
  styleUrls: ['./project-inspector.component.scss'],
})
export class ProjectInspectorComponent implements OnInit {
  flam: Array<FLAMRow> = [];
  image$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  constructor(
    public flamService: FlamService,
    public settingsService: SettingsService,
    public projectService: ProjectService,
    public logger: NGXLogger,
    private cdr: ChangeDetectorRef,
    private indexedDbService: IndexedDBService
  ) {}

  ngOnInit() {
    this.projectService.ready.subscribe(async () => {
      this.flamService.inititalizeFLAM(true);
      this.flam = Object.values(this.flamService.flam);

      await this.loadProjectImage();
    });
  }

  async loadProjectImage() {
    const project = await this.indexedDbService.loadProject(
      this.projectService.project$.value.id ?? 0
    );
    if (project?.image) {
      const reader = new FileReader();
      reader.onload = () => {
        this.image$.next(reader.result as string);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(new Blob([project.image], { type: 'image/png' }));
    }
  }
}

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { FlamService } from '../flam.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { SettingsService } from '../settings.service';
import { ProjectService } from '../project.service';
import { NGXLogger } from 'ngx-logger';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { IndexedDBService } from '../indexed-db.service';
import { Observable, switchMap } from 'rxjs';
import { Project } from '../project';

@Component({
  selector: 'app-project-inspector',
  imports: [CommonModule, MatCardModule, MatListModule],
  templateUrl: './project-inspector.component.html',
  styleUrls: ['./project-inspector.component.scss'],
})
export class ProjectInspectorComponent implements OnInit {
  ObjectValues = Object.values;
  image$: Observable<string> = this.projectService.project$.pipe(
    switchMap(this.loadProjectImage)
  );

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
      //this.flamService.inititalizeFLAM(true);
    });
  }

  async loadProjectImage(project: Project): Promise<string> {
    if (project?.image) {
      const reader = new FileReader();
      const result = await new Promise<string>((resolve) => {
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(
          new Blob([project.image ?? new ArrayBuffer(0)], { type: 'image/png' })
        );
      });
      return result;
    }
    return '';
  }
}

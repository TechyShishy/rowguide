import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FlamService } from '../flam.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import {
  MatTable,
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { SettingsService } from '../settings.service';
import { ProjectService } from '../project.service';
import { NGXLogger } from 'ngx-logger';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { ProjectDbService } from '../project-db.service';
import { Project } from '../project';
import { FLAM } from '../flam';
import { FLAMRow } from '../flamrow';
import { BrowserModule } from '@angular/platform-browser';
import { ngfModule } from 'angular-file';
import { Observable } from 'rxjs/internal/Observable';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { map } from 'rxjs/internal/operators/map';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { from } from 'rxjs/internal/observable/from';
import { of } from 'rxjs/internal/observable/of';

@Component({
  selector: 'app-project-inspector',
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatTableModule,
    MatSortModule,
    ngfModule,
  ],
  templateUrl: './project-inspector.component.html',
  styleUrls: ['./project-inspector.component.scss'],
})
export class ProjectInspectorComponent implements OnInit {
  ObjectValues = Object.values;
  image$: Observable<string> = this.projectService.project$.pipe(
    switchMap(this.loadProjectImage),
    map((image) => (image != '' ? image : 'assets/no-image-available.png'))
  );

  file: File = new File([], '');

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<{
    key: string;
    firstRow: number;
    firstColumn: number;
    lastRow: number;
    lastColumn: number;
  }>;
  dataSource = new MatTableDataSource<{
    key: string;
    firstRow: number;
    firstColumn: number;
    lastRow: number;
    lastColumn: number;
  }>([]);

  constructor(
    public flamService: FlamService,
    public settingsService: SettingsService,
    public projectService: ProjectService,
    public logger: NGXLogger,
    private cdr: ChangeDetectorRef,
    private indexedDBService: ProjectDbService
  ) {}

  ngOnInit() {
    this.projectService.ready.subscribe(async () => {
      //this.flamService.inititalizeFLAM(true);
    });
  }
  ngAfterViewInit() {
    this.flamService.flam$
      .pipe(
        map((flam) => Object.values(flam)),
        map((flam) =>
          flam.map((flam) => ({
            key: flam.key,
            firstRow: flam.firstAppearance[0],
            firstColumn: flam.firstAppearance[1],
            lastRow: flam.lastAppearance[0],
            lastColumn: flam.lastAppearance[1],
          }))
        )
      )
      .subscribe((flam) => {
        this.dataSource.data = flam;
        this.dataSource.sort = this.sort;
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
    return firstValueFrom(of(''));
  }

  uploadPicture(): void {
    from(this.file.arrayBuffer()).subscribe((buffer) => {
      const pngHeader = Uint8Array.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const isPng = new Uint8Array(buffer)
        .subarray(0, 8)
        .every((value, index) => value === pngHeader[index]);
      if (isPng) {
        const project = this.projectService.project$.value;
        project.image = buffer;
        this.indexedDBService.updateProject(project);
        this.projectService.project$.next(project);
      }
    });
  }
}

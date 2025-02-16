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
import { map, Observable, switchMap } from 'rxjs';
import { Project } from '../project';
import { FLAM } from '../flam';
import { FLAMRow } from '../flamrow';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-project-inspector',
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatTableModule,
    MatSortModule,
  ],
  templateUrl: './project-inspector.component.html',
  styleUrls: ['./project-inspector.component.scss'],
})
export class ProjectInspectorComponent implements OnInit {
  ObjectValues = Object.values;
  image$: Observable<string> = this.projectService.project$.pipe(
    switchMap(this.loadProjectImage)
  );

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
    private indexedDbService: ProjectDbService
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
    return '';
  }
}

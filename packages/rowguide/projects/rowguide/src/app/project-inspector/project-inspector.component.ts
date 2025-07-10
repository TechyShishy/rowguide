import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FlamService } from '../flam.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import {
  MatTable,
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { SettingsService } from '../settings.service';
import { ProjectService } from '../project.service';
import { NGXLogger } from 'ngx-logger';
import { ProjectDbService } from '../project-db.service';
import { Project } from '../core/models/project';
import { FLAMRow } from '../core/models/flamrow';
import { ngfModule } from 'angular-file';
import { Observable } from 'rxjs/internal/Observable';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { map } from 'rxjs/internal/operators/map';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { from } from 'rxjs/internal/observable/from';
import { of } from 'rxjs/internal/observable/of';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-project-inspector',
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ngfModule,
  ],
  templateUrl: './project-inspector.component.html',
  styleUrls: ['./project-inspector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectInspectorComponent implements OnInit, AfterViewInit {
  ObjectValues = Object.values;
  image$: Observable<string> = this.projectService.project$.pipe(
    switchMap(this.loadProjectImage),
    map((image) => (image != '' ? image : 'assets/no-image-available.png'))
  );

  file: File = new File([], '');

  @ViewChild('colorInput') colorInput!: ElementRef<HTMLInputElement>;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<{
    key: string;
    firstRow: number;
    firstColumn: number;
    lastRow: number;
    lastColumn: number;
    count: number;
    color: string;
    hexColor: string;
  }>;
  dataSource = new MatTableDataSource<{
    key: string;
    firstRow: number;
    firstColumn: number;
    lastRow: number;
    lastColumn: number;
    count: number;
    color: string;
    hexColor: string;
  }>([]);

  editingColorKey: string | null = null;
  private delicaColors: { [key: string]: string } = {};

  // TrackBy function to help Angular efficiently track table rows
  trackByKey(index: number, item: any): string {
    return item.key;
  }

  constructor(
    public flamService: FlamService,
    public settingsService: SettingsService,
    public projectService: ProjectService,
    public logger: NGXLogger,
    private cdr: ChangeDetectorRef,
    private indexedDBService: ProjectDbService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Load delica colors mapping
    this.http
      .get<{ [key: string]: string }>('assets/delica-colors.json')
      .subscribe({
        next: (colors) => {
          this.delicaColors = colors;
          // Refresh the table data to apply hex colors now that delica colors are loaded
          this.refreshTableData();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load delica colors', err);
        },
      });

    this.projectService.ready.subscribe(async () => {
      //this.flamService.inititalizeFLAM(true);
      this.cdr.markForCheck();
    });
  }

  private mapFlamToRow(flamRow: FLAMRow): any {
    return {
      key: flamRow.key,
      firstRow: flamRow.firstAppearance[0],
      firstColumn: flamRow.firstAppearance[1],
      lastRow: flamRow.lastAppearance[0],
      lastColumn: flamRow.lastAppearance[1],
      count: flamRow.count,
      color: flamRow.color ?? '',
      hexColor:
        flamRow.color && this.delicaColors[flamRow.color]
          ? this.delicaColors[flamRow.color]
          : '',
    };
  }

  private refreshTableData(): void {
    // Re-process the current FLAM data to apply hex colors
    const currentFlam = this.flamService.flam$.value;
    const flamArray = Object.values(currentFlam).map((flamRow) =>
      this.mapFlamToRow(flamRow)
    );

    this.dataSource.data = [...flamArray];
  }
  ngAfterViewInit() {
    // Ensure sort is properly initialized before subscribing
    if (!this.sort) {
      this.logger.warn('MatSort not initialized');
      return;
    }

    this.flamService.flam$
      .pipe(
        map((flam) => Object.values(flam)),
        map((flamArray) =>
          flamArray.map((flamRow) => this.mapFlamToRow(flamRow))
        )
      )
      .subscribe((flamRows) => {
        // Create a new array reference to ensure proper change detection
        this.dataSource.data = [...flamRows];
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
        // Mark for check since we're using OnPush change detection
        this.cdr.markForCheck();
      });

    this.sort.sortChange.subscribe((sortState: Sort) => {
      if (
        sortState.active +
          sortState.direction[0].toUpperCase() +
          sortState.direction.slice(1) !==
        this.settingsService.flamsort$.value
      ) {
        this.settingsService.flamsort$.next(
          sortState.active +
            sortState.direction[0].toUpperCase() +
            sortState.direction.slice(1)
        );
      }
    });

    this.settingsService.flamsort$.subscribe((flamsort) => {
      this.logger.debug('flamsort', flamsort);

      if (flamsort.endsWith('Asc')) {
        this.sort.direction = 'asc';
        this.sort.active = flamsort.split('Asc')[0];
      } else if (flamsort.endsWith('Desc')) {
        this.sort.direction = 'desc';
        this.sort.active = flamsort.split('Desc')[0];
      } else {
        this.sort.direction = '';
        this.sort.active = '';
      }

      // Emit the sort change to trigger proper sorting with OnPush
      const sortState: Sort = {
        active: this.sort.active,
        direction: this.sort.direction,
      };
      this.sort.sortChange.emit(sortState);

      // Mark for check since we're using OnPush change detection
      this.cdr.markForCheck();
    });
  }

  private focusColorInput(): void {
    if (this.colorInput?.nativeElement) {
      this.colorInput.nativeElement.focus();
      this.colorInput.nativeElement.select();
    }
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

  updateFlamRowColor(flamRow: FLAMRow): void {
    // Update the FLAM data in the service
    const currentFlam = this.flamService.flam$.value;
    if (currentFlam[flamRow.key]) {
      currentFlam[flamRow.key].color = flamRow.color;
      // Create a new FLAM object to trigger proper change detection
      const newFlam = { ...currentFlam };
      this.flamService.flam$.next(newFlam);
      // Save color mappings to project and database
      this.flamService.saveColorMappingsToProject();

      if (flamRow.color && this.delicaColors[flamRow.color]) {
        flamRow.hexColor = this.delicaColors[flamRow.color];
        this.logger.debug(
          `DB color ${flamRow.color} maps to hex ${flamRow.hexColor}`
        );
      }
    }
    // Stop editing when focus is lost
    this.stopEditingColor();
  }

  startEditingColor(flamRow: FLAMRow): void {
    this.editingColorKey = flamRow.key;
    this.cdr.detectChanges();

    // Focus the input after change detection has completed
    this.focusColorInput();
  }

  stopEditingColor(): void {
    this.editingColorKey = null;
    this.cdr.markForCheck();
  }

  isEditingColor(flamRow: FLAMRow): boolean {
    return this.editingColorKey === flamRow.key;
  }

  resetPosition(): void {
    this.projectService.saveCurrentPosition(0, 0);
  }

  resetAllColorCodes(): void {
    const currentFlam = this.flamService.flam$.value;

    // Clear all color assignments
    Object.keys(currentFlam).forEach((key) => {
      currentFlam[key].color = '';
    });

    // Create a new FLAM object to trigger proper change detection
    const newFlam = { ...currentFlam };
    this.flamService.flam$.next(newFlam);

    this.flamService.saveColorMappingsToProject();
    this.refreshTableData();
    this.cdr.markForCheck();

    this.logger.debug('All color codes have been reset');
  }
}

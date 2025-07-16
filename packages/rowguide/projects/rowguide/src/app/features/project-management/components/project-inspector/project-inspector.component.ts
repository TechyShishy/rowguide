import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import {
  MatTable,
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';
import { ngfModule } from 'angular-file';
import { NGXLogger } from 'ngx-logger';
import { Observable, firstValueFrom, from, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

import { FLAMRow } from '../../../../core/models/flamrow';
import { Project } from '../../../../core/models/project';
import { FlamService, SettingsService } from '../../../../core/services';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { ProjectActions } from '../../../../core/store/actions/project-actions';
import { SettingsActions } from '../../../../core/store/actions/settings-actions';
import { selectCurrentProject } from '../../../../core/store/selectors/project-selectors';
import { selectFlamSort } from '../../../../core/store/selectors/settings-selectors';
import { ProjectDbService } from '../../../../data/services';
import { ProjectService } from '../../services';
import { ErrorBoundaryComponent } from '../../../../shared/components/error-boundary/error-boundary.component';

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
    ErrorBoundaryComponent,
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
    private http: HttpClient,
    private store: ReactiveStateStore
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

    this.projectService.ready$.subscribe(async () => {
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

    this.sort.sortChange.subscribe(async (sortState: Sort) => {
      const currentFlamsort = await firstValueFrom(this.store.select(selectFlamSort));

      // Handle case where direction might be empty string
      if (!sortState.direction) {
        return; // Don't update if no direction is set
      }

      const newFlamsort = sortState.active +
        sortState.direction[0].toUpperCase() +
        sortState.direction.slice(1);

      if (newFlamsort !== currentFlamsort) {
        this.store.dispatch(SettingsActions.updateSetting('flamsort', newFlamsort));
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

  async uploadPicture(): Promise<void> {
    try {
      const buffer = await this.file.arrayBuffer();
      const pngHeader = Uint8Array.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const isPng = new Uint8Array(buffer)
        .subarray(0, 8)
        .every((value, index) => value === pngHeader[index]);

      if (isPng) {
        const project = await firstValueFrom(
          this.store.select(selectCurrentProject)
        );

        if (project) {
          const updatedProject = { ...project, image: buffer };
          this.store.dispatch(
            ProjectActions.updateProjectSuccess(updatedProject)
          );
          await this.indexedDBService.updateProject(updatedProject);
        } else {
          this.logger.error('No project available for image upload');
        }
      }
    } catch (error) {
      this.logger.error('Failed to read file for upload:', error);
    }
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

  getDisplayRow(): number {
    // Using synchronous access for display purposes
    // TODO: Consider migrating to reactive approach with combineLatest
    return 1; // Simplified for now
  }

  getDisplayStep(): number {
    // Using synchronous access for display purposes
    // TODO: Consider migrating to reactive approach with combineLatest
    return 1; // Simplified for now
  }

  onRetry(): void {
    // Refresh the project inspector data when retrying after an error
    this.refreshTableData();
    this.cdr.markForCheck();
  }
}

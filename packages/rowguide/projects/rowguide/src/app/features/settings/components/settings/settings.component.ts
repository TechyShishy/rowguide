import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { NGXLogger } from 'ngx-logger';

import {
  FlamService,
  Settings,
  SettingsService,
} from '../../../../core/services';
import { ProjectService } from '../../../project-management/services';

@Component({
  selector: 'app-settings',
  imports: [
    FormsModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatCardModule,
    MatSliderModule,
    CommonModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  combine12Control = new FormControl(false);
  lrdesignatorsControl = new FormControl(false);
  flammarkersControl = new FormControl(false);
  ppinspectorControl = new FormControl(false);
  zoomControl = new FormControl(false);
  scrolloffsetControl = new FormControl(-1);
  multiadvanceControl = new FormControl(3);

  settings = this.formBuilder.group({
    combine12: this.combine12Control,
    lrdesignators: this.lrdesignatorsControl,
    flammarkers: this.flammarkersControl,
    ppinspector: this.ppinspectorControl,
    zoom: this.zoomControl,
    scrolloffset: this.scrolloffsetControl,
    multiadvance: this.multiadvanceControl,
  });

  constructor(
    private formBuilder: FormBuilder,
    private settingsService: SettingsService,
    private projectService: ProjectService,
    private logger: NGXLogger,
    private flamService: FlamService
  ) {
    this.combine12Control.setValue(this.settingsService.combine12$.value);
    this.lrdesignatorsControl.setValue(
      this.settingsService.lrdesignators$.value
    );
    this.flammarkersControl.setValue(this.settingsService.flammarkers$.value);
    this.ppinspectorControl.setValue(this.settingsService.ppinspector$.value);
    this.zoomControl.setValue(this.settingsService.zoom$.value);
    this.scrolloffsetControl.setValue(this.settingsService.scrolloffset$.value);
    this.multiadvanceControl.setValue(this.settingsService.multiadvance$.value);

    this.settings.valueChanges.subscribe((value) => {
      this.settingsService.saveSettings(<Settings>{
        combine12: value.combine12,
        lrdesignators: value.lrdesignators,
        flammarkers: value.flammarkers,
        ppinspector: value.ppinspector,
        zoom: value.zoom,
        scrolloffset: value.scrolloffset,
        multiadvance: value.multiadvance,
      });
      this.settingsService.combine12$.next(value.combine12 ?? false);
      this.settingsService.lrdesignators$.next(value.lrdesignators ?? false);
      this.settingsService.flammarkers$.next(value.flammarkers ?? false);
      this.settingsService.ppinspector$.next(value.ppinspector ?? false);
      this.settingsService.zoom$.next(value.zoom ?? false);
      this.settingsService.scrolloffset$.next(value.scrolloffset ?? -1);
      this.settingsService.multiadvance$.next(value.multiadvance ?? 3);
    });
  }
}

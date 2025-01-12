import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Settings, SettingsService } from '../settings.service';
import { ProjectService } from '../project.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-settings',
    imports: [
        FormsModule,
        MatSlideToggleModule,
        ReactiveFormsModule,
        MatCardModule,
    ],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  combine12Control = new FormControl(false);
  lrdesignatorsControl = new FormControl(false);
  flammarkersControl = new FormControl(false);
  ppinspectorControl = new FormControl(false);
  zoomControl = new FormControl(false);

  settings = this.formBuilder.group({
    combine12: this.combine12Control,
    lrdesignators: this.lrdesignatorsControl,
    flammarkers: this.flammarkersControl,
    ppinspector: this.ppinspectorControl,
    zoom: this.zoomControl,
  });

  constructor(
    private formBuilder: FormBuilder,
    private settingsService: SettingsService,
    private projectService: ProjectService
  ) {
    this.settingsService.loadSettings();
    this.combine12Control.setValue(this.settingsService.combine12$.value);
    this.lrdesignatorsControl.setValue(
      this.settingsService.lrdesignators$.value
    );
    this.flammarkersControl.setValue(this.settingsService.flammarkers$.value);
    this.ppinspectorControl.setValue(this.settingsService.ppinspector$.value);
    this.zoomControl.setValue(this.settingsService.zoom$.value);

    this.settings.valueChanges.subscribe((value) => {
      this.settingsService.saveSettings(<Settings>{
        combine12: value.combine12,
        lrdesignators: value.lrdesignators,
        flammarkers: value.flammarkers,
        ppinspector: value.ppinspector,
        zoom: value.zoom,
      });
      this.settingsService.combine12$.next(value.combine12 ?? false);
      this.settingsService.lrdesignators$.next(value.lrdesignators ?? false);
      this.settingsService.flammarkers$.next(value.flammarkers ?? false);
      this.settingsService.ppinspector$.next(value.ppinspector ?? false);
      this.settingsService.zoom$.next(value.zoom ?? false);
      projectService.loadCurrentProject();
    });
  }
}

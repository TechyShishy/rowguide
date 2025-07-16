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
import { firstValueFrom } from 'rxjs';

import {
  FlamService,
  Settings,
  SettingsService,
} from '../../../../core/services';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { SettingsActions } from '../../../../core/store/actions/settings-actions';
import {
  selectCombine12,
  selectLRDesignators,
  selectFlamMarkers,
  selectPPInspector,
  selectZoom,
  selectScrollOffset,
  selectMultiAdvance,
  selectFlamSort,
  selectProjectSort
} from '../../../../core/store/selectors/settings-selectors';
import { ProjectService } from '../../../project-management/services';
import { ErrorBoundaryComponent } from '../../../../shared/components/error-boundary/error-boundary.component';

@Component({
  selector: 'app-settings',
  imports: [
    FormsModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatCardModule,
    MatSliderModule,
    CommonModule,
    ErrorBoundaryComponent,
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
    private flamService: FlamService,
    private store: ReactiveStateStore
  ) {
    // Initialize form controls with current store values
    this.initializeFormControls();

    this.settings.valueChanges.subscribe(async (value) => {
      // Get current flamsort and projectsort from store since they're not in the form
      const currentFlamsort = await firstValueFrom(this.store.select(selectFlamSort));
      const currentProjectsort = await firstValueFrom(this.store.select(selectProjectSort));

      // Only use SettingsService to save to localStorage and dispatch to store
      // The service will handle store updates, so we don't need to dispatch twice
      this.settingsService.saveSettings(<Settings>{
        combine12: value.combine12,
        lrdesignators: value.lrdesignators,
        flammarkers: value.flammarkers,
        ppinspector: value.ppinspector,
        zoom: value.zoom,
        scrolloffset: value.scrolloffset,
        multiadvance: value.multiadvance,
        flamsort: currentFlamsort, // Preserve current value
        projectsort: currentProjectsort, // Preserve current value
      });
    });
  }

  private async initializeFormControls() {
    // Get current values from store and initialize form controls
    const combine12 = await firstValueFrom(this.store.select(selectCombine12));
    const lrdesignators = await firstValueFrom(this.store.select(selectLRDesignators));
    const flammarkers = await firstValueFrom(this.store.select(selectFlamMarkers));
    const ppinspector = await firstValueFrom(this.store.select(selectPPInspector));
    const zoom = await firstValueFrom(this.store.select(selectZoom));
    const scrolloffset = await firstValueFrom(this.store.select(selectScrollOffset));
    const multiadvance = await firstValueFrom(this.store.select(selectMultiAdvance));

    this.combine12Control.setValue(combine12);
    this.lrdesignatorsControl.setValue(lrdesignators);
    this.flammarkersControl.setValue(flammarkers);
    this.ppinspectorControl.setValue(ppinspector);
    this.zoomControl.setValue(zoom);
    this.scrolloffsetControl.setValue(scrolloffset);
    this.multiadvanceControl.setValue(multiadvance);
  }

  onRetry(): void {
    // Re-initialize form controls when retrying after an error
    this.initializeFormControls();
  }
}

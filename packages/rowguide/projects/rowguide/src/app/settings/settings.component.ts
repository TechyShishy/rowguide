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

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatCardModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  combine12Control = new FormControl(false);
  lrdesignatorsControl = new FormControl(false);
  settings = this.formBuilder.group({
    combine12: this.combine12Control,
    lrdesignators: this.lrdesignatorsControl,
  });

  constructor(
    private formBuilder: FormBuilder,
    private settingsService: SettingsService
  ) {
    this.settingsService.loadSettings();
    this.combine12Control.setValue(this.settingsService.combine12);
    this.lrdesignatorsControl.setValue(this.settingsService.lrdesignators);

    this.settings.valueChanges.subscribe((value) => {
      this.settingsService.saveSettings(<Settings>{
        combine12: value.combine12,
        lrdesignators: value.lrdesignators,
      });
    });
  }
}

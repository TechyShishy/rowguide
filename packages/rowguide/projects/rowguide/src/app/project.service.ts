import { Injectable } from '@angular/core';
import { Project } from './project';
import { Subject } from 'rxjs';
import { PeyoteShorthandService } from './loader/peyote-shorthand.service';
import { NullProject } from './null-project';
import { StepComponent } from './step/step.component';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  project: Project;
  ready: Subject<boolean> = new Subject<boolean>();
  currentPosition: Position = { row: 0, step: 0 };
  currentStep!: StepComponent;
  constructor(
    private peyoteShorthandService: PeyoteShorthandService,
    private settingsService: SettingsService
  ) {
    this.project = new NullProject();
    this.settingsService.ready.subscribe(() => {
      this.loadCurrentProject();
    });
  }
  saveCurrentPosition(row: number, step: number) {
    localStorage.setItem(
      'currentProject',
      JSON.stringify(<CurrentProject>{
        project: this.project,
        position: <Position>{ row: row, step: step },
      })
    );
    this.currentPosition = <Position>{ row: row, step: step };
  }
  loadCurrentPosition(): Position | null {
    const parsed = this._loadCurrentProject();
    if (!parsed) {
      return null;
    }
    if (this.project.id !== parsed.project.id) {
      return null;
    }
    return parsed.position;
  }
  _loadCurrentProject(): CurrentProject | null {
    const data = localStorage.getItem('currentProject');
    if (!data) {
      return null;
    }
    const parsed = <CurrentProject>JSON.parse(data);
    if (!parsed.project) {
      return null;
    }
    return parsed;
  }
  loadCurrentProject() {
    const currentProject = this._loadCurrentProject();
    if (!currentProject) {
      return;
    }
    this.project = currentProject.project;
    this.ready.next(true);
  }
  loadPeyote(projectName: string, data: string): Project {
    this.project = this.peyoteShorthandService.toRGP(data, ', ');
    this.project.name = projectName;
    this.ready.next(true);
    return this.project;
  }
}

class CurrentProject {
  project!: Project;
  position!: Position;
}

class Position {
  row!: number;
  step!: number;
}

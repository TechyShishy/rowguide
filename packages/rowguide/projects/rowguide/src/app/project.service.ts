import { Injectable } from '@angular/core';
import { Project } from './project';
import { Subject, BehaviorSubject } from 'rxjs';
import { PeyoteShorthandService } from './loader/peyote-shorthand.service';
import { NullProject } from './null-project';
import { StepComponent } from './step/step.component';
import { SettingsService } from './settings.service';
import { NGXLogger } from 'ngx-logger';
import { Position } from './position';
import { ProjectDbService } from './project-db.service';
import { IndexedDBService } from './indexed-db.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  project$: BehaviorSubject<Project> = new BehaviorSubject<Project>(
    new NullProject()
  );
  ready: Subject<boolean> = new Subject<boolean>();
  currentStep!: StepComponent;
  constructor(
    private peyoteShorthandService: PeyoteShorthandService,
    private settingsService: SettingsService,
    private logger: NGXLogger,
    private projectDbService: ProjectDbService,
    private indexedDBService: IndexedDBService
  ) {
    this.settingsService.ready.subscribe(() => {
      this.loadCurrentProject();
    });
  }
  saveCurrentPosition(row: number, step: number) {
    localStorage.setItem(
      'currentProject',
      JSON.stringify(<CurrentProject>{ id: this.project$.value.id })
    );
    let project = this.project$.value;
    project.position = { row, step };
    this.project$.next(project);
    this.indexedDBService.updateProject(this.project$.value);
  }
  async loadCurrentPosition(): Promise<Position | null> {
    const parsed = this._loadCurrentProject();
    if (!parsed) {
      return null;
    }
    if (this.project$.value.id !== parsed.id) {
      return null;
    }
    const position = (await this.projectDbService.getProject(parsed.id))
      ?.position;
    if (!position) {
      return null;
    }
    return position;
  }
  _loadCurrentProject(): CurrentProject | null {
    const data = localStorage.getItem('currentProject');
    if (!data) {
      return null;
    }
    const parsed = <CurrentProject>JSON.parse(data);
    if (!parsed.id) {
      return null;
    }
    return parsed;
  }
  async loadCurrentProject() {
    const currentProject = this._loadCurrentProject();
    if (!currentProject) {
      return;
    }
    const project =
      (await this.projectDbService.getProject(currentProject.id)) ??
      new NullProject();

    this.project$.next(project);
    //this.project = currentProject.project;
    this.ready.next(true);
  }
  loadPeyote(projectName: string, data: string): Project {
    const project = this.peyoteShorthandService.toRGP(data, ', ');
    project.name = projectName;
    this.project$.next(project);
    this.ready.next(true);
    return this.project$.value;
  }
}

class CurrentProject {
  id: number = 0;
}



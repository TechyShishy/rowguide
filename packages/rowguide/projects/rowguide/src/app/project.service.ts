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
  project: Project = new NullProject();
  project$: BehaviorSubject<Project> = new BehaviorSubject<Project>(
    this.project
  );
  ready: Subject<boolean> = new Subject<boolean>();
  currentPosition: Position = <Position>{ row: 0, step: 0 };
  currentPositionRow$: BehaviorSubject<number> = new BehaviorSubject<number>(
    this.currentPosition.row
  );
  currentPositionStep$: BehaviorSubject<number> = new BehaviorSubject<number>(
    this.currentPosition.step
  );
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
      JSON.stringify(<CurrentProject>{ id: this.project.id })
    );

    this.indexedDBService.addProject(this.project);
    this.currentPositionRow$.next(row);
    this.currentPositionStep$.next(step);
  }
  async loadCurrentPosition(): Promise<Position | null> {
    const parsed = this._loadCurrentProject();
    if (!parsed) {
      return null;
    }
    if (this.project.id !== parsed.id) {
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
    this.logger.debug('Current Project: ', currentProject.id);
    this.project =
      (await this.projectDbService.getProject(currentProject.id ?? 0)) ??
      new NullProject();
    //this.project = currentProject.project;
    this.project$.next(this.project);
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
  id: number = 0;
}



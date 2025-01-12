import { Injectable } from '@angular/core';
import { Project } from './project';
import { Subject, BehaviorSubject } from 'rxjs';
import { PeyoteShorthandService } from './loader/peyote-shorthand.service';
import { NullProject } from './null-project';
import { StepComponent } from './step/step.component';
import { SettingsService } from './settings.service';
import { NGXLogger } from 'ngx-logger';
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
    private indexedDBService: IndexedDBService,
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
  loadCurrentProjectId(): CurrentProject | null {
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
    const currentProject = this.loadCurrentProjectId();
    if (!currentProject) {
      return;
    }
    const project =
      (await this.indexedDBService.loadProject(currentProject.id)) ??
      new NullProject();

    this.project$.next(project);
    //this.project = currentProject.project;
    this.ready.next(true);
  }
  async loadPeyote(projectName: string, data: string) {
    let project = this.peyoteShorthandService.toProject(data, ', ');
    project.name = projectName;
    this.project$.next(project);
    project.id = await this.indexedDBService.addProject(project);
    let newProject = await this.indexedDBService.loadProject(project.id);
    if (newProject) {
      project = newProject;
    } else {
      this.logger.error('Project not found in IndexedDB');
    }
    this.project$.next(project);
    this.ready.next(true);
  }
}

class CurrentProject {
  id: number = 0;
}



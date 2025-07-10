import { Injectable } from '@angular/core';
import { Project } from './project';
import {
  Subject,
  BehaviorSubject,
  map,
  filter,
  take,
} from 'rxjs';
import { PeyoteShorthandService } from './loader/peyote-shorthand.service';
import { NullProject } from './null-project';
import { StepComponent } from './step/step.component';
import { SettingsService } from './settings.service';
import { NGXLogger } from 'ngx-logger';
import { ProjectDbService } from './project-db.service';
import { ActivatedRoute } from '@angular/router';
import { Row } from './row';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  project$: BehaviorSubject<Project> = new BehaviorSubject<Project>(
    new NullProject()
  );
  zippedRows$: BehaviorSubject<Row[]> = new BehaviorSubject<Row[]>([]);
  ready: Subject<boolean> = new Subject<boolean>();
  currentStep!: StepComponent;
  constructor(
    private peyoteShorthandService: PeyoteShorthandService,
    private settingsService: SettingsService,
    private logger: NGXLogger,
    private indexedDBService: ProjectDbService,
    private route: ActivatedRoute
  ) {
    this.settingsService.ready.subscribe(() => {
      this.loadCurrentProject();
    });
  }
  async saveCurrentProject(id: number) {
    localStorage.setItem(
      'currentProject',
      JSON.stringify(<CurrentProject>{
        id: id,
      })
    );
  }
  async saveCurrentPosition(row: number, step: number) {
    this.project$
      .pipe(
        filter((project) => project.id !== undefined),
        map((project) => {
          project.position = { row, step };
          return project;
        }),
        take(1)
      )
      .subscribe((project) => {
        this.project$.next(project);
        this.indexedDBService.updateProject(project);
      });
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
    await this.loadProject(currentProject.id);
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
    return project;
  }
  async loadProject(id: number) {
    const project = await this.indexedDBService.loadProject(id);
    this.project$.next(project ?? new NullProject());
    this.ready.next(true);
    return project;
  }
}

class CurrentProject {
  id: number = 0;
}



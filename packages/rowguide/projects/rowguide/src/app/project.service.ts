import { Injectable } from '@angular/core';
import { Project } from './project';
import { Subject } from 'rxjs';
import { ShorthandService } from './loader/shorthand.service';
import { NullProject } from './null-project';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  project: Project;
  ready: Subject<boolean> = new Subject<boolean>();
  constructor(private shorthandService: ShorthandService) {
    this.project = new NullProject();
  }
  savePosition(row: number, step: number) {
    localStorage.setItem(
      'currentProject',
      JSON.stringify(<CurrentProject>{
        project: this.project,
        position: <Position>{ row: row, step: step },
      })
    );
  }
  loadCurrentPosition(): Position | null {
    const parsed = this.loadCurrentProject();
    if (!parsed) {
      return null;
    }
    if (this.project.id !== parsed.project.id) {
      return null;
    }
    return parsed.position;
  }
  loadCurrentProject(): CurrentProject | null {
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
  loadProject() {
    const currentProject = this.loadCurrentProject();
    if (!currentProject) {
      return;
    }
    this.project = currentProject.project;
    this.ready.next(true);
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

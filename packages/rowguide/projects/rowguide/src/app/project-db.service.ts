import { Injectable } from '@angular/core';
import { IndexedDBService } from './indexed-db.service';
import { Project } from './project';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class ProjectDbService {
  private projects: Project[] = [];
  constructor(
    private indexedDBService: IndexedDBService,
    private logger: NGXLogger
  ) {}

  async getProject(id: number) {
    if (this.projects.length == 0) {
      await this.getProjects();
    }
    return this.projects.find((project) => project.id == id);
  }
  async getProjects() {
    this.projects = await this.indexedDBService.loadProjects();
    return this.projects;
  }
}

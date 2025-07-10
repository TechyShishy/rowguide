import { Injectable } from '@angular/core';
import { Project } from './project';
import { NGXLogger } from 'ngx-logger';
import { IndexedDbService } from './indexed-db.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectDbService {
  constructor(
    private logger: NGXLogger,
    private indexedDbService: IndexedDbService
  ) {}

  async loadProjects(): Promise<Project[]> {
    const db = await this.indexedDbService.openDB();
    return await db.getAll('projects');
  }
  async loadProject(key: number): Promise<Project | undefined> {
    const db = await this.indexedDbService.openDB();
    return await db.get('projects', key);
  }
  async addProject(project: Project): Promise<number> {
    const db = await this.indexedDbService.openDB();
    return await db.add('projects', project);
  }
  async updateProject(project: Project): Promise<void> {
    const db = await this.indexedDbService.openDB();
    await db.put('projects', project);
  }
  async deleteProject(project: Project): Promise<void> {
    const db = await this.indexedDbService.openDB();
    if (project.id === undefined) return;
    db.delete('projects', project.id);
  }
}

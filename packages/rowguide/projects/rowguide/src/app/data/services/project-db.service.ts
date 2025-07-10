import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Project, isValidProject, hasValidId } from '../../core/models';
import { IndexedDbService } from './indexed-db.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectDbService {
  constructor(
    private logger: NGXLogger,
    private indexedDbService: IndexedDbService
  ) {}

  /**
   * Loads all projects from the database
   */
  async loadProjects(): Promise<Project[]> {
    try {
      const db = await this.indexedDbService.openDB();
      const projects = await db.getAll('projects');

      // Filter out invalid projects
      return projects.filter((project) => {
        if (!isValidProject(project)) {
          this.logger.warn('Invalid project found in database:', project);
          return false;
        }
        return true;
      });
    } catch (error) {
      this.logger.error('Failed to load projects:', error);
      return [];
    }
  }

  /**
   * Loads a specific project by ID
   */
  async loadProject(key: number): Promise<Project | null> {
    if (!key || key <= 0) {
      this.logger.warn('Invalid project key provided:', key);
      return null;
    }

    try {
      const db = await this.indexedDbService.openDB();
      const project = await db.get('projects', key);

      if (!project) {
        return null;
      }

      if (!isValidProject(project)) {
        this.logger.error(
          'Invalid project data loaded from database:',
          project
        );
        return null;
      }

      return project;
    } catch (error) {
      this.logger.error('Failed to load project:', error);
      return null;
    }
  }

  /**
   * Adds a new project to the database
   */
  async addProject(project: Project): Promise<number | null> {
    if (!isValidProject(project)) {
      this.logger.error('Cannot save invalid project:', project);
      throw new Error('Invalid project data');
    }

    try {
      const db = await this.indexedDbService.openDB();
      const id = await db.add('projects', project);

      if (typeof id !== 'number') {
        throw new Error('Invalid ID returned from database');
      }

      return id;
    } catch (error) {
      this.logger.error('Failed to add project:', error);
      return null;
    }
  }

  /**
   * Updates an existing project in the database
   */
  async updateProject(project: Project): Promise<boolean> {
    if (!hasValidId(project)) {
      this.logger.error('Cannot update project without valid ID:', project);
      return false;
    }

    if (!isValidProject(project)) {
      this.logger.error('Cannot update with invalid project data:', project);
      return false;
    }

    try {
      const db = await this.indexedDbService.openDB();
      await db.put('projects', project);
      return true;
    } catch (error) {
      this.logger.error('Failed to update project:', error);
      return false;
    }
  }

  /**
   * Deletes a project from the database
   */
  async deleteProject(project: Project): Promise<boolean> {
    if (!hasValidId(project)) {
      this.logger.warn('Cannot delete project without valid ID:', project);
      return false;
    }

    try {
      const db = await this.indexedDbService.openDB();
      await db.delete('projects', project.id);
      return true;
    } catch (error) {
      this.logger.error('Failed to delete project:', error);
      return false;
    }
  }
}

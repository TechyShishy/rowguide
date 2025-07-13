import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Project, isValidProject, hasValidId } from '../../core/models';
import { ErrorHandlerService } from '../../core/services';
import { IndexedDbService } from './indexed-db.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectDbService {
  constructor(
    private logger: NGXLogger,
    private indexedDbService: IndexedDbService,
    private errorHandler: ErrorHandlerService
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
          this.errorHandler.handleError(
            new Error('Invalid project found in database'),
            {
              operation: 'loadProjects',
              details: 'project validation failed',
              projectId: project?.id,
              invalidProject: project,
            },
            undefined,
            'medium'
          );
          return false;
        }
        return true;
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadProjects',
          details: 'Failed to load projects from IndexedDB',
          tableName: 'projects',
        },
        'Unable to load your projects. Please try refreshing the page.',
        'critical'
      );
      return [];
    }
  }

  /**
   * Loads a specific project by ID
   */
  async loadProject(key: number): Promise<Project | null> {
    if (!key || key <= 0) {
      this.errorHandler.handleError(
        new Error('Invalid project key provided'),
        {
          operation: 'loadProject',
          details: 'invalid key provided',
          key: key,
        },
        undefined,
        'medium'
      );
      return null;
    }

    try {
      const db = await this.indexedDbService.openDB();
      const project = await db.get('projects', key);

      if (!project) {
        return null;
      }

      if (!isValidProject(project)) {
        this.errorHandler.handleError(
          new Error('Invalid project data loaded from database'),
          {
            operation: 'loadProject',
            details: 'Project validation failed',
            projectId: key,
            invalidProject: project,
          },
          'The project data appears to be corrupted. Please try reloading.',
          'high'
        );
        return null;
      }

      return project;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadProject',
          details: 'Failed to load project from database',
          projectId: key,
          tableName: 'projects',
        },
        'Unable to load the selected project. Please try again.',
        'high'
      );
      return null;
    }
  }

  /**
   * Adds a new project to the database
   */
  async addProject(project: Project): Promise<number | null> {
    if (!isValidProject(project)) {
      this.errorHandler.handleError(
        new Error('Cannot save invalid project'),
        {
          operation: 'addProject',
          details: 'Project validation failed',
          projectName: project?.name,
          projectId: project?.id,
          invalidProject: project,
        },
        'Unable to save project. Please check your project data.',
        'high'
      );
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
      this.errorHandler.handleError(
        error,
        {
          operation: 'addProject',
          details: 'Failed to save project to database',
          projectName: project?.name,
          projectId: project?.id,
          tableName: 'projects',
        },
        'Unable to save your project. Please try again.',
        'high'
      );
      return null;
    }
  }

  /**
   * Updates an existing project in the database
   */
  async updateProject(project: Project): Promise<boolean> {
    if (!hasValidId(project)) {
      this.errorHandler.handleError(
        new Error('Cannot update project without valid ID'),
        {
          operation: 'updateProject',
          details: 'Missing ID for project',
          projectName: project?.name,
          projectId: project?.id,
          invalidProject: project,
        },
        'Unable to update project. Invalid project ID.',
        'high'
      );
      return false;
    }

    if (!isValidProject(project)) {
      this.errorHandler.handleError(
        new Error('Cannot update with invalid project data'),
        {
          operation: 'updateProject',
          details: 'Project validation failed',
          projectId: project?.id,
          projectName: project?.name,
          invalidProject: project,
        },
        'Unable to update project. Please check your project data.',
        'high'
      );
      return false;
    }

    try {
      const db = await this.indexedDbService.openDB();
      await db.put('projects', project);
      return true;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'updateProject',
          details: 'Failed to update project in database',
          projectId: project?.id,
          projectName: project?.name,
          tableName: 'projects',
        },
        'Unable to save your changes. Please try again.',
        'high'
      );
      return false;
    }
  }

  /**
   * Deletes a project from the database
   */
  async deleteProject(project: Project): Promise<boolean> {
    if (!hasValidId(project)) {
      this.errorHandler.handleError(
        new Error('Cannot delete project without valid ID'),
        {
          operation: 'deleteProject',
          details: 'Missing ID for project',
          projectName: project?.name,
          projectId: project?.id,
          invalidProject: project,
        },
        'Unable to delete project. Invalid project ID.',
        'medium'
      );
      return false;
    }

    try {
      const db = await this.indexedDbService.openDB();
      await db.delete('projects', project.id);
      return true;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'deleteProject',
          details: 'Failed to delete project from database',
          projectId: project?.id,
          projectName: project?.name,
          tableName: 'projects',
        },
        'Unable to delete the project. Please try again.',
        'high'
      );
      return false;
    }
  }
}

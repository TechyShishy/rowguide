import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { BehaviorSubject, Subject, take } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import {
  Project,
  Row,
  hasValidId,
  isValidProject,
  ModelFactory,
  SafeAccess,
} from '../../../core/models';
import { SettingsService } from '../../../core/services';
import { ProjectDbService } from '../../../data/services';
import { PeyoteShorthandService } from '../../file-import/loaders';
import { StepComponent } from '../../pattern-tracking/components/step/step.component';
import { NullProject } from '../models';

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
  /**
   * Saves the current project ID to localStorage
   */
  async saveCurrentProject(id: number): Promise<void> {
    if (id <= 0) {
      this.logger.warn('Attempted to save invalid project ID:', id);
      return;
    }

    try {
      localStorage.setItem(
        'currentProject',
        JSON.stringify(<CurrentProject>{ id })
      );
    } catch (error) {
      this.logger.error(
        'Failed to save current project to localStorage:',
        error
      );
    }
  }

  /**
   * Saves the current position for the active project
   */
  async saveCurrentPosition(row: number, step: number): Promise<void> {
    if (row < 0 || step < 0) {
      this.logger.warn('Attempted to save invalid position:', { row, step });
      return;
    }

    this.project$
      .pipe(
        filter((project) => hasValidId(project)),
        map((project) => {
          const position = ModelFactory.createPosition(row, step);
          return { ...project, position };
        }),
        take(1)
      )
      .subscribe({
        next: (project) => {
          this.project$.next(project);
          this.indexedDBService.updateProject(project);
        },
        error: (error) => {
          this.logger.error('Failed to save current position:', error);
        },
      });
  }

  /**
   * Loads the current project ID from localStorage
   */
  loadCurrentProjectId(): CurrentProject | null {
    try {
      const data = localStorage.getItem('currentProject');
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data) as CurrentProject;
      if (!parsed.id || parsed.id <= 0) {
        this.logger.warn('Invalid project ID found in localStorage:', parsed);
        return null;
      }

      return parsed;
    } catch (error) {
      this.logger.error(
        'Failed to load current project ID from localStorage:',
        error
      );
      return null;
    }
  }

  /**
   * Loads the current project from the database
   */
  async loadCurrentProject(): Promise<void> {
    const currentProject = this.loadCurrentProjectId();
    if (!currentProject) {
      this.logger.debug('No current project found in localStorage');
      return;
    }

    try {
      await this.loadProject(currentProject.id);
    } catch (error) {
      this.logger.error('Failed to load current project:', error);
    }
  }
  /**
   * Loads a project from peyote shorthand format
   */
  async loadPeyote(projectName: string, data: string): Promise<Project> {
    if (!projectName?.trim() || !data?.trim()) {
      throw new Error('Project name and data are required');
    }

    try {
      let project = this.peyoteShorthandService.toProject(data, ', ');

      // Validate the parsed project
      if (!isValidProject(project)) {
        throw new Error('Invalid project data from peyote shorthand');
      }

      project.name = projectName.trim();
      this.project$.next(project);

      const projectId = await this.indexedDBService.addProject(project);
      if (!projectId) {
        throw new Error('Failed to save project to database');
      }

      project.id = projectId;
      const savedProject = await this.indexedDBService.loadProject(projectId);

      if (!savedProject) {
        this.logger.error('Project not found in IndexedDB after save');
        throw new Error('Failed to retrieve saved project');
      }

      project = savedProject;
      this.project$.next(project);
      this.ready.next(true);

      return project;
    } catch (error) {
      this.logger.error('Failed to load peyote project:', error);
      throw error;
    }
  }

  /**
   * Loads a project by ID from the database
   */
  async loadProject(id: number): Promise<Project | null> {
    if (!id || id <= 0) {
      this.logger.warn('Invalid project ID provided:', id);
      this.project$.next(new NullProject());
      this.ready.next(true);
      return null;
    }

    try {
      const project = await this.indexedDBService.loadProject(id);

      if (!project) {
        this.logger.warn('Project not found:', id);
        this.project$.next(new NullProject());
        this.ready.next(true);
        return null;
      }

      if (!isValidProject(project)) {
        this.logger.error(
          'Invalid project data loaded from database:',
          project
        );
        this.project$.next(new NullProject());
        this.ready.next(true);
        return null;
      }

      this.project$.next(project);
      this.ready.next(true);
      return project;
    } catch (error) {
      this.logger.error('Failed to load project:', error);
      this.project$.next(new NullProject());
      this.ready.next(true);
      return null;
    }
  }
}

class CurrentProject {
  id: number = 0;
}

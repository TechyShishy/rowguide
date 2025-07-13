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
import { SettingsService, ErrorHandlerService } from '../../../core/services';
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
    private route: ActivatedRoute,
    private errorHandler: ErrorHandlerService
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
      this.errorHandler.handleError(
        new Error('Attempted to save invalid project ID'),
        {
          operation: 'saveCurrentProject',
          details: 'Invalid project ID provided',
          projectId: id,
        },
        undefined,
        'medium'
      );
      return;
    }

    try {
      localStorage.setItem(
        'currentProject',
        JSON.stringify(<CurrentProject>{ id })
      );
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentProject',
          details: `Failed to save project ID: ${id} to localStorage`,
          projectId: id,
          storageType: 'localStorage',
        },
        'Unable to remember your current project. Settings may not persist.',
        'medium'
      );
    }
  }

  /**
   * Saves the current position for the active project
   */
  async saveCurrentPosition(row: number, step: number): Promise<void> {
    if (row < 0 || step < 0) {
      this.errorHandler.handleError(
        new Error('Attempted to save invalid position'),
        {
          operation: 'saveCurrentPosition',
          details: 'Invalid position coordinates provided',
          row: row,
          step: step,
        },
        undefined,
        'medium'
      );
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
          this.errorHandler.handleError(
            error,
            {
              operation: 'saveCurrentPosition',
              details: 'Failed to save position coordinates',
              row: row,
              step: step,
            },
            'Unable to save your current position. Progress may not be saved.',
            'medium'
          );
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
        this.errorHandler.handleError(
          new Error('Invalid project ID found in localStorage'),
          {
            operation: 'loadCurrentProjectId',
            details: 'Invalid project ID found in localStorage',
            invalidId: parsed?.id,
            storageType: 'localStorage',
          },
          undefined,
          'medium'
        );
        return null;
      }

      return parsed;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadCurrentProjectId',
          details: 'Failed to load project ID from localStorage',
          storageType: 'localStorage',
        },
        'Unable to restore your last project. You may need to select a project manually.',
        'medium'
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
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadCurrentProject',
          details: `Failed to load current project ID: ${currentProject.id}`,
          projectId: currentProject.id,
        },
        'Unable to load your current project. Please select a project manually.',
        'medium'
      );
    }
  }
  /**
   * Loads a project from peyote shorthand format
   */
  async loadPeyote(projectName: string, data: string): Promise<Project> {
    if (!projectName?.trim() || !data?.trim()) {
      const error = new Error('Project name and data are required');
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Missing required project data',
          projectName: projectName,
          dataLength: data?.length || 0,
        },
        'Please provide both a project name and pattern data.',
        'high'
      );
      throw error;
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
      this.project$.next(project);
      this.ready.next(true);

      return project;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Failed to parse and save peyote project',
          projectName: projectName,
          dataLength: data?.length || 0,
        },
        'Unable to import the pattern. Please check the pattern data format.',
        'high'
      );
      throw error;
    }
  }

  /**
   * Loads a project by ID from the database
   */
  async loadProject(id: number): Promise<Project | null> {
    if (!id || id <= 0) {
      this.errorHandler.handleError(
        new Error('Invalid project ID provided'),
        {
          operation: 'loadProject',
          details: 'Invalid project ID provided',
          projectId: id,
        },
        undefined,
        'medium'
      );
      this.project$.next(new NullProject());
      this.ready.next(true);
      return null;
    }

    try {
      const project = await this.indexedDBService.loadProject(id);

      if (!project) {
        this.errorHandler.handleError(
          new Error('Project not found'),
          {
            operation: 'loadProject',
            details: 'Project not found in database',
            projectId: id,
          },
          'The selected project could not be found. It may have been deleted.',
          'medium'
        );
        this.project$.next(new NullProject());
        this.ready.next(true);
        return null;
      }

      if (!isValidProject(project)) {
        this.errorHandler.handleError(
          new Error('Invalid project data loaded from database'),
          {
            operation: 'loadProject',
            details: `Project validation failed for ID: ${id}`,
            projectId: id,
            invalidProject: project,
          },
          'The project data appears to be corrupted. Please try selecting a different project.',
          'high'
        );
        this.project$.next(new NullProject());
        this.ready.next(true);
        return null;
      }

      this.project$.next(project);
      this.ready.next(true);
      return project;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadProject',
          details: `Failed to load project ID: ${id}`,
          projectId: id,
        },
        'Unable to load the selected project. Please try again or select a different project.',
        'high'
      );
      this.project$.next(new NullProject());
      this.ready.next(true);
      return null;
    }
  }
}

class CurrentProject {
  id: number = 0;
}

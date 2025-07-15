import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Observable, take, firstValueFrom } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import {
  Project,
  Row,
  hasValidId,
  isValidProject,
  ModelFactory,
  SafeAccess,
} from '../../../core/models';
import { SettingsService, ErrorHandlerService, DataIntegrityService } from '../../../core/services';
import { ReactiveStateStore } from '../../../core/store/reactive-state-store';
import { ProjectActions } from '../../../core/store/actions/project-actions';
import {
  selectCurrentProject,
  selectZippedRows,
  selectProjectsReady,
  selectCurrentPosition,
} from '../../../core/store/selectors/project-selectors';
import { ProjectDbService } from '../../../data/services';
import { PeyoteShorthandService } from '../../file-import/loaders';
import { StepComponent } from '../../pattern-tracking/components/step/step.component';
import { NullProject } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  // Store-based observables replace BehaviorSubjects
  project$: Observable<Project> = this.store.select(selectCurrentProject);
  zippedRows$: Observable<Row[]> = this.store.select(selectZippedRows);
  ready$: Observable<boolean> = this.store.select(selectProjectsReady);
  currentStep!: StepComponent;

  constructor(
    private peyoteShorthandService: PeyoteShorthandService,
    private settingsService: SettingsService,
    private logger: NGXLogger,
    private indexedDBService: ProjectDbService,
    private route: ActivatedRoute,
    private errorHandler: ErrorHandlerService,
    private store: ReactiveStateStore,
    private dataIntegrityService: DataIntegrityService
  ) {
    this.settingsService.ready.subscribe(() => {
      this.loadCurrentProject();
    });
  }
  /**
   * Saves the current project ID to localStorage
   */
  async saveCurrentProject(id: number): Promise<void> {
    // Validate project ID using comprehensive checks
    if (!Number.isInteger(id) || id <= 0) {
      const error = new Error(`Invalid project ID for storage: ${id}`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentProject',
          details: 'Project ID validation failed - must be positive integer',
          invalidId: id,
          expectedType: 'positive integer',
          validationContext: 'Project ID storage validation',
        },
        'Unable to save project reference. Invalid project identifier.',
        'medium'
      );
      throw error;
    }

    // Additional validation for reasonable ID range
    const maxReasonableId = 1000000; // Prevent extremely large IDs that might indicate corruption
    if (id > maxReasonableId) {
      const error = new Error(`Project ID exceeds reasonable limits: ${id}`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentProject',
          details: 'Project ID exceeds safety limits',
          projectId: id,
          maxAllowed: maxReasonableId,
          validationContext: 'Project ID boundary validation',
        },
        'Project ID is unusually large. Please verify the project selection.',
        'medium'
      );
      throw error;
    }

    try {
      const projectData = JSON.stringify(<CurrentProject>{ id });

      // Validate JSON serialization result
      if (!projectData || projectData === '{}' || projectData === 'null') {
        throw new Error('Failed to serialize project data for storage');
      }

      localStorage.setItem('currentProject', projectData);

      // Verify storage success by reading back
      const verification = localStorage.getItem('currentProject');
      if (!verification || verification !== projectData) {
        throw new Error('Failed to verify localStorage write operation');
      }
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentProject',
          details: `Failed to save project ID: ${id} to localStorage`,
          projectId: id,
          storageType: 'localStorage',
          validationContext: 'LocalStorage data persistence validation',
        },
        'Unable to remember your current project. Settings may not persist.',
        'medium'
      );
      throw error;
    }
  }

  /**
   * Saves the current position for the active project
   */
  async saveCurrentPosition(row: number, step: number): Promise<void> {
    // Validate position data using DataIntegrityService - Integration Point 5
    const positionValidation = this.dataIntegrityService.validatePositionData(row, step);

    if (!positionValidation.isValid) {
      const error = new Error(`Invalid position coordinates: ${positionValidation.issues.join(', ')}`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentPosition',
          details: 'DataIntegrityService position validation failed',
          invalidData: { row, step },
          validationIssues: positionValidation.issues,
          cleanValue: positionValidation.cleanValue,
          validationContext: 'DataIntegrityService position validation',
        },
        'Unable to save position. Please ensure row and step values are valid.',
        'medium'
      );
      throw error;
    }

    // Log validation results if any issues were automatically corrected
    if (positionValidation.issues.length > 0) {
      this.logger.debug('ProjectService: Position data corrected by DataIntegrityService', {
        original: { row, step },
        corrected: positionValidation.cleanValue,
        issues: positionValidation.issues,
      });
    }

    try {
      const project = await firstValueFrom(
        this.project$.pipe(
          filter((project) => hasValidId(project)),
          map((project) => {
            const position = ModelFactory.createPosition(row, step);
            return { ...project, position };
          }),
          take(1)
        )
      );

      if (project) {
        this.store.dispatch(ProjectActions.updateProjectSuccess(project));
        await this.indexedDBService.updateProject(project);
      } else {
        const error = new Error('No valid project available to save position');
        this.errorHandler.handleError(
          error,
          {
            operation: 'saveCurrentPosition',
            details: 'No active project found when saving position',
            attemptedPosition: { row, step },
            validationContext: 'Project state validation',
          },
          'No project is currently loaded. Please select a project first.',
          'medium'
        );
        throw error;
      }
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentPosition',
          details: 'Failed to save position coordinates to database',
          position: { row, step },
          databaseOperation: 'updateProject',
        },
        'Unable to save your current position. Progress may not be saved.',
        'medium'
      );
      throw error;
    }
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

      // Validate JSON data before parsing
      if (!this.dataIntegrityService.validateJsonData(data).isValid) {
        this.errorHandler.handleError(
          new Error('Invalid JSON data in localStorage'),
          {
            operation: 'loadCurrentProjectId',
            details: 'localStorage contains malformed JSON data',
            invalidData: data,
            storageType: 'localStorage',
            validationContext: 'JSON integrity validation',
          },
          'Stored project data is corrupted. You may need to select a project manually.',
          'medium'
        );
        // Clear corrupted data
        localStorage.removeItem('currentProject');
        return null;
      }

      const parseResult = this.dataIntegrityService.validateJsonData(data);
      const parsed = parseResult.parsed as CurrentProject;

      // Validate parsed data structure
      if (!parsed || typeof parsed !== 'object') {
        this.errorHandler.handleError(
          new Error('Invalid project data structure in localStorage'),
          {
            operation: 'loadCurrentProjectId',
            details: 'Parsed data is not a valid object',
            invalidStructure: parsed,
            storageType: 'localStorage',
            validationContext: 'Data structure validation',
          },
          'Stored project data has invalid structure. You may need to select a project manually.',
          'medium'
        );
        localStorage.removeItem('currentProject');
        return null;
      }

      // Validate project ID
      if (!Number.isInteger(parsed.id) || parsed.id <= 0) {
        this.errorHandler.handleError(
          new Error(`Invalid project ID found in localStorage: ${parsed.id}`),
          {
            operation: 'loadCurrentProjectId',
            details: 'Project ID validation failed - must be positive integer',
            invalidId: parsed.id,
            expectedType: 'positive integer',
            storageType: 'localStorage',
            validationContext: 'Project ID validation',
          },
          'Stored project ID is invalid. You may need to select a project manually.',
          'medium'
        );
        localStorage.removeItem('currentProject');
        return null;
      }

      // Additional boundary validation
      const maxReasonableId = 1000000;
      if (parsed.id > maxReasonableId) {
        this.errorHandler.handleError(
          new Error(`Project ID exceeds reasonable limits: ${parsed.id}`),
          {
            operation: 'loadCurrentProjectId',
            details: 'Project ID exceeds safety boundaries',
            projectId: parsed.id,
            maxAllowed: maxReasonableId,
            validationContext: 'Project ID boundary validation',
          },
          'Stored project ID is unusually large. You may need to select a project manually.',
          'medium'
        );
        localStorage.removeItem('currentProject');
        return null;
      }

      return parsed;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadCurrentProjectId',
          details: 'Failed to load and validate project ID from localStorage',
          storageType: 'localStorage',
          validationContext: 'LocalStorage data retrieval and validation',
        },
        'Unable to restore your last project. You may need to select a project manually.',
        'medium'
      );
      // Clean up potentially corrupted data
      try {
        localStorage.removeItem('currentProject');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
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
    // Validate required inputs
    if (!projectName?.trim() || !data?.trim()) {
      const error = new Error('Project name and data are required');
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Missing required project data for peyote import',
          projectName: projectName,
          dataLength: data?.length || 0,
          validationContext: 'Input validation for peyote pattern import',
        },
        'Please provide both a project name and pattern data.',
        'high'
      );
      throw error;
    }

    // Validate project name using DataIntegrityService
    const trimmedName = projectName.trim();
    if (!this.dataIntegrityService.validateProjectName(trimmedName)) {
      const error = new Error(`Invalid project name: ${trimmedName}`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Project name validation failed during peyote import',
          invalidProjectName: trimmedName,
          validationService: 'DataIntegrityService',
          validationContext: 'Project name safety validation',
        },
        'Project name contains invalid characters. Please use only letters, numbers, spaces, and common punctuation.',
        'high'
      );
      throw error;
    }

    // Validate data length for reasonable pattern size
    const maxDataLength = 1000000; // 1MB limit for pattern data
    if (data.length > maxDataLength) {
      const error = new Error(`Pattern data too large: ${data.length} characters`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Pattern data exceeds size limits',
          dataLength: data.length,
          maxAllowed: maxDataLength,
          validationContext: 'Pattern data size validation',
        },
        'Pattern data is too large. Please check the pattern format.',
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

      project.name = trimmedName;
      this.store.dispatch(ProjectActions.createProjectSuccess(project));

      const projectId = await this.indexedDBService.addProject(project);
      if (!projectId) {
        throw new Error('Failed to save project to database');
      }

      project.id = projectId;
      this.store.dispatch(ProjectActions.updateProjectSuccess(project));

      return project;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Failed to parse and save peyote project',
          projectName: trimmedName,
          dataLength: data?.length || 0,
          parsingService: 'PeyoteShorthandService',
          validationContext: 'Peyote pattern parsing and database save',
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
      this.store.dispatch(ProjectActions.clearCurrentProject());
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
        this.store.dispatch(ProjectActions.clearCurrentProject());
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
        this.store.dispatch(ProjectActions.clearCurrentProject());
        return null;
      }

      // First store the project data in entities, then set it as current
      this.store.dispatch(ProjectActions.updateProjectSuccess(project));
      this.store.dispatch(ProjectActions.setCurrentProject(project.id!));
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
      this.store.dispatch(ProjectActions.clearCurrentProject());
      return null;
    }
  }
}

class CurrentProject {
  id: number = 0;
}

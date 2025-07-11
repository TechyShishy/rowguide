---
layout: page
title: State Management Implementation
permalink: /code-examples/state-management/
---

# State Management Implementation

## Centralized Project Store

```typescript
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, combineLatest } from "rxjs";
import { map, distinctUntilChanged, filter } from "rxjs/operators";

import {
  Project,
  Position,
  DEFAULT_VALUES,
  hasValidId,
  isValidProject,
} from "../../../core/models";

export interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  lastError: string | null;
  lastModified: Date | null;
  isDirty: boolean;
}

const initialState: ProjectState = {
  currentProject: null,
  projects: [],
  isLoading: false,
  lastError: null,
  lastModified: null,
  isDirty: false,
};

@Injectable({ providedIn: "root" })
export class ProjectStore {
  private readonly state$ = new BehaviorSubject<ProjectState>(initialState);

  // ===== SELECTORS =====

  /**
   * Get the complete state
   */
  getState(): Observable<ProjectState> {
    return this.state$.asObservable();
  }

  /**
   * Get current project
   */
  selectCurrentProject(): Observable<Project | null> {
    return this.state$.pipe(
      map((state) => state.currentProject),
      distinctUntilChanged()
    );
  }

  /**
   * Get current project position
   */
  selectCurrentPosition(): Observable<Position> {
    return this.state$.pipe(
      map(
        (state) => state.currentProject?.position || DEFAULT_VALUES.position()
      ),
      distinctUntilChanged(
        (prev, curr) => prev.row === curr.row && prev.step === curr.step
      )
    );
  }

  /**
   * Get all projects
   */
  selectProjects(): Observable<Project[]> {
    return this.state$.pipe(
      map((state) => state.projects),
      distinctUntilChanged()
    );
  }

  /**
   * Get loading state
   */
  selectIsLoading(): Observable<boolean> {
    return this.state$.pipe(
      map((state) => state.isLoading),
      distinctUntilChanged()
    );
  }

  /**
   * Get projects with current project highlighted
   */
  selectProjectsWithCurrent(): Observable<
    Array<Project & { isCurrent: boolean }>
  > {
    return combineLatest([
      this.selectProjects(),
      this.selectCurrentProject(),
    ]).pipe(
      map(([projects, currentProject]) =>
        projects.map((project) => ({
          ...project,
          isCurrent:
            hasValidId(project) && hasValidId(currentProject)
              ? project.id === currentProject.id
              : false,
        }))
      )
    );
  }

  /**
   * Check if current project has unsaved changes
   */
  selectIsDirty(): Observable<boolean> {
    return this.state$.pipe(
      map((state) => state.isDirty),
      distinctUntilChanged()
    );
  }

  /**
   * Get last error
   */
  selectLastError(): Observable<string | null> {
    return this.state$.pipe(
      map((state) => state.lastError),
      distinctUntilChanged()
    );
  }

  // ===== ACTIONS =====

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.updateState({ isLoading });
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    this.updateState({
      lastError: error,
      isLoading: false,
    });
  }

  /**
   * Load projects
   */
  loadProjects(projects: Project[]): void {
    const validProjects = projects.filter(isValidProject);
    this.updateState({
      projects: validProjects,
      isLoading: false,
      lastError: null,
    });
  }

  /**
   * Set current project
   */
  setCurrentProject(project: Project | null): void {
    this.updateState({
      currentProject: project,
      isDirty: false,
      lastModified: project ? new Date() : null,
    });
  }

  /**
   * Update current project
   */
  updateCurrentProject(updates: Partial<Project>): void {
    const currentState = this.state$.value;

    if (!currentState.currentProject) {
      console.warn("Cannot update project: no current project set");
      return;
    }

    const updatedProject = {
      ...currentState.currentProject,
      ...updates,
    };

    this.updateState({
      currentProject: updatedProject,
      isDirty: true,
      lastModified: new Date(),
    });
  }

  /**
   * Update project position
   */
  updatePosition(position: Position): void {
    this.updateCurrentProject({ position });
  }

  /**
   * Add new project
   */
  addProject(project: Project): void {
    const currentState = this.state$.value;

    this.updateState({
      projects: [...currentState.projects, project],
      currentProject: project,
      isDirty: false,
      lastModified: new Date(),
    });
  }

  /**
   * Update existing project in the list
   */
  updateProject(updatedProject: Project): void {
    if (!hasValidId(updatedProject)) {
      console.warn("Cannot update project: invalid project ID");
      return;
    }

    const currentState = this.state$.value;
    const projectIndex = currentState.projects.findIndex(
      (p) => hasValidId(p) && p.id === updatedProject.id
    );

    if (projectIndex === -1) {
      console.warn("Cannot update project: project not found in list");
      return;
    }

    const updatedProjects = [...currentState.projects];
    updatedProjects[projectIndex] = updatedProject;

    const updates: Partial<ProjectState> = {
      projects: updatedProjects,
      lastModified: new Date(),
    };

    // If this is the current project, update it too
    if (
      currentState.currentProject &&
      hasValidId(currentState.currentProject) &&
      currentState.currentProject.id === updatedProject.id
    ) {
      updates.currentProject = updatedProject;
      updates.isDirty = false;
    }

    this.updateState(updates);
  }

  /**
   * Remove project
   */
  removeProject(projectId: number): void {
    const currentState = this.state$.value;
    const filteredProjects = currentState.projects.filter(
      (p) => !hasValidId(p) || p.id !== projectId
    );

    const updates: Partial<ProjectState> = {
      projects: filteredProjects,
    };

    // If removing current project, clear it
    if (
      currentState.currentProject &&
      hasValidId(currentState.currentProject) &&
      currentState.currentProject.id === projectId
    ) {
      updates.currentProject = null;
      updates.isDirty = false;
    }

    this.updateState(updates);
  }

  /**
   * Mark current project as saved
   */
  markAsSaved(): void {
    this.updateState({ isDirty: false });
  }

  /**
   * Reset store to initial state
   */
  reset(): void {
    this.state$.next(initialState);
  }

  // ===== PRIVATE METHODS =====

  private updateState(updates: Partial<ProjectState>): void {
    const currentState = this.state$.value;
    const newState = { ...currentState, ...updates };
    this.state$.next(newState);
  }
}
```

## Store Integration Service

```typescript
import { Injectable } from "@angular/core";
import { Observable, combineLatest, firstValueFrom } from "rxjs";
import { map, take, filter } from "rxjs/operators";

import { ProjectStore } from "./project-store";
import { ProjectDbService } from "../../../data/services";
import { ErrorHandlerService } from "./error-handler.service";
import {
  Project,
  Position,
  hasValidId,
  isValidProject,
} from "../../../core/models";

@Injectable({ providedIn: "root" })
export class ProjectStoreService {
  constructor(
    private store: ProjectStore,
    private dbService: ProjectDbService,
    private errorHandler: ErrorHandlerService
  ) {}

  // ===== PUBLIC API =====

  /**
   * Initialize store with data from database
   */
  async initialize(): Promise<void> {
    this.store.setLoading(true);

    try {
      const projects = await this.dbService.loadProjects();
      this.store.loadProjects(projects);

      // Load last current project if available
      const lastProjectId = this.getLastCurrentProjectId();
      if (lastProjectId) {
        await this.loadCurrentProject(lastProjectId);
      }
    } catch (error) {
      this.errorHandler.handleDatabaseError(error, "initialize store");
      this.store.setError("Failed to load projects");
    }
  }

  /**
   * Load and set current project
   */
  async loadCurrentProject(projectId: number): Promise<boolean> {
    if (projectId <= 0) {
      this.errorHandler.handleValidationError(
        ["Invalid project ID"],
        "load current project"
      );
      return false;
    }

    this.store.setLoading(true);

    try {
      const project = await this.dbService.loadProject(projectId);

      if (!project) {
        this.store.setError("Project not found");
        return false;
      }

      this.store.setCurrentProject(project);
      this.saveCurrentProjectId(projectId);
      return true;
    } catch (error) {
      this.errorHandler.handleDatabaseError(error, "load current project");
      this.store.setError("Failed to load project");
      return false;
    }
  }

  /**
   * Save current project
   */
  async saveCurrentProject(): Promise<boolean> {
    const project = await firstValueFrom(
      this.store.selectCurrentProject().pipe(
        filter((p) => p !== null),
        take(1)
      )
    );

    if (!project) {
      this.errorHandler.handleValidationError(
        ["No current project to save"],
        "save current project"
      );
      return false;
    }

    try {
      let success = false;

      if (hasValidId(project)) {
        success = await this.dbService.updateProject(project);
      } else {
        const newId = await this.dbService.addProject(project);
        if (newId) {
          const projectWithId = { ...project, id: newId };
          this.store.updateCurrentProject({ id: newId });
          success = true;
        }
      }

      if (success) {
        this.store.markAsSaved();
      }

      return success;
    } catch (error) {
      this.errorHandler.handleDatabaseError(error, "save current project");
      return false;
    }
  }

  /**
   * Create new project
   */
  async createProject(projectData: Partial<Project>): Promise<boolean> {
    try {
      const newProject = {
        rows: [],
        position: { row: 0, step: 0 },
        ...projectData,
      };

      if (!isValidProject(newProject)) {
        this.errorHandler.handleValidationError(
          ["Invalid project data"],
          "create project"
        );
        return false;
      }

      const projectId = await this.dbService.addProject(newProject);

      if (!projectId) {
        return false;
      }

      const savedProject = { ...newProject, id: projectId };
      this.store.addProject(savedProject);
      this.saveCurrentProjectId(projectId);

      return true;
    } catch (error) {
      this.errorHandler.handleDatabaseError(error, "create project");
      return false;
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: number): Promise<boolean> {
    if (projectId <= 0) {
      this.errorHandler.handleValidationError(
        ["Invalid project ID"],
        "delete project"
      );
      return false;
    }

    try {
      const success = await this.dbService.deleteProject(projectId);

      if (success) {
        this.store.removeProject(projectId);

        // Clear from localStorage if it was current
        const currentId = this.getLastCurrentProjectId();
        if (currentId === projectId) {
          this.clearCurrentProjectId();
        }
      }

      return success;
    } catch (error) {
      this.errorHandler.handleDatabaseError(error, "delete project");
      return false;
    }
  }

  /**
   * Update current project position
   */
  async updatePosition(position: Position): Promise<void> {
    this.store.updatePosition(position);

    // Auto-save position changes
    setTimeout(() => {
      this.saveCurrentProject();
    }, 1000); // Debounced save
  }

  // ===== SELECTORS (PROXY TO STORE) =====

  selectCurrentProject(): Observable<Project | null> {
    return this.store.selectCurrentProject();
  }

  selectCurrentPosition(): Observable<Position> {
    return this.store.selectCurrentPosition();
  }

  selectProjects(): Observable<Project[]> {
    return this.store.selectProjects();
  }

  selectIsLoading(): Observable<boolean> {
    return this.store.selectIsLoading();
  }

  selectIsDirty(): Observable<boolean> {
    return this.store.selectIsDirty();
  }

  // ===== PRIVATE METHODS =====

  private saveCurrentProjectId(projectId: number): void {
    try {
      localStorage.setItem("currentProject", JSON.stringify({ id: projectId }));
    } catch (error) {
      console.warn("Failed to save current project ID:", error);
    }
  }

  private getLastCurrentProjectId(): number | null {
    try {
      const data = localStorage.getItem("currentProject");
      if (data) {
        const parsed = JSON.parse(data);
        return typeof parsed.id === "number" ? parsed.id : null;
      }
    } catch (error) {
      console.warn("Failed to load current project ID:", error);
    }
    return null;
  }

  private clearCurrentProjectId(): void {
    try {
      localStorage.removeItem("currentProject");
    } catch (error) {
      console.warn("Failed to clear current project ID:", error);
    }
  }
}
```

## Usage in Components

```typescript
import { Component, OnInit, OnDestroy } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { ProjectStoreService } from "../services/project-store.service";
import { Project, Position } from "../../../core/models";

@Component({
  selector: "app-project-dashboard",
  template: `
    <div class="dashboard">
      <div class="sidebar">
        <app-project-list
          [projects]="projects$ | async"
          [currentProject]="currentProject$ | async"
          [isLoading]="isLoading$ | async"
          (projectSelected)="onProjectSelected($event)"
          (createProject)="onCreateProject()"
        >
        </app-project-list>
      </div>

      <div class="main-content">
        <app-project-view
          *ngIf="currentProject$ | async as project"
          [project]="project"
          [position]="currentPosition$ | async"
          [isDirty]="isDirty$ | async"
          (positionChanged)="onPositionChanged($event)"
          (projectChanged)="onProjectChanged($event)"
          (saveRequested)="onSave()"
        >
        </app-project-view>

        <div *ngIf="!(currentProject$ | async)" class="empty-state">
          <h2>No Project Selected</h2>
          <p>
            Select a project from the list or create a new one to get started.
          </p>
          <button mat-raised-button color="primary" (click)="onCreateProject()">
            Create New Project
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard {
        display: grid;
        grid-template-columns: 300px 1fr;
        height: 100vh;
      }

      .sidebar {
        border-right: 1px solid #ddd;
        background: #f5f5f5;
      }

      .main-content {
        padding: 1rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
      }
    `,
  ],
})
export class ProjectDashboardComponent implements OnInit, OnDestroy {
  currentProject$: Observable<Project | null>;
  currentPosition$: Observable<Position>;
  projects$: Observable<Project[]>;
  isLoading$: Observable<boolean>;
  isDirty$: Observable<boolean>;

  private destroy$ = new Subject<void>();

  constructor(private projectStore: ProjectStoreService) {
    this.currentProject$ = this.projectStore.selectCurrentProject();
    this.currentPosition$ = this.projectStore.selectCurrentPosition();
    this.projects$ = this.projectStore.selectProjects();
    this.isLoading$ = this.projectStore.selectIsLoading();
    this.isDirty$ = this.projectStore.selectIsDirty();
  }

  async ngOnInit(): Promise<void> {
    await this.projectStore.initialize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onProjectSelected(project: Project): Promise<void> {
    if (project.id) {
      await this.projectStore.loadCurrentProject(project.id);
    }
  }

  async onCreateProject(): Promise<void> {
    const newProject = {
      name: "New Project",
      rows: [],
    };

    await this.projectStore.createProject(newProject);
  }

  async onPositionChanged(position: Position): Promise<void> {
    await this.projectStore.updatePosition(position);
  }

  onProjectChanged(changes: Partial<Project>): void {
    // Update local state immediately for responsiveness
    // Auto-save will happen via the store service
  }

  async onSave(): Promise<void> {
    await this.projectStore.saveCurrentProject();
  }
}
```

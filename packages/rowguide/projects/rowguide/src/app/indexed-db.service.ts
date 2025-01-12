import { Injectable } from '@angular/core';
import { Project } from './project';
import { openDB } from 'idb';
import { ProjectDb } from './project-db';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  constructor(private logger: NGXLogger) {}

  async loadProjects(): Promise<Project[]> {
    const db = await openDB<ProjectDb>('rowguide', 1, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore('projects', {
          keyPath: 'id',
          autoIncrement: true,
        });
      },
    });
    return await db.getAll('projects');
  }
  async loadProject(key: number): Promise<Project | undefined> {
    const db = await openDB<ProjectDb>('rowguide', 1, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore('projects', {
          keyPath: 'id',
          autoIncrement: true,
        });
      },
    });
    return await db.get('projects', key);
  }
  async addProject(project: Project): Promise<number> {
    const db = await openDB<ProjectDb>('rowguide', 1, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore('projects', {
          keyPath: 'id',
          autoIncrement: true,
        });
      },
    });
    return await db.add('projects', project);
  }
  async updateProject(project: Project): Promise<void> {
    const db = await openDB<ProjectDb>('rowguide', 1, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore('projects', {
          keyPath: 'id',
          autoIncrement: true,
        });
      },
    });
    await db.put('projects', project);
  }
  deleteProject(project: Project): void {
    openDB<ProjectDb>('rowguide', 1, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore('projects', {
          keyPath: 'id',
          autoIncrement: true,
        });
      },
    }).then((db) => {
      if (project.id === undefined) return;
      db.delete('projects', project.id);
    });
  }
}

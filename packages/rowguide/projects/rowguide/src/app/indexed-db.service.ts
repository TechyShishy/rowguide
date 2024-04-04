import { Injectable } from '@angular/core';
import { Project } from './project';
import { openDB } from 'idb';
import { ProjectDb } from './project-db';

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  constructor() {}

  async loadProjects(): Promise<Project[]> {
    const db = await openDB<ProjectDb>('rowguide', 1, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore('projects');
      },
    });
    return db.getAll('projects');
  }
  async saveProjects(projects: Project[]): Promise<void> {
    const db = await openDB<ProjectDb>('rowguide', 1, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore('projects');
      },
    });
    const tx = db.transaction('projects', 'readwrite');
    const os = tx.objectStore('projects');
    for (const project of projects) {
      os.put(project, project.id.toString());
    }
  }
}

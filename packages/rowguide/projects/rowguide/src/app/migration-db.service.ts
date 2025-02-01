import { Injectable } from '@angular/core';
import { IDBPDatabase, openDB } from 'idb';
import { NGXLogger } from 'ngx-logger';
import { MigrationDb } from './migration-db';

@Injectable({
  providedIn: 'root',
})
export class MigrationDbService {
  constructor(private logger: NGXLogger) {}

  async loadMigrations(): Promise<boolean[]> {
    const db = await openDB2();
    return db.getAll('migrations');
  }
  async loadMigration(key: number): Promise<boolean | undefined> {
    const db = await openDB2();
    return db.get('migrations', key);
  }
  async addMigration(key: number, migration: boolean): Promise<number> {
    const db = await openDB2();
    return db.add('migrations', migration, key);
  }
  async updateMigration(key: number, migration: boolean): Promise<void> {
    const db = await openDB2();
    db.put('migrations', migration, key);
  }
  async deleteMigration(key: number): Promise<void> {
    const db = await openDB2();
      db.delete('migrations', key);
  }
}

function openDB2(): Promise<IDBPDatabase<MigrationDb>> {
  return openDB<MigrationDb>('rowguide', 1, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      db.createObjectStore('migrations', {
        autoIncrement: false,
      });
    },
  });
}

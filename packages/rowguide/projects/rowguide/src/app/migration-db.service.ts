import { Injectable } from '@angular/core';
import { IDBPDatabase, openDB } from 'idb';
import { NGXLogger } from 'ngx-logger';
import { MigrationDb } from './migration-db';
import { IndexedDbService } from './indexed-db.service';

@Injectable({
  providedIn: 'root',
})
export class MigrationDbService {
  constructor(
    private logger: NGXLogger,
    private indexedDbService: IndexedDbService
  ) {}

  async loadMigrations(): Promise<boolean[]> {
    const db = await this.indexedDbService.openDB();
    return db.getAll('migrations');
  }
  async loadMigration(key: number): Promise<boolean | undefined> {
    const db = await this.indexedDbService.openDB();
    return db.get('migrations', key);
  }
  async addMigration(key: number, migration: boolean): Promise<number> {
    const db = await this.indexedDbService.openDB();
    return db.add('migrations', migration, key);
  }
  async updateMigration(key: number, migration: boolean): Promise<void> {
    const db = await this.indexedDbService.openDB();
    db.put('migrations', migration, key);
  }
  async deleteMigration(key: number): Promise<void> {
    const db = await this.indexedDbService.openDB();
    db.delete('migrations', key);
  }
}

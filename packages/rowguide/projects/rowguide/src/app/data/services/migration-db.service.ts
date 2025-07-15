import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { ErrorHandlerService } from '../../core/services';
import { IndexedDbService } from './indexed-db.service';

@Injectable({
  providedIn: 'root',
})
export class MigrationDbService {
  constructor(
    private logger: NGXLogger,
    private indexedDbService: IndexedDbService,
    private errorHandler: ErrorHandlerService
  ) {}

  async loadMigrations(): Promise<boolean[]> {
    try {
      const db = await this.indexedDbService.openDB();
      const migrations = await db.getAll('migrations');
      return migrations;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadMigrations',
          details: 'Failed to load migration records from IndexedDB',
          tableName: 'migrations',
        },
        'Unable to check migration status. The application may not work correctly.',
        'critical'
      );
      throw error; // Re-throw to prevent unsafe migration state
    }
  }

  async loadMigration(key: number): Promise<boolean | undefined> {
    try {
      const db = await this.indexedDbService.openDB();
      const migration = await db.get('migrations', key);
      return migration;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadMigration',
          details: 'Failed to load migration from IndexedDB',
          migrationKey: key,
          tableName: 'migrations',
        },
        'Unable to retrieve migration status. Migration tracking may be inconsistent.',
        'medium'
      );
      throw error; // Re-throw to indicate failure
    }
  }

  async addMigration(key: number, migration: boolean): Promise<number> {
    try {
      const db = await this.indexedDbService.openDB();
      return db.add('migrations', migration, key);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'addMigration',
          details: 'Failed to record migration in IndexedDB',
          migrationKey: key,
          migrationState: migration,
          tableName: 'migrations',
        },
        'Unable to record migration completion. Data may be migrated again.',
        'high'
      );
      throw error; // Re-throw to prevent migration from being marked as complete
    }
  }

  async updateMigration(key: number, migration: boolean): Promise<void> {
    try {
      const db = await this.indexedDbService.openDB();
      await db.put('migrations', migration, key);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'updateMigration',
          details: 'Failed to update migration in IndexedDB',
          migrationKey: key,
          migrationState: migration,
          tableName: 'migrations',
        },
        'Unable to update migration status. Migration tracking may be inconsistent.',
        'high'
      );
      throw error; // Re-throw to indicate failure
    }
  }

  async deleteMigration(key: number): Promise<void> {
    try {
      const db = await this.indexedDbService.openDB();
      await db.delete('migrations', key);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'deleteMigration',
          details: 'Failed to delete migration from IndexedDB',
          migrationKey: key,
          tableName: 'migrations',
        },
        'Unable to delete migration record. Migration tracking may be inconsistent.',
        'medium'
      );
      throw error; // Re-throw to indicate failure
    }
  }
}

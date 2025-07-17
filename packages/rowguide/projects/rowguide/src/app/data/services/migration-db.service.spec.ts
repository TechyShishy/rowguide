import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { LoggerTestingModule } from 'ngx-logger/testing';

import { MigrationDbService } from './migration-db.service';
import { IndexedDbService } from './indexed-db.service';
import { ErrorHandlerService, ErrorContext } from '../../core/services';

/**
 * Comprehensive Test Suite for MigrationDbService
 *
 * This test suite validates all database migration operations for the MigrationDbService,
 * including CRUD operations, error handling, and edge cases for managing database
 * migration state.
 *
 * Test Categories:
 * - Service Initialization
 * - loadMigrations: Loading all migration states
 * - loadMigration: Loading specific migration state by key
 * - addMigration: Adding new migration records
 * - updateMigration: Updating existing migration states
 * - deleteMigration: Removing migration records
 * - Error handling scenarios: Database failures and edge cases
 * - Integration scenarios: Complex workflows and data integrity
 *
 * The tests use comprehensive mocking of IndexedDB operations and validate
 * both success and error scenarios to ensure robust migration management.
 */

describe('MigrationDbService', () => {
  let service: MigrationDbService;
  let indexedDbServiceSpy: jasmine.SpyObj<IndexedDbService>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;
  let mockDb: jasmine.SpyObj<any>;

  beforeEach(() => {
    // Create spy objects
    mockDb = jasmine.createSpyObj('IDBPDatabase', [
      'getAll',
      'get',
      'add',
      'put',
      'delete',
    ]);
    indexedDbServiceSpy = jasmine.createSpyObj('IndexedDbService', ['openDB']);
    loggerSpy = jasmine.createSpyObj('NGXLogger', [
      'warn',
      'error',
      'debug',
      'info',
    ]);
    errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
    ]);

    // Configure ErrorHandlerService mock to handle structured context objects
    errorHandlerSpy.handleError.and.callFake(
      (
        error: any,
        context: string | ErrorContext,
        userMessage?: string,
        severity?: string
      ) => {
        // Handle structured context objects for MigrationDbService
        if (typeof context === 'object' && context !== null) {
          const operation = context['operation'];
          const details = context['details'];

          if (
            operation === 'loadMigrations' &&
            details === 'Failed to load migration records from IndexedDB'
          ) {
            loggerSpy.error('Failed to load migrations:', error);
          } else if (
            operation === 'loadMigration' &&
            details === 'Failed to load migration from IndexedDB'
          ) {
            loggerSpy.error('Failed to load migration:', error);
          } else if (
            operation === 'addMigration' &&
            details === 'Failed to record migration in IndexedDB'
          ) {
            loggerSpy.error('Failed to add migration:', error);
          } else if (
            operation === 'updateMigration' &&
            details === 'Failed to update migration in IndexedDB'
          ) {
            loggerSpy.error('Failed to update migration:', error);
          } else if (
            operation === 'deleteMigration' &&
            details === 'Failed to delete migration from IndexedDB'
          ) {
            loggerSpy.error('Failed to delete migration:', error);
          } else {
            // Fallback for unhandled structured contexts
            loggerSpy.error('Operation failed:', error);
          }
        } else {
          // Fallback for any remaining string contexts
          loggerSpy.error('Operation failed:', error);
        }

        return {
          error: {
            message: error?.message || error?.toString() || 'Unknown error',
          },
          userMessage: userMessage || 'Operation failed',
          severity: severity || 'medium',
        };
      }
    );

    // Configure TestBed
    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        MigrationDbService,
        { provide: IndexedDbService, useValue: indexedDbServiceSpy },
        { provide: NGXLogger, useValue: loggerSpy },
        { provide: ErrorHandlerService, useValue: errorHandlerSpy },
      ],
    });

    service = TestBed.inject(MigrationDbService);
    indexedDbServiceSpy = TestBed.inject(
      IndexedDbService
    ) as jasmine.SpyObj<IndexedDbService>;
    loggerSpy = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;

    // Default mock setup
    indexedDbServiceSpy.openDB.and.returnValue(Promise.resolve(mockDb));
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have required dependencies injected', () => {
      expect(indexedDbServiceSpy).toBeTruthy();
      expect(loggerSpy).toBeTruthy();
    });
  });

  describe('loadMigrations', () => {
    it('should load all migration states successfully', async () => {
      const mockMigrations = [true, false, true, true, false];
      mockDb.getAll.and.returnValue(Promise.resolve(mockMigrations));

      const result = await service.loadMigrations();

      expect(result).toEqual(mockMigrations);
      expect(mockDb.getAll).toHaveBeenCalledWith('migrations');
      expect(indexedDbServiceSpy.openDB).toHaveBeenCalled();
    });

    it('should handle empty migrations store', async () => {
      mockDb.getAll.and.returnValue(Promise.resolve([]));

      const result = await service.loadMigrations();

      expect(result).toEqual([]);
      expect(mockDb.getAll).toHaveBeenCalledWith('migrations');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockDb.getAll.and.returnValue(Promise.reject(dbError));

      await expectAsync(service.loadMigrations()).toBeRejectedWith(dbError);
      expect(mockDb.getAll).toHaveBeenCalledWith('migrations');
    });

    it('should handle IndexedDB service errors', async () => {
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      await expectAsync(service.loadMigrations()).toBeRejectedWith(
        serviceError
      );
      expect(indexedDbServiceSpy.openDB).toHaveBeenCalled();
    });

    it('should handle mixed boolean migration values', async () => {
      const mockMigrations = [true, false, true, false, true, false];
      mockDb.getAll.and.returnValue(Promise.resolve(mockMigrations));

      const result = await service.loadMigrations();

      expect(result).toEqual(mockMigrations);
      expect(result.every((migration) => typeof migration === 'boolean')).toBe(
        true
      );
    });
  });

  describe('loadMigration', () => {
    it('should load specific migration state by key', async () => {
      const migrationKey = 5;
      const migrationState = true;
      mockDb.get.and.returnValue(Promise.resolve(migrationState));

      const result = await service.loadMigration(migrationKey);

      expect(result).toBe(migrationState);
      expect(mockDb.get).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should load false migration state', async () => {
      const migrationKey = 3;
      const migrationState = false;
      mockDb.get.and.returnValue(Promise.resolve(migrationState));

      const result = await service.loadMigration(migrationKey);

      expect(result).toBe(migrationState);
      expect(mockDb.get).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should return undefined for non-existent migration', async () => {
      const migrationKey = 999;
      mockDb.get.and.returnValue(Promise.resolve(undefined));

      const result = await service.loadMigration(migrationKey);

      expect(result).toBeUndefined();
      expect(mockDb.get).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle zero migration key', async () => {
      const migrationKey = 0;
      const migrationState = true;
      mockDb.get.and.returnValue(Promise.resolve(migrationState));

      const result = await service.loadMigration(migrationKey);

      expect(result).toBe(migrationState);
      expect(mockDb.get).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle negative migration key', async () => {
      const migrationKey = -1;
      mockDb.get.and.returnValue(Promise.resolve(undefined));

      const result = await service.loadMigration(migrationKey);

      expect(result).toBeUndefined();
      expect(mockDb.get).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle database errors', async () => {
      const migrationKey = 1;
      const dbError = new Error('Database read error');
      mockDb.get.and.returnValue(Promise.reject(dbError));

      await expectAsync(service.loadMigration(migrationKey)).toBeRejectedWith(
        dbError
      );
      expect(mockDb.get).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle IndexedDB service errors', async () => {
      const migrationKey = 1;
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      await expectAsync(service.loadMigration(migrationKey)).toBeRejectedWith(
        serviceError
      );
    });
  });

  describe('addMigration', () => {
    it('should add migration with true state', async () => {
      const migrationKey = 10;
      const migrationState = true;
      mockDb.add.and.returnValue(Promise.resolve(migrationKey));

      const result = await service.addMigration(migrationKey, migrationState);

      expect(result).toBe(migrationKey);
      expect(mockDb.add).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should add migration with false state', async () => {
      const migrationKey = 15;
      const migrationState = false;
      mockDb.add.and.returnValue(Promise.resolve(migrationKey));

      const result = await service.addMigration(migrationKey, migrationState);

      expect(result).toBe(migrationKey);
      expect(mockDb.add).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should handle zero migration key', async () => {
      const migrationKey = 0;
      const migrationState = true;
      mockDb.add.and.returnValue(Promise.resolve(migrationKey));

      const result = await service.addMigration(migrationKey, migrationState);

      expect(result).toBe(migrationKey);
      expect(mockDb.add).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should handle large migration key numbers', async () => {
      const migrationKey = 999999;
      const migrationState = true;
      mockDb.add.and.returnValue(Promise.resolve(migrationKey));

      const result = await service.addMigration(migrationKey, migrationState);

      expect(result).toBe(migrationKey);
      expect(mockDb.add).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should handle database add errors', async () => {
      const migrationKey = 5;
      const migrationState = true;
      const dbError = new Error('Database write error');
      mockDb.add.and.returnValue(Promise.reject(dbError));

      await expectAsync(
        service.addMigration(migrationKey, migrationState)
      ).toBeRejectedWith(dbError);
      expect(mockDb.add).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should handle IndexedDB service errors', async () => {
      const migrationKey = 5;
      const migrationState = true;
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      await expectAsync(
        service.addMigration(migrationKey, migrationState)
      ).toBeRejectedWith(serviceError);
    });

    it('should handle duplicate key conflicts', async () => {
      const migrationKey = 3;
      const migrationState = true;
      const conflictError = new Error('Key already exists');
      mockDb.add.and.returnValue(Promise.reject(conflictError));

      await expectAsync(
        service.addMigration(migrationKey, migrationState)
      ).toBeRejectedWith(conflictError);
      expect(mockDb.add).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });
  });

  describe('updateMigration', () => {
    it('should update migration state to true', async () => {
      const migrationKey = 7;
      const migrationState = true;
      mockDb.put.and.returnValue(Promise.resolve());

      await service.updateMigration(migrationKey, migrationState);

      expect(mockDb.put).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should update migration state to false', async () => {
      const migrationKey = 12;
      const migrationState = false;
      mockDb.put.and.returnValue(Promise.resolve());

      await service.updateMigration(migrationKey, migrationState);

      expect(mockDb.put).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should handle zero migration key', async () => {
      const migrationKey = 0;
      const migrationState = false;
      mockDb.put.and.returnValue(Promise.resolve());

      await service.updateMigration(migrationKey, migrationState);

      expect(mockDb.put).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should update non-existent migration (upsert behavior)', async () => {
      const migrationKey = 999;
      const migrationState = true;
      mockDb.put.and.returnValue(Promise.resolve());

      await service.updateMigration(migrationKey, migrationState);

      expect(mockDb.put).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should handle database update errors', async () => {
      const migrationKey = 8;
      const migrationState = true;
      const dbError = new Error('Database update error');
      mockDb.put.and.returnValue(Promise.reject(dbError));

      await expectAsync(
        service.updateMigration(migrationKey, migrationState)
      ).toBeRejectedWith(dbError);
      expect(mockDb.put).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });

    it('should handle IndexedDB service errors', async () => {
      const migrationKey = 8;
      const migrationState = true;
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      await expectAsync(
        service.updateMigration(migrationKey, migrationState)
      ).toBeRejectedWith(serviceError);
    });

    it('should handle negative migration keys', async () => {
      const migrationKey = -5;
      const migrationState = false;
      mockDb.put.and.returnValue(Promise.resolve());

      await service.updateMigration(migrationKey, migrationState);

      expect(mockDb.put).toHaveBeenCalledWith(
        'migrations',
        migrationState,
        migrationKey
      );
    });
  });

  describe('deleteMigration', () => {
    it('should delete migration by key', async () => {
      const migrationKey = 20;
      mockDb.delete.and.returnValue(Promise.resolve());

      await service.deleteMigration(migrationKey);

      expect(mockDb.delete).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle zero migration key deletion', async () => {
      const migrationKey = 0;
      mockDb.delete.and.returnValue(Promise.resolve());

      await service.deleteMigration(migrationKey);

      expect(mockDb.delete).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle deletion of non-existent migration', async () => {
      const migrationKey = 404;
      mockDb.delete.and.returnValue(Promise.resolve());

      await service.deleteMigration(migrationKey);

      expect(mockDb.delete).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle negative migration key deletion', async () => {
      const migrationKey = -10;
      mockDb.delete.and.returnValue(Promise.resolve());

      await service.deleteMigration(migrationKey);

      expect(mockDb.delete).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle database delete errors', async () => {
      const migrationKey = 15;
      const dbError = new Error('Database delete error');
      mockDb.delete.and.returnValue(Promise.reject(dbError));

      await expectAsync(service.deleteMigration(migrationKey)).toBeRejectedWith(
        dbError
      );
      expect(mockDb.delete).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle IndexedDB service errors', async () => {
      const migrationKey = 15;
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      await expectAsync(service.deleteMigration(migrationKey)).toBeRejectedWith(
        serviceError
      );
    });

    it('should handle large migration key numbers for deletion', async () => {
      const migrationKey = 1000000;
      mockDb.delete.and.returnValue(Promise.resolve());

      await service.deleteMigration(migrationKey);

      expect(mockDb.delete).toHaveBeenCalledWith('migrations', migrationKey);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete migration lifecycle', async () => {
      const migrationKey = 1;

      // Add migration
      mockDb.add.and.returnValue(Promise.resolve(migrationKey));
      await service.addMigration(migrationKey, false);
      expect(mockDb.add).toHaveBeenCalledWith(
        'migrations',
        false,
        migrationKey
      );

      // Load specific migration
      mockDb.get.and.returnValue(Promise.resolve(false));
      const loadResult = await service.loadMigration(migrationKey);
      expect(loadResult).toBe(false);

      // Update migration state
      mockDb.put.and.returnValue(Promise.resolve());
      await service.updateMigration(migrationKey, true);
      expect(mockDb.put).toHaveBeenCalledWith('migrations', true, migrationKey);

      // Verify updated state
      mockDb.get.and.returnValue(Promise.resolve(true));
      const updatedResult = await service.loadMigration(migrationKey);
      expect(updatedResult).toBe(true);

      // Delete migration
      mockDb.delete.and.returnValue(Promise.resolve());
      await service.deleteMigration(migrationKey);
      expect(mockDb.delete).toHaveBeenCalledWith('migrations', migrationKey);
    });

    it('should handle multiple concurrent operations', async () => {
      const migration1Key = 1;
      const migration2Key = 2;

      // Mock concurrent operations
      mockDb.add.and.callFake((store: string, value: boolean, key: number) => {
        return Promise.resolve(key);
      });

      // Add multiple migrations concurrently
      const [result1, result2] = await Promise.all([
        service.addMigration(migration1Key, true),
        service.addMigration(migration2Key, false),
      ]);

      expect(result1).toBe(migration1Key);
      expect(result2).toBe(migration2Key);
      expect(mockDb.add).toHaveBeenCalledTimes(2);
    });

    it('should handle migration versioning patterns', async () => {
      const migrationVersions = [1, 2, 3, 4, 5];
      const migrationStates = [true, true, false, true, false];

      // Add migrations sequentially
      mockDb.add.and.callFake((store: string, value: boolean, key: number) => {
        return Promise.resolve(key);
      });

      for (let i = 0; i < migrationVersions.length; i++) {
        await service.addMigration(migrationVersions[i], migrationStates[i]);
      }

      expect(mockDb.add).toHaveBeenCalledTimes(5);

      // Load all migrations
      mockDb.getAll.and.returnValue(Promise.resolve(migrationStates));
      const allMigrations = await service.loadMigrations();

      expect(allMigrations).toEqual(migrationStates);
    });

    it('should handle database recovery scenarios', async () => {
      const migrationKey = 10;

      // First operation fails
      indexedDbServiceSpy.openDB.and.returnValue(
        Promise.reject(new Error('Database unavailable'))
      );

      await expectAsync(service.loadMigration(migrationKey)).toBeRejected();

      // Database recovers
      indexedDbServiceSpy.openDB.and.returnValue(Promise.resolve(mockDb));
      mockDb.get.and.returnValue(Promise.resolve(true));

      const result = await service.loadMigration(migrationKey);
      expect(result).toBe(true);
    });

    it('should maintain data integrity across operations', async () => {
      const migrationKey = 100;
      const initialState = false;
      const updatedState = true;

      // Add migration
      mockDb.add.and.returnValue(Promise.resolve(migrationKey));
      await service.addMigration(migrationKey, initialState);

      // Update migration
      mockDb.put.and.returnValue(Promise.resolve());
      await service.updateMigration(migrationKey, updatedState);

      // Verify state consistency - each operation should be isolated
      expect(mockDb.add).toHaveBeenCalledWith(
        'migrations',
        initialState,
        migrationKey
      );
      expect(mockDb.put).toHaveBeenCalledWith(
        'migrations',
        updatedState,
        migrationKey
      );
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle database connection timeout', async () => {
      const timeoutError = new Error('Database connection timeout');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(timeoutError));

      await expectAsync(service.loadMigrations()).toBeRejectedWith(
        timeoutError
      );
      await expectAsync(service.addMigration(1, true)).toBeRejectedWith(
        timeoutError
      );
      await expectAsync(service.updateMigration(1, false)).toBeRejectedWith(
        timeoutError
      );
      await expectAsync(service.deleteMigration(1)).toBeRejectedWith(
        timeoutError
      );
    });

    it('should handle corrupted migration data gracefully', async () => {
      // Even if database returns unexpected data, service should pass it through
      const corruptedData = [null, undefined, 'invalid', {}, []] as any;
      mockDb.getAll.and.returnValue(Promise.resolve(corruptedData));

      const result = await service.loadMigrations();
      expect(result).toEqual(corruptedData);
    });

    it('should handle very large migration datasets', async () => {
      const largeMigrationSet = new Array(10000)
        .fill(true)
        .map((_, i) => i % 2 === 0);
      mockDb.getAll.and.returnValue(Promise.resolve(largeMigrationSet));

      const result = await service.loadMigrations();

      expect(result).toEqual(largeMigrationSet);
      expect(result.length).toBe(10000);
    });

    it('should handle rapid sequential operations', async () => {
      const migrationKey = 50;
      let operationCounter = 0;

      // Mock database operations with delays to simulate real-world conditions
      mockDb.add.and.callFake(() => {
        operationCounter++;
        return Promise.resolve(migrationKey);
      });

      mockDb.put.and.callFake(() => {
        operationCounter++;
        return Promise.resolve();
      });

      mockDb.delete.and.callFake(() => {
        operationCounter++;
        return Promise.resolve();
      });

      // Execute rapid operations
      await service.addMigration(migrationKey, true);
      await service.updateMigration(migrationKey, false);
      await service.deleteMigration(migrationKey);

      expect(operationCounter).toBe(3);
      expect(mockDb.add).toHaveBeenCalledTimes(1);
      expect(mockDb.put).toHaveBeenCalledTimes(1);
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });
  });
});

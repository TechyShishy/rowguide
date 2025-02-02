import { Injectable } from '@angular/core';
import { IDBPDatabase, openDB } from 'idb';
import { MigrationDb } from './migration-db';
import { RowguideDb } from './rowguide-db';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {

  constructor() { }

  openDB(): Promise<IDBPDatabase<RowguideDb>> {
    return openDB<RowguideDb>('rowguide', 2, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains('migrations')) {
          db.createObjectStore('migrations', {
            autoIncrement: false,
          });
        }
      },
    });
  }
}

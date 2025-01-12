import { TestBed } from '@angular/core/testing';

import { IndexedDBService } from './indexed-db.service';
import { LoggerTestingModule } from 'ngx-logger/testing';

describe('LocalStorageService', () => {
  let service: IndexedDBService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LoggerTestingModule] });
    service = TestBed.inject(IndexedDBService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

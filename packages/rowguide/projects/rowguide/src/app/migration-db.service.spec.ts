import { TestBed } from '@angular/core/testing';

import { MigrationDbService } from './migration-db.service';
import { LoggerTestingModule } from 'ngx-logger/testing';

describe('MigrationDbService', () => {
  let service: MigrationDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LoggerTestingModule] });
    service = TestBed.inject(MigrationDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

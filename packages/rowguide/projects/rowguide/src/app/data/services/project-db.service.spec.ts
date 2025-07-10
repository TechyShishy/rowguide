import { TestBed } from '@angular/core/testing';

import { ProjectDbService } from './project-db.service';
import { LoggerTestingModule } from 'ngx-logger/testing';

describe('ProjectDbService', () => {
  let service: ProjectDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LoggerTestingModule] });
    service = TestBed.inject(ProjectDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

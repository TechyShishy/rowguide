import { TestBed } from '@angular/core/testing';

import { ZipperService } from './zipper.service';
import { LoggerTestingModule } from 'ngx-logger/testing';

describe('ZipperService', () => {
  let service: ZipperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
    });
    service = TestBed.inject(ZipperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

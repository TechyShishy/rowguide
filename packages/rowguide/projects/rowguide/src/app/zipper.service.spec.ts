import { TestBed } from '@angular/core/testing';

import { ZipperService } from './zipper.service';

describe('ZipperService', () => {
  let service: ZipperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ZipperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

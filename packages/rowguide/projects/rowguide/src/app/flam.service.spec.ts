import { TestBed } from '@angular/core/testing';

import { FlamService } from './flam.service';

describe('FlamService', () => {
  let service: FlamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FlamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { PdfjslibService } from './pdfjslib.service';

describe('PdfjslibService', () => {
  let service: PdfjslibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfjslibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { BeadtoolPdfService } from './beadtool-pdf.service';

describe('BeadtoolPdfService', () => {
  let service: BeadtoolPdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BeadtoolPdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

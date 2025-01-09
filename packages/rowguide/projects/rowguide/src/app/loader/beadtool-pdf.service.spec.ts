import { TestBed } from '@angular/core/testing';

import { BeadtoolPdfService } from './beadtool-pdf.service';
import { LoggerTestingModule } from 'ngx-logger/testing';

describe('BeadtoolPdfService', () => {
  let service: BeadtoolPdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports:[LoggerTestingModule]});
    service = TestBed.inject(BeadtoolPdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

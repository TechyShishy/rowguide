import { TestBed } from '@angular/core/testing';

import { C2ccrochetShorthandService } from './c2ccrochet-shorthand.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ErrorHandlerService } from '../../../core/services';

describe('C2ccrochetShorthandService', () => {
  let service: C2ccrochetShorthandService;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
    ]);

    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [{ provide: ErrorHandlerService, useValue: errorHandlerSpy }],
    });
    service = TestBed.inject(C2ccrochetShorthandService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load a project', () => {
    const projectString = `ROW 23: ↗ 23 squares
1xGy, 4xBk, 1xWh, 1xBk, 2xWh, 1xBk, 13xGy
ROW 24: ↙ 24 squares
14xGy, 1xBk, 3xWh, 3xBk, 1xWh, 1xBk, 1xGy
ROW 25: ↗ 25 squares
1xGy, 1xBk, 2xWh, 2xBk, 3xWh, 1xBk, 15xGy
ROW 26: ↙ 26 squares
16xGy, 1xBk, 2xWh, 3xBk, 1xWh, 2xBk, 1xGy
ROW 27: ↗ 27 squares
1xGy, 3xBk, 2xWh, 4xBk, 17xGy
ROW 28: ↙ 28 squares
18xGy, 3xBk, 3xWh, 3xBk, 1xGy
ROW 29: ↗ 29 squares
1xGy, 1xBk, 1xWh, 1xBk, 1xWh, 1xBk, 2xWh, 2xBk, 19xGy`;

    // Mock successful parsing (no errors expected for valid pattern)

    const project = service.loadProject(projectString);
    //console.log(project.rows[0].steps);
    expect(project).toBeTruthy();

    // Verify ErrorHandlerService was not called for successful parsing
    expect(errorHandlerSpy.handleError).not.toHaveBeenCalled();
  });

  it('should handle parsing errors with structured context', () => {
    const invalidPatternText =
      'Invalid pattern format without proper structure';

    // Mock ErrorHandlerService to return a default project
    errorHandlerSpy.handleError.and.returnValue();

    const result = service.loadProject(invalidPatternText);

    // Verify ErrorHandlerService was called with structured context
    expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
      jasmine.any(Error),
      jasmine.objectContaining({
        operation: 'loadProject',
        service: 'C2ccrochetShorthandService',
        details: 'Failed to parse C2C crochet shorthand pattern',
        context: jasmine.objectContaining({
          inputLength: invalidPatternText.length,
          inputType: 'string',
          delimiter: jasmine.any(String),
          parsedRowsCount: 0,
        }),
      }),
      'Failed to parse crochet pattern. Please check the format.',
      'medium'
    );
  });
});

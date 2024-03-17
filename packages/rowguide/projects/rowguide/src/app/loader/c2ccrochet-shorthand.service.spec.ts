import { TestBed } from '@angular/core/testing';

import { C2ccrochetShorthandService } from './c2ccrochet-shorthand.service';
import { LoggerTestingModule } from 'ngx-logger/testing';

describe('C2ccrochetShorthandService', () => {
  let service: C2ccrochetShorthandService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LoggerTestingModule] });
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
    const project = service.loadProject(projectString);
    console.log(project.rows[0].steps);
    expect(project).toBeTruthy();
  });
});

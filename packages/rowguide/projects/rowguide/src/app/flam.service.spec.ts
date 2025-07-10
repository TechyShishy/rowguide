import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { FlamService } from './flam.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from './project.service';
import { Step } from './step';
import { Row } from './row';
import { routes } from './app.routes';
import { provideRouter } from '@angular/router';

describe('FlamService', () => {
  let service: FlamService;
  let projectService: ProjectService;
  let rows: Row[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [provideRouter(routes)],
    }).compileComponents();

    rows = [
      {
        id: 1,
        steps: [
          { id: 1, count: 1, description: 'Step A' },
          { id: 2, count: 1, description: 'Step B' },
        ],
      },
      {
        id: 2,
        steps: [
          { id: 1, count: 2, description: 'Step A' },
          { id: 2, count: 1, description: 'Step B' },
        ],
      },
      {
        id: 3,
        steps: [
          { id: 1, count: 4, description: 'Step A' },
          { id: 2, count: 1, description: 'Step C' },
        ],
      },
    ];
    service = TestBed.inject(FlamService);
    projectService = TestBed.inject(ProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize FLAM correctly', () => {
    service.flam$.next(service.generateFLAM(rows));
    expect(Object.keys(service.flam$.value).length).toBe(3);
    expect(service.flam$.value['Step A'].firstAppearance).toEqual([0, 0]);
    expect(service.flam$.value['Step A'].lastAppearance).toEqual([2, 0]);
    expect(service.flam$.value['Step B'].firstAppearance).toEqual([0, 1]);
    expect(service.flam$.value['Step B'].lastAppearance).toEqual([1, 1]);
    expect(service.flam$.value['Step C'].firstAppearance).toEqual([2, 1]);
    expect(service.flam$.value['Step C'].lastAppearance).toEqual([2, 1]);
  });

  it('should identify the first step correctly', async () => {
    service.flam$.next(service.generateFLAM(rows));
    const step: Step = { id: 1, count: 1, description: 'Step A' };
    expect(await firstValueFrom(service.isFirstStep(0, step))).toBeTrue();
    expect(await firstValueFrom(service.isFirstStep(1, step))).toBeFalse();
  });

  it('should identify the last step correctly', async () => {
    service.flam$.next(service.generateFLAM(rows));
    const step: Step = { id: 1, count: 1, description: 'Step A' };
    expect(await firstValueFrom(service.isLastStep(2, step))).toBeTrue();
    expect(await firstValueFrom(service.isLastStep(0, step))).toBeFalse();
  });
});

import { TestBed } from '@angular/core/testing';

import { FlamService } from './flam.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from './project.service';
import { Project } from './project';
import { Step } from './step';
import { FLAM } from './flam';

describe('FlamService', () => {
  let service: FlamService;
  let projectService: ProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        FlamService,
        {
          provide: ProjectService,
          useValue: {
            project: {
              rows: [
                {
                  steps: [
                    { id: 1, count: 1, description: 'Step A' },
                    { id: 2, count: 1, description: 'Step B' },
                  ],
                },
                {
                  steps: [
                    { id: 1, count: 2, description: 'Step A' },
                    { id: 2, count: 1, description: 'Step B' },
                  ],
                },
                {
                  steps: [
                    { id: 1, count: 4, description: 'Step A' },
                    { id: 2, count: 1, description: 'Step C' },
                  ],
                },
              ],
            },
          },
        },
      ],
    }).compileComponents();
    service = TestBed.inject(FlamService);
    projectService = TestBed.inject(ProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize FLAM correctly', () => {
    service.inititalizeFLAM();
    expect(Object.keys(service.flam).length).toBe(3);
    expect(service.flam['Step A'].firstAppearance).toEqual([0, 0]);
    expect(service.flam['Step A'].lastAppearance).toEqual([2, 0]);
    expect(service.flam['Step B'].firstAppearance).toEqual([0, 1]);
    expect(service.flam['Step B'].lastAppearance).toEqual([1, 1]);
    expect(service.flam['Step C'].firstAppearance).toEqual([2, 1]);
    expect(service.flam['Step C'].lastAppearance).toEqual([2, 1]);
  });

  it('should identify the first step correctly', () => {
    service.inititalizeFLAM();
    const step: Step = { id: 1, count: 1, description: 'Step A' };
    expect(service.isFirstStep(0, step)).toBeTrue();
    expect(service.isFirstStep(1, step)).toBeFalse();
  });

  it('should identify the last step correctly', () => {
    service.inititalizeFLAM();
    const step: Step = { id: 1, count: 1, description: 'Step A' };
    expect(service.isLastStep(2, step)).toBeTrue();
    expect(service.isLastStep(0, step)).toBeFalse();
  });
});

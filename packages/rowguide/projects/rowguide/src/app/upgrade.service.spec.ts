import { TestBed } from '@angular/core/testing';

import { UpgradeService } from './upgrade.service';
import { MigrationDbService } from './migration-db.service';
import { ProjectDbService } from './project-db.service';
import { PeyoteShorthandService } from './loader/peyote-shorthand.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { Project } from './project';
import { Step } from './step';
import { Row } from './row';

describe('UpgradeService', () => {
  let service: UpgradeService;
  let indexedDBServiceSpy: jasmine.SpyObj<ProjectDbService>;
  let peyoteShorthandServiceSpy: jasmine.SpyObj<PeyoteShorthandService>;
  let migrationDbServiceSpy: jasmine.SpyObj<MigrationDbService>;

  let mockProjects: Project[];

  beforeEach(() => {
    indexedDBServiceSpy = jasmine.createSpyObj('IndexedDBService', [
      'loadProjects',
      'updateProject',
    ]);
    migrationDbServiceSpy = jasmine.createSpyObj('MigrationDbService', [
      'loadMigration',
      'addMigration',
    ]);

    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        { provide: ProjectDbService, useValue: indexedDBServiceSpy },
        { provide: MigrationDbService, useValue: migrationDbServiceSpy },
      ],
    });
    migrationDbServiceSpy.loadMigration.and.returnValue(Promise.resolve(true));
    migrationDbServiceSpy.addMigration.and.stub();
    service = TestBed.inject(UpgradeService);
    spyOn(service, 'applyMigration').and.stub();

    mockProjects = [
      {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, description: 'step1', count: 2 } as Step,
              { id: 2, description: 'step2', count: 3 } as Step,
              { id: 3, description: 'step3', count: 2 } as Step,
              { id: 4, description: 'step4', count: 1 } as Step,
            ],
          } as Row,
          {
            id: 2,
            steps: [
              { id: 1, description: 'step1', count: 2 } as Step,
              { id: 2, description: 'step2', count: 2 } as Step,
            ],
          } as Row,
        ],
      } as Project,
      {
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, description: 'step1', count: 2 } as Step,
              { id: 2, description: 'step2', count: 3 } as Step,
              { id: 3, description: 'step3', count: 1 } as Step,
              { id: 4, description: 'step4', count: 1 } as Step,
            ],
          } as Row,
          {
            id: 2,
            steps: [
              { id: 1, description: 'step1', count: 2 } as Step,
              { id: 2, description: 'step2', count: 2 } as Step,
            ],
          } as Row,
        ],
      } as Project,
    ];
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect new migrations correctly', async () => {
    migrationDbServiceSpy.loadMigration.and.returnValue(
      Promise.resolve(undefined)
    );

    await service.doNewMigrations();

    expect(service.applyMigration).toHaveBeenCalledWith(1);
    expect(migrationDbServiceSpy.addMigration).toHaveBeenCalledWith(1, true);
  });

  it('should apply migration1 correctly for single projects', async () => {
    indexedDBServiceSpy.loadProjects.and.returnValue(
      Promise.resolve([mockProjects[0]])
    );

    await service.migration1();

    expect(indexedDBServiceSpy.updateProject).toHaveBeenCalledWith({
      rows: [
        {
          id: 1,
          steps: [
            { id: 1, description: 'step1', count: 1 } as Step,
            { id: 2, description: 'step2', count: 2 } as Step,
            { id: 3, description: 'step3', count: 1 } as Step,
          ],
        } as Row,
        {
          id: 2,
          steps: [
            { id: 1, description: 'step1', count: 1 } as Step,
            { id: 2, description: 'step2', count: 1 } as Step,
            { id: 3, description: 'step3', count: 1 } as Step,
            { id: 4, description: 'step4', count: 1 } as Step,
          ],
        } as Row,
        {
          id: 3,
          steps: [
            { id: 1, description: 'step1', count: 2 } as Step,
            { id: 2, description: 'step2', count: 2 } as Step,
          ],
        } as Row,
      ],
    } as Project);
  });

  it("should not apply migration1 if the condition isn't satisfied", async () => {
    indexedDBServiceSpy.loadProjects.and.returnValue(
      Promise.resolve([mockProjects[1]])
    );

    await service.migration1();

    expect(indexedDBServiceSpy.updateProject).not.toHaveBeenCalled();
  });

  it('should apply migration1 correctly for multiple projects', async () => {
    indexedDBServiceSpy.loadProjects.and.returnValue(
      Promise.resolve(mockProjects)
    );

    await service.migration1();

    expect(indexedDBServiceSpy.updateProject).toHaveBeenCalledWith({
      rows: [
        {
          id: 1,
          steps: [
            { id: 1, description: 'step1', count: 1 } as Step,
            { id: 2, description: 'step2', count: 2 } as Step,
            { id: 3, description: 'step3', count: 1 } as Step,
          ],
        } as Row,
        {
          id: 2,
          steps: [
            { id: 1, description: 'step1', count: 1 } as Step,
            { id: 2, description: 'step2', count: 1 } as Step,
            { id: 3, description: 'step3', count: 1 } as Step,
            { id: 4, description: 'step4', count: 1 } as Step,
          ],
        } as Row,
        {
          id: 3,
          steps: [
            { id: 1, description: 'step1', count: 2 } as Step,
            { id: 2, description: 'step2', count: 2 } as Step,
          ],
        } as Row,
      ],
    } as Project);

    expect(indexedDBServiceSpy.updateProject).toHaveBeenCalledTimes(1);
  });
});

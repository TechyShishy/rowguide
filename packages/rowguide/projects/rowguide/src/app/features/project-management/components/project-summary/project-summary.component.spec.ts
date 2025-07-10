import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectSummaryComponent } from './project-summary.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../../../app.routes';

describe('ProjectSummaryComponent', () => {
  let component: ProjectSummaryComponent;
  let fixture: ComponentFixture<ProjectSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProjectSummaryComponent,
        BrowserAnimationsModule,
        LoggerTestingModule,
      ],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectSummaryComponent);
    component = fixture.componentInstance;

    // Mock the project data
    component.project = { rows: [], name: 'Mock Project' };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have project name defined', () => {
    expect(component.project.name).toBe('Mock Project');
  });
});

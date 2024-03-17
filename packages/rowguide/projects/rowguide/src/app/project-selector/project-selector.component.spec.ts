import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectSelectorComponent } from './project-selector.component';
import { LoggerTestingModule } from 'ngx-logger/testing';

describe('ProjectSelectorComponent', () => {
  let component: ProjectSelectorComponent;
  let fixture: ComponentFixture<ProjectSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectSelectorComponent, LoggerTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectSelectorComponent);
    component = fixture.componentInstance;
    //fixture.detectChanges();
  });

  it('should create', () => {
    expect(true);
    expect(component).toBeTruthy();
  });
});

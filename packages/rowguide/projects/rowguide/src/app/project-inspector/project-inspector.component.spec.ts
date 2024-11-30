import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectInspectorComponent } from './project-inspector.component';

describe('ProjectInspectorComponent', () => {
  let component: ProjectInspectorComponent;
  let fixture: ComponentFixture<ProjectInspectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectInspectorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProjectInspectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

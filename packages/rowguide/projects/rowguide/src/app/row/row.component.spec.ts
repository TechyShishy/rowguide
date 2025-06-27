import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RowComponent } from './row.component';
import { LoggerTestingModule, NGXLoggerMock } from 'ngx-logger/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NGXLogger } from 'ngx-logger';
import { MatExpansionPanel } from '@angular/material/expansion';
import { QueryList } from '@angular/core';
import { StepComponent } from '../step/step.component';
import { ProjectComponent } from '../project/project.component';
import { Row } from '../row';
import { Step } from '../step';
import { SettingsService } from '../settings.service';

describe('RowComponent', () => {
  let component: RowComponent;
  let fixture: ComponentFixture<RowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RowComponent, LoggerTestingModule, BrowserAnimationsModule],
      providers: [{ provide: NGXLogger, useClass: NGXLoggerMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(RowComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle visibility', () => {
    component.visible = false;
    component.onToggle();
    expect(component.visible).toBeTrue();
    component.onToggle();
    expect(component.visible).toBeFalse();
  });

  it('should handle panel expand', () => {
    spyOn(component as any, 'setFirstStepAsCurrent');
    component.markFirstStep = true;
    const mockStepComponent = jasmine.createSpyObj('StepComponent', ['step']);
    mockStepComponent.beadCount = 0; // Ensure beadCount is 0
    component.children = new QueryList<StepComponent>();
    component.children.reset([mockStepComponent]);

    component['handlePanelExpand']();

    expect(component['setFirstStepAsCurrent']).toHaveBeenCalled();
  });

  it('should scroll to previous row', () => {
    const mockProjectComponent = jasmine.createSpyObj('ProjectComponent', [
      'children',
    ]);
    const mockElementRef = {
      nativeElement: { scrollIntoView: jasmine.createSpy('scrollIntoView') },
    };
    const prevRow = { ref: mockElementRef } as any;

    // Mock the children property as a Map
    Object.defineProperty(mockProjectComponent, 'children', {
      value: new Map<number, any>([[0, prevRow]]),
    });

    component.project = mockProjectComponent;
    component.index = 1;

    component['scrollToPreviousRow']();

    expect(mockElementRef.nativeElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });
});


/**
 * Step Component Integration Test
 * 
 * Validates step component integration behavior including current class
 * application and complete component interaction flow.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement, ChangeDetectorRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';

import { StepComponent } from './step.component';
import { Step } from '../../../../core/models/step';
import { Row } from '../../../../core/models/row';
import { ModelFactory } from '../../../../core/models/model-factory';
import { FlamService } from '../../../../core/services/flam.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { MarkModeService } from '../../../../core/services/mark-mode.service';
import { ProjectService } from '../../../project-management/services/project.service';

@Component({
  template: `
    <app-step 
      [step]="testStep" 
      [index]="0" 
      [row]="mockRow">
    </app-step>
  `,
  standalone: true,
  imports: [StepComponent]
})
class TestHostComponent {
  testStep: Step = ModelFactory.createStep({
    id: 1,
    description: 'Test',
    count: 5
  });
  mockRow = {
    index: 0,
    project: {
      currentStep$: new BehaviorSubject<StepComponent | null>(null)
    }
  } as any;
}

describe('StepComponent Integration', () => {
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;
  let stepComponent: StepComponent;
  let stepElement: HTMLElement;

  beforeEach(async () => {
    // Create mock services
    const mockLogger = {
      debug: jasmine.createSpy('debug'),
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    const mockFlamService = {
      getFirstLastAppearanceMap: jasmine.createSpy('getFirstLastAppearanceMap').and.returnValue(new Map()),
      isFirstStep: jasmine.createSpy('isFirstStep').and.returnValue(new BehaviorSubject(false)),
      isLastStep: jasmine.createSpy('isLastStep').and.returnValue(new BehaviorSubject(false))
    };

    const mockSettingsService = {
      settings$: new BehaviorSubject({ combine12: false }),
      flammarkers$: new BehaviorSubject(true),
      zoom$: new BehaviorSubject(false)
    };

    const mockMarkModeService = {
      canMarkItems: jasmine.createSpy('canMarkItems').and.returnValue(false),
      toggleStepMark: jasmine.createSpy('toggleStepMark'),
      getStepMark$: jasmine.createSpy('getStepMark$').and.returnValue(new BehaviorSubject(0)),
      markModeChanged$: new BehaviorSubject(0)
    };

    const mockProjectService = {
      saveCurrentPosition: jasmine.createSpy('saveCurrentPosition'),
      zippedRows$: new BehaviorSubject([
        { steps: [{ count: 5 }, { count: 3 }, { count: 2 }] },
        { steps: [{ count: 1 }, { count: 4 }] },
      ])
    };

    const mockChangeDetectorRef = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck', 'detectChanges']);

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: NGXLogger, useValue: mockLogger },
        { provide: FlamService, useValue: mockFlamService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: MarkModeService, useValue: mockMarkModeService },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef }
      ]
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    
    // Get the step component and element
    hostFixture.detectChanges();
    stepComponent = hostFixture.debugElement.children[0].componentInstance;
    stepElement = hostFixture.debugElement.children[0].nativeElement;
  });

  // ✅ Canary Test - Basic test environment validation
  it('should compile and render correctly (test environment canary)', () => {
    // Verify basic component creation
    expect(hostComponent).toBeTruthy();
    expect(hostFixture).toBeTruthy();
    expect(stepComponent).toBeTruthy();
    expect(stepElement).toBeTruthy();
    
    // Verify component properties are set
    expect(stepComponent.step).toBeTruthy();
    expect(stepComponent.step.id).toBe(1);
    expect(stepComponent.step.description).toBe('Test');
    expect(stepComponent.step.count).toBe(5);
    expect(stepComponent.index).toBe(0);
    
    // Verify element is rendered
    expect(stepElement.tagName.toLowerCase()).toBe('app-step');
    
    // Verify initial state
    expect(stepComponent.isCurrentStep).toBe(false);
    expect(stepElement.classList.contains('current')).toBe(false);
  });

  it('should apply current class when step is clicked', async () => {
    const stepDebugElement = hostFixture.debugElement.query(By.directive(StepComponent));
    const stepComponent = stepDebugElement.componentInstance;
    const element = stepDebugElement.nativeElement;

    // Simulate step click and await the async operation
    await stepComponent.onClick();

    // The component should have already triggered change detection in onClick()
    // But let's also trigger it from the test to be sure
    hostFixture.detectChanges();

    expect(stepComponent.isCurrentStep).toBe(true);
    expect(element.classList.contains('current')).toBe(true);
  });

  it('should show debugging information on click', () => {
    // Add spy to monitor onClick calls
    spyOn(stepComponent, 'onClick').and.callThrough();
    
    stepElement.click();
    
    expect(stepComponent.onClick).toHaveBeenCalled();
  });
});

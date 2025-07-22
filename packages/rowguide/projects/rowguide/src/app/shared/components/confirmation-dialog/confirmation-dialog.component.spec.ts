import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';

import { ConfirmationDialogComponent, ConfirmationDialogData, ConfirmationResult } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let loader: HarnessLoader;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ConfirmationDialogComponent>>;

  const defaultData: ConfirmationDialogData = {
    title: 'Test Confirmation',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Proceed',
    cancelText: 'Cancel',
    showDontAskAgain: false,
    icon: 'warning'
  };

  beforeEach(async () => {
    // Create spy for dialog reference
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        ConfirmationDialogComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: defaultData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should set default values for optional properties', () => {
      const minimalData: ConfirmationDialogData = {
        title: 'Test',
        message: 'Test message'
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ConfirmationDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: minimalData }
        ]
      });

      const testFixture = TestBed.createComponent(ConfirmationDialogComponent);
      const testComponent = testFixture.componentInstance;

      expect(testComponent.data.confirmText).toBe('Confirm');
      expect(testComponent.data.cancelText).toBe('Cancel');
      expect(testComponent.data.showDontAskAgain).toBe(false);
      expect(testComponent.data.icon).toBe('help_outline');
    });

    it('should initialize dontAskAgain to false', () => {
      expect(component.dontAskAgain).toBe(false);
    });
  });

  describe('Template Rendering', () => {
    it('should display the correct title', () => {
      const titleElement = fixture.nativeElement.querySelector('.title-text');
      expect(titleElement.textContent).toContain('Test Confirmation');
    });

    it('should display the correct message', () => {
      const messageElement = fixture.nativeElement.querySelector('.confirmation-message');
      expect(messageElement.textContent).toContain('Are you sure you want to proceed?');
    });

    it('should display the correct icon', () => {
      const iconElement = fixture.nativeElement.querySelector('.dialog-icon');
      expect(iconElement.textContent.trim()).toBe('warning');
    });

    it('should display custom button text', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const cancelButton = Array.from(buttons).find((btn: any) => btn.classList.contains('cancel-button')) as HTMLButtonElement;
      const confirmButton = Array.from(buttons).find((btn: any) => btn.classList.contains('confirm-button')) as HTMLButtonElement;

      expect(cancelButton?.textContent?.trim()).toBe('Cancel');
      expect(confirmButton?.textContent?.trim()).toBe('Proceed');
    });

    it('should hide checkbox when showDontAskAgain is false', () => {
      const checkboxSection = fixture.nativeElement.querySelector('.dont-ask-again-section');
      expect(checkboxSection).toBeNull();
    });

    it('should show checkbox when showDontAskAgain is true', () => {
      component.data.showDontAskAgain = true;
      fixture.detectChanges();

      const checkboxSection = fixture.nativeElement.querySelector('.dont-ask-again-section');
      expect(checkboxSection).not.toBeNull();
    });
  });

  describe('User Interactions', () => {
    it('should call cancel() when cancel button is clicked', async () => {
      spyOn(component, 'cancel');

      const cancelButton = await loader.getHarness(MatButtonHarness.with({ text: 'Cancel' }));
      await cancelButton.click();

      expect(component.cancel).toHaveBeenCalled();
    });

    it('should call confirm() when confirm button is clicked', async () => {
      spyOn(component, 'confirm');

      const confirmButton = await loader.getHarness(MatButtonHarness.with({ text: 'Proceed' }));
      await confirmButton.click();

      expect(component.confirm).toHaveBeenCalled();
    });

    it('should update dontAskAgain when checkbox is toggled', async () => {
      // Enable checkbox
      component.data.showDontAskAgain = true;
      fixture.detectChanges();

      const checkbox = await loader.getHarness(MatCheckboxHarness);
      await checkbox.check();

      expect(component.dontAskAgain).toBe(true);

      await checkbox.uncheck();
      expect(component.dontAskAgain).toBe(false);
    });
  });

  describe('Dialog Closing', () => {
    it('should close with false result when cancelled', () => {
      component.cancel();

      const expectedResult: ConfirmationResult = {
        result: false,
        dontAskAgain: false
      };

      expect(mockDialogRef.close).toHaveBeenCalledWith(expectedResult);
    });

    it('should close with true result when confirmed', () => {
      component.confirm();

      const expectedResult: ConfirmationResult = {
        result: true,
        dontAskAgain: false
      };

      expect(mockDialogRef.close).toHaveBeenCalledWith(expectedResult);
    });

    it('should include dontAskAgain value in result', () => {
      component.dontAskAgain = true;
      component.confirm();

      const expectedResult: ConfirmationResult = {
        result: true,
        dontAskAgain: true
      };

      expect(mockDialogRef.close).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should call confirm() when Enter key is pressed on confirm button', () => {
      spyOn(component, 'confirm');

      const confirmButton = fixture.nativeElement.querySelector('.confirm-button');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });

      Object.defineProperty(event, 'target', {
        value: confirmButton,
        enumerable: true
      });

      component.onKeyDown(event);

      expect(component.confirm).toHaveBeenCalled();
    });

    it('should NOT call confirm() when Enter key is pressed on cancel button', () => {
      spyOn(component, 'confirm');

      const cancelButton = fixture.nativeElement.querySelector('.cancel-button');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });

      Object.defineProperty(event, 'target', {
        value: cancelButton,
        enumerable: true
      });

      component.onKeyDown(event);

      expect(component.confirm).not.toHaveBeenCalled();
    });

    it('should identify cancel button focus correctly', () => {
      const cancelButton = fixture.nativeElement.querySelector('.cancel-button');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });

      Object.defineProperty(event, 'target', {
        value: cancelButton,
        enumerable: true
      });

      const isCancelFocused = (component as any).isCancelButtonFocused(event);
      expect(isCancelFocused).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const titleElement = fixture.nativeElement.querySelector('.dialog-icon');
      expect(titleElement.getAttribute('aria-label')).toContain('Warning: Test Confirmation');
      expect(titleElement.getAttribute('role')).toBe('img');
    });

    it('should have proper button ARIA labels', () => {
      const cancelButton = fixture.nativeElement.querySelector('.cancel-button');
      const confirmButton = fixture.nativeElement.querySelector('.confirm-button');

      expect(cancelButton.getAttribute('aria-label')).toContain('Cancel test confirmation');
      expect(confirmButton.getAttribute('aria-label')).toContain('Confirm test confirmation action');
    });

    it('should have screen reader support for checkbox section', () => {
      component.data.showDontAskAgain = true;
      fixture.detectChanges();

      const checkboxSection = fixture.nativeElement.querySelector('.dont-ask-again-section');
      const helpText = fixture.nativeElement.querySelector('#dont-ask-again-help');

      expect(checkboxSection.getAttribute('role')).toBe('group');
      expect(helpText).not.toBeNull();
      expect(helpText.textContent).toContain('skip this confirmation dialog');
    });

    it('should have proper focus management attributes', () => {
      const cancelButton = fixture.nativeElement.querySelector('.cancel-button');
      expect(cancelButton.hasAttribute('cdkTrapFocus-autoCapture')).toBe(true);
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom CSS class when provided', () => {
      const customData: ConfirmationDialogData = {
        ...defaultData,
        customClass: 'success-theme'
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ConfirmationDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: customData }
        ]
      });

      const testFixture = TestBed.createComponent(ConfirmationDialogComponent);
      testFixture.detectChanges();

      const dialogElement = testFixture.nativeElement.querySelector('.confirmation-dialog');
      expect(dialogElement.classList.contains('success-theme')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty or undefined icon gracefully', () => {
      const dataWithoutIcon: ConfirmationDialogData = {
        ...defaultData,
        icon: undefined
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ConfirmationDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: dataWithoutIcon }
        ]
      });

      const testFixture = TestBed.createComponent(ConfirmationDialogComponent);
      const testComponent = testFixture.componentInstance;
      testFixture.detectChanges();

      // The component should have set a default icon
      expect(testComponent.data.icon).toBe('help_outline');

      // The icon element should be present with the default
      const iconElement = testFixture.nativeElement.querySelector('.dialog-icon');
      expect(iconElement).not.toBeNull();
      expect(iconElement?.textContent?.trim()).toBe('help_outline');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const dataWithLongMessage: ConfirmationDialogData = {
        ...defaultData,
        message: longMessage
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ConfirmationDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: dataWithLongMessage }
        ]
      });

      const testFixture = TestBed.createComponent(ConfirmationDialogComponent);
      testFixture.detectChanges();

      const messageElement = testFixture.nativeElement.querySelector('.confirmation-message');
      expect(messageElement.textContent).toContain(longMessage);
      expect(messageElement.scrollHeight).toBeGreaterThan(0);
    });
  });
});

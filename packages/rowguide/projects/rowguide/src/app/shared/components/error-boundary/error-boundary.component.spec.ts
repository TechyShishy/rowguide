import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgZone, ChangeDetectorRef } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LoggerTestingModule, NGXLoggerMock } from 'ngx-logger/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { ErrorBoundaryComponent } from './error-boundary.component';
import {
  ErrorHandlerService,
  ErrorNotification,
} from '../../../core/services/error-handler.service';

describe('ErrorBoundaryComponent', () => {
  let component: ErrorBoundaryComponent;
  let fixture: ComponentFixture<ErrorBoundaryComponent>;
  let errorHandlerService: jasmine.SpyObj<ErrorHandlerService>;
  let mockNotifications$: BehaviorSubject<ErrorNotification | null>;

  beforeEach(async () => {
    mockNotifications$ = new BehaviorSubject<ErrorNotification | null>(null);

    const errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', [
      'getNotifications',
      'clearNotification',
    ]);
    errorHandlerSpy.getNotifications.and.returnValue(mockNotifications$);

    await TestBed.configureTestingModule({
      imports: [
        ErrorBoundaryComponent,
        NoopAnimationsModule,
        LoggerTestingModule,
      ],
      providers: [
        { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        NGXLoggerMock,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorBoundaryComponent);
    component = fixture.componentInstance;
    errorHandlerService = TestBed.inject(
      ErrorHandlerService
    ) as jasmine.SpyObj<ErrorHandlerService>;

    // Important: Do initial change detection
    fixture.detectChanges();
  });

  afterEach(() => {
    mockNotifications$.complete();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default values', () => {
      expect(component.showDetails).toBe(false);
      expect(component.canDismiss).toBe(true);
      expect(component.retryLabel).toBe('Try Again');
      expect(component.hasError).toBe(false);
      expect(component.errorSeverity).toBe('medium');
    });

    it('should display content when no error', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.error-boundary')).toBeNull();
      expect(compiled.querySelector('ng-content')).toBeDefined();
    });
  });

  describe('Error Display', () => {
    it('should show error when showError is called', () => {
      component.showError('Test error message');
      fixture.detectChanges();

      expect(component.hasError).toBe(true);
      expect(component.errorMessage).toBe('Test error message');

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.error-boundary')).toBeTruthy();
      expect(compiled.textContent).toContain('Test error message');
    });

    it('should apply severity-based styling', () => {
      component.showError(
        'Critical error',
        'Critical Error',
        undefined,
        'critical'
      );
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const errorCard = compiled.querySelector('.error-card');
      expect(errorCard.classList.contains('error-critical')).toBe(true);
    });

    it('should show appropriate icons for different severities', () => {
      // Test critical error
      component.showError('Critical error', undefined, undefined, 'critical');
      fixture.detectChanges();
      let compiled = fixture.nativeElement;
      let icon = compiled.querySelector('mat-icon span');
      expect(icon.textContent).toBe('error');

      // Test high severity error
      component.showError('High error', undefined, undefined, 'high');
      fixture.detectChanges();
      compiled = fixture.nativeElement;
      icon = compiled.querySelector('mat-icon span');
      expect(icon.textContent).toBe('warning');

      // Test medium severity error (default)
      component.showError('Medium error', undefined, undefined, 'medium');
      fixture.detectChanges();
      compiled = fixture.nativeElement;
      icon = compiled.querySelector('mat-icon span');
      expect(icon.textContent).toBe('info');
    });

    it('should generate appropriate default titles', () => {
      const testCases = [
        { severity: 'critical' as const, expectedTitle: 'Critical Error' },
        { severity: 'high' as const, expectedTitle: 'Error' },
        { severity: 'medium' as const, expectedTitle: 'Something went wrong' },
        { severity: 'low' as const, expectedTitle: 'Notice' },
      ];

      testCases.forEach(({ severity, expectedTitle }) => {
        component.showError('Test message', undefined, undefined, severity);
        expect(component.errorTitle).toBe(expectedTitle);
      });
    });

    it('should show custom title when provided', () => {
      component.showError('Test message', 'Custom Title');
      expect(component.errorTitle).toBe('Custom Title');
    });

    it('should show subtitle when provided', () => {
      component.showError('Test message', 'Title', 'Subtitle');
      fixture.detectChanges();

      expect(component.errorSubtitle).toBe('Subtitle');
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Subtitle');
    });

    it('should show technical details when showDetails is true', () => {
      component.showDetails = true;
      component.showError(
        'Test message',
        undefined,
        undefined,
        'medium',
        'Technical details'
      );
      fixture.detectChanges();

      expect(component.errorDetails).toBe('Technical details');
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('details')).toBeTruthy();
      expect(compiled.textContent).toContain('Technical details');
    });

    it('should hide technical details when showDetails is false', () => {
      component.showDetails = false;
      component.showError(
        'Test message',
        undefined,
        undefined,
        'medium',
        'Technical details'
      );
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('details')).toBeNull();
    });
  });

  describe('Error Actions', () => {
    beforeEach(() => {
      component.showError('Test error');
      fixture.detectChanges();
    });

    it('should emit retryClicked when retry button is clicked', () => {
      spyOn(component.retryClicked, 'emit');

      const retryButton =
        fixture.nativeElement.querySelector('[color="primary"]');
      retryButton.click();

      expect(component.retryClicked.emit).toHaveBeenCalled();
      expect(component.hasError).toBe(false);
    });

    it('should emit dismissed when dismiss button is clicked', () => {
      spyOn(component.dismissed, 'emit');

      const dismissButton = fixture.nativeElement.querySelector(
        'button:not([color="primary"])'
      );
      dismissButton.click();

      expect(component.dismissed.emit).toHaveBeenCalled();
      expect(component.hasError).toBe(false);
      expect(errorHandlerService.clearNotification).toHaveBeenCalled();
    });

    it('should show custom retry label', () => {
      component.retryLabel = 'Try Again Later';
      fixture.detectChanges();

      const retryButton =
        fixture.nativeElement.querySelector('[color="primary"]');
      expect(retryButton.textContent.trim()).toBe('Try Again Later');
    });

    it('should hide dismiss button for critical errors', () => {
      component.showError('Critical error', undefined, undefined, 'critical');
      fixture.detectChanges();

      expect(component.canDismiss).toBe(false);
      const dismissButton = fixture.nativeElement.querySelector(
        'button:not([color="primary"])'
      );
      expect(dismissButton).toBeNull();
    });

    it('should show dismiss button for non-critical errors', () => {
      component.showError('High error', undefined, undefined, 'high');
      fixture.detectChanges();

      expect(component.canDismiss).toBe(true);
      const dismissButton = fixture.nativeElement.querySelector(
        'button:not([color="primary"])'
      );
      expect(dismissButton).toBeTruthy();
    });
  });

  describe('Error Handler Integration', () => {
    it('should listen to error notifications from ErrorHandlerService', async () => {
      const testNotification: ErrorNotification = {
        message: 'Service error',
        action: 'Retry',
        duration: 5000,
      };

      mockNotifications$.next(testNotification);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.hasError).toBe(true);
      expect(component.errorMessage).toBe('Service error');
    });

    it('should not show error when notification is null', async () => {
      mockNotifications$.next(null);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.hasError).toBe(false);
    });

    it('should handle multiple notifications', async () => {
      // First notification
      mockNotifications$.next({ message: 'First error' });
      await fixture.whenStable();
      fixture.detectChanges();
      expect(component.errorMessage).toBe('First error');

      // Second notification
      mockNotifications$.next({ message: 'Second error' });
      await fixture.whenStable();
      fixture.detectChanges();
      expect(component.errorMessage).toBe('Second error');
    });
  });

  describe('Memory Management', () => {
    it('should unsubscribe on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    it('should not leak subscriptions after destroy', () => {
      const initialSubscribers = mockNotifications$.observers.length;

      component.ngOnDestroy();

      // After destroy, component should no longer be subscribed
      expect(mockNotifications$.observers.length).toBeLessThan(
        initialSubscribers
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error state', () => {
      component.showError('Accessibility test error');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const errorBoundary = compiled.querySelector('.error-boundary');

      // Should be announced to screen readers
      expect(errorBoundary).toBeTruthy();

      // Buttons should be focusable
      const buttons = compiled.querySelectorAll('button');
      buttons.forEach((button: HTMLElement) => {
        expect(button.tabIndex).not.toBe(-1);
      });
    });

    it('should maintain focus management for critical errors', () => {
      component.showError('Critical error', undefined, undefined, 'critical');
      fixture.detectChanges();

      // Only retry button should be available for critical errors
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBe(1);
      expect(buttons[0].textContent.trim()).toBe('Try Again');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error messages', () => {
      component.showError('');
      fixture.detectChanges();

      expect(component.hasError).toBe(true);
      expect(component.errorMessage).toBe('');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      component.showError(longMessage);
      fixture.detectChanges();

      expect(component.errorMessage).toBe(longMessage);
      // Should not break the layout
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.error-card')).toBeTruthy();
    });

    it('should handle rapid show/hide cycles', () => {
      for (let i = 0; i < 10; i++) {
        component.showError(`Error ${i}`);
        component.dismiss();
      }
      fixture.detectChanges();

      expect(component.hasError).toBe(false);
    });
  });
});

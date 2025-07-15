import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { firstValueFrom } from 'rxjs';

import {
  ErrorHandlerService,
  AppError,
  ErrorNotification,
} from './error-handler.service';
import { DataIntegrityService } from './data-integrity.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;
  let dataIntegritySpy: jasmine.SpyObj<DataIntegrityService>;

  beforeEach(() => {
    const loggerSpyObj = jasmine.createSpyObj('NGXLogger', [
      'error',
      'warn',
      'info',
    ]);

    const dataIntegritySpyObj = jasmine.createSpyObj('DataIntegrityService', [
      'validateProjectName',
      'getRecentEvents',
    ]);

    // Set up DataIntegrityService mock defaults
    dataIntegritySpyObj.validateProjectName.and.returnValue({
      isValid: true,
      cleanValue: 'test-input',
      originalValue: 'test-input',
      issues: [],
    });
    dataIntegritySpyObj.getRecentEvents.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: NGXLogger, useValue: loggerSpyObj },
        { provide: DataIntegrityService, useValue: dataIntegritySpyObj },
      ],
    });

    service = TestBed.inject(ErrorHandlerService);
    loggerSpy = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
    dataIntegritySpy = TestBed.inject(DataIntegrityService) as jasmine.SpyObj<DataIntegrityService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleError', () => {
    it('should handle Error objects correctly', async () => {
      const testError = new Error('Test error message');
      const context = 'test context';
      const userMessage = 'User friendly message';

      service.handleError(testError, context, userMessage, 'medium');

      // Verify logging
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Application Error',
        jasmine.objectContaining({
          error: jasmine.objectContaining({
            message: 'Test error message',
            context: 'test context',
            severity: 'medium',
          }),
          originalError: testError,
          stack: testError.stack,
        })
      );

      // Verify error storage
      const errors = await firstValueFrom(service.getErrors());
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Test error message');
      expect(errors[0].context).toBe(context);
      expect(errors[0].severity).toBe('medium');

      // Verify notification
      const notification = await firstValueFrom(service.getNotifications());
      expect(notification).toEqual({
        message: userMessage,
        action: 'Dismiss',
        duration: 5000,
      });
    });

    it('should handle string errors correctly', async () => {
      const testError = 'String error message';

      service.handleError(testError, undefined, undefined, 'low');

      const errors = await firstValueFrom(service.getErrors());
      expect(errors[0].message).toBe('String error message');
    });

    it('should handle unknown error types', async () => {
      const testError = { someProperty: 'value' };

      service.handleError(testError);

      const errors = await firstValueFrom(service.getErrors());
      expect(errors[0].message).toBe('Unknown error occurred');
    });

    it('should handle critical errors with special treatment', async () => {
      const testError = new Error('Critical error');

      service.handleError(
        testError,
        'critical context',
        'Critical user message',
        'critical'
      );

      // Verify critical error notification
      const notification = await firstValueFrom(service.getNotifications());
      expect(notification).toEqual({
        message: 'Critical user message',
        action: 'Reload Page',
        duration: 0,
      });

      // Verify critical error reporting via NGXLogger
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Critical Error Reported:',
        jasmine.any(Object)
      );
    });

    it('should show notification for high severity errors without user message', async () => {
      const testError = new Error('High severity error');

      service.handleError(testError, 'context', undefined, 'high');

      const notification = await firstValueFrom(service.getNotifications());
      expect(notification).toEqual({
        message: 'An unexpected error occurred. Please try again.',
        action: 'Dismiss',
        duration: 5000,
      });
    });

    it('should not show notification for low severity errors without user message', async () => {
      const testError = new Error('Low severity error');

      service.handleError(testError, 'context', undefined, 'low');

      const notification = await firstValueFrom(service.getNotifications());
      expect(notification).toBeNull();
    });

    it('should generate unique error IDs', async () => {
      service.handleError(new Error('Error 1'));
      service.handleError(new Error('Error 2'));

      const errors = await firstValueFrom(service.getErrors());
      expect(errors.length).toBe(2);
      expect(errors[0].id).not.toBe(errors[1].id);
      expect(errors[0].id).toMatch(/^error-\d+-[a-z0-9]+$/);
    });

    it('should limit stored errors to 50', async () => {
      // Add 55 errors to test memory management
      for (let i = 0; i < 55; i++) {
        service.handleError(new Error(`Error ${i}`));
      }

      const errors = await firstValueFrom(service.getErrors());
      expect(errors.length).toBe(50);
      expect(errors[0].message).toBe('Error 54'); // Most recent first
      expect(errors[49].message).toBe('Error 5'); // Oldest kept
    });
  });

  describe('specialized error handlers', () => {
    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');

      service.handleDatabaseError(dbError, 'save project');

      expect(loggerSpy.error).toHaveBeenCalled();

      const errors = await firstValueFrom(service.getErrors());
      expect(errors[0].context).toBe('Database operation: save project');
      expect(errors[0].severity).toBe('high');

      const notification = await firstValueFrom(service.getNotifications());
      expect(notification?.message).toContain('Unable to save your changes');
    });

    it('should handle file processing errors', async () => {
      const fileError = new Error('Failed to parse PDF');
      const filename = 'pattern.pdf';

      service.handleFileProcessingError(fileError, filename);

      const errors = await firstValueFrom(service.getErrors());
      expect(errors[0].context).toBe(`File processing: ${filename}`);
      expect(errors[0].severity).toBe('medium');

      const notification = await firstValueFrom(service.getNotifications());
      expect(notification?.message).toContain(
        'Unable to process the selected file'
      );
    });

    it('should handle validation errors with single error', async () => {
      const validationErrors = ['Name is required'];

      service.handleValidationError(validationErrors, 'user form');

      const errors = await firstValueFrom(service.getErrors());
      expect(errors[0].message).toBe('Name is required');
      expect(errors[0].context).toBe('Validation: user form');
      expect(errors[0].severity).toBe('low');
    });

    it('should handle validation errors with multiple errors', async () => {
      const validationErrors = [
        'Name is required',
        'Email is invalid',
        'Password too short',
      ];

      service.handleValidationError(validationErrors);

      const errors = await firstValueFrom(service.getErrors());
      expect(errors[0].message).toBe(
        'Multiple validation errors: Name is required, Email is invalid, Password too short'
      );
    });
  });

  describe('notification management', () => {
    it('should clear notifications', async () => {
      service.handleError(new Error('Test'), 'context', 'User message', 'high');

      let notification = await firstValueFrom(service.getNotifications());
      expect(notification).not.toBeNull();

      service.clearNotification();

      notification = await firstValueFrom(service.getNotifications());
      expect(notification).toBeNull();
    });

    it('should handle multiple notifications correctly', async () => {
      service.handleError(new Error('Error 1'), 'context', 'Message 1', 'high');

      let notification = await firstValueFrom(service.getNotifications());
      expect(notification?.message).toBe('Message 1');

      service.handleError(
        new Error('Error 2'),
        'context',
        'Message 2',
        'critical'
      );

      notification = await firstValueFrom(service.getNotifications());
      expect(notification?.message).toBe('Message 2'); // Latest notification
    });
  });

  describe('error storage and retrieval', () => {
    it('should maintain error chronological order (newest first)', async () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      service.handleError(error1);
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));
      service.handleError(error2);

      const errors = await firstValueFrom(service.getErrors());
      expect(errors[0].message).toBe('Second error');
      expect(errors[1].message).toBe('First error');
      expect(errors[0].timestamp.getTime()).toBeGreaterThan(
        errors[1].timestamp.getTime()
      );
    });

    it('should include all required error properties', async () => {
      const testError = new Error('Complete error test');

      service.handleError(testError, 'test context', 'user message', 'medium');

      const errors = await firstValueFrom(service.getErrors());
      const error = errors[0];

      expect(error.id).toBeDefined();
      expect(error.message).toBe('Complete error test');
      expect(error.context).toBe('test context');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.severity).toBe('medium');
    });
  });

  describe('error scenarios and edge cases', () => {
    it('should handle null and undefined errors gracefully', async () => {
      service.handleError(null);
      service.handleError(undefined);

      const errors = await firstValueFrom(service.getErrors());
      expect(errors.length).toBe(2);
      expect(errors[0].message).toBe('Unknown error occurred');
      expect(errors[1].message).toBe('Unknown error occurred');
    });

    it('should handle errors without stack traces', async () => {
      const errorWithoutStack = { message: 'Error without stack' };

      service.handleError(errorWithoutStack);

      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Application Error',
        jasmine.objectContaining({
          stack: undefined,
        })
      );
    });

    it('should handle very long error messages', async () => {
      const longMessage = 'A'.repeat(10000); // 10KB error message
      const longError = new Error(longMessage);

      service.handleError(longError);

      const errors = await firstValueFrom(service.getErrors());
      expect(errors[0].message).toBe(longMessage);
    });

    it('should handle rapid error succession', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve(service.handleError(new Error(`Rapid error ${i}`)))
        );
      }

      await Promise.all(promises);

      const errors = await firstValueFrom(service.getErrors());
      expect(errors.length).toBe(10);
    });
  });

  describe('integration scenarios', () => {
    it('should work correctly with real-world error patterns', async () => {
      // Simulate typical application error flow

      // 1. File processing error
      service.handleFileProcessingError(
        new Error('Failed to parse PDF'),
        'pattern.pdf'
      );

      // 2. Validation error
      service.handleValidationError(
        ['Project name required'],
        'create project'
      );

      // 3. Database error
      service.handleDatabaseError(new Error('Transaction failed'), 'save data');

      // 4. Critical system error
      service.handleError(
        new Error('Out of memory'),
        'system',
        'Application needs to restart',
        'critical'
      );

      const errors = await firstValueFrom(service.getErrors());
      expect(errors.length).toBe(4);

      // Verify severity distribution
      expect(errors.filter((e) => e.severity === 'critical').length).toBe(1);
      expect(errors.filter((e) => e.severity === 'high').length).toBe(1);
      expect(errors.filter((e) => e.severity === 'medium').length).toBe(1);
      expect(errors.filter((e) => e.severity === 'low').length).toBe(1);
    });
  });
});

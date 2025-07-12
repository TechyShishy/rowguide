/**
 * Test suite for DataIntegrityService
 *
 * Tests pragmatic data integrity validation appropriate for
 * single-user local deployment without unnecessary web security overhead.
 */

import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import {
  DataIntegrityService,
  DataIntegrityEventType,
  ValidationResult,
} from './data-integrity.service';

describe('DataIntegrityService', () => {
  let service: DataIntegrityService;
  let mockLogger: jasmine.SpyObj<NGXLogger>;

  beforeEach(() => {
    const loggerSpy = jasmine.createSpyObj('NGXLogger', [
      'info',
      'warn',
      'error',
      'debug',
    ]);

    TestBed.configureTestingModule({
      providers: [
        DataIntegrityService,
        { provide: NGXLogger, useValue: loggerSpy },
      ],
    });

    service = TestBed.inject(DataIntegrityService);
    mockLogger = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
  });

  describe('Service Initialization', () => {
    it('should be created with default configuration', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with data integrity logging', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Data integrity service initialized for local deployment',
        jasmine.objectContaining({
          validation: true,
          logging: true,
        })
      );
    });

    it('should log configuration application', () => {
      const events = service.getRecentEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe(DataIntegrityEventType.CONFIGURATION_APPLIED);
    });
  });

  describe('Project Name Validation', () => {
    it('should validate normal project names', () => {
      const validNames = [
        'My Beading Project',
        'Project 123',
        'Test-Project_2025',
        'Unicode 名前 العربية Русский 🎨',
      ];

      validNames.forEach((name) => {
        const result: ValidationResult = service.validateProjectName(name);
        expect(result.isValid).toBe(true);
        expect(result.issues.length).toBe(0);
        expect(result.cleanValue).toBe(name);
      });
    });

    it('should reject empty project names', () => {
      const result: ValidationResult = service.validateProjectName('');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Project name cannot be empty');
    });

    it('should reject whitespace-only project names', () => {
      const result: ValidationResult = service.validateProjectName('   ');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Project name cannot be empty');
    });

    it('should handle overly long project names', () => {
      const longName = 'a'.repeat(300);
      const result: ValidationResult = service.validateProjectName(longName);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain(
        'Project name too long (max 255 characters)'
      );
      expect(result.cleanValue.length).toBe(255);
    });

    it('should remove control characters that could cause crashes', () => {
      const nameWithControlChars = 'Project\x00\x01\x1F\x7FName';
      const result: ValidationResult =
        service.validateProjectName(nameWithControlChars);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Removed control characters');
      expect(result.cleanValue).toBe('ProjectName');
    });

    it('should handle file system unsafe characters', () => {
      const unsafeName = 'Project<>:"/\\|?*Name';
      const result: ValidationResult = service.validateProjectName(unsafeName);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain(
        'Removed characters that could cause file system issues'
      );
      expect(result.cleanValue).toBe('Project_________Name');
    });

    it('should handle non-string input gracefully', () => {
      const result: ValidationResult = service.validateProjectName(null as any);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Validation error - using safe fallback');
      expect(result.cleanValue).toBe('Untitled Project');
    });

    it('should preserve safe special characters', () => {
      const safeName = 'Project #1 - Version (2025) [Final]';
      const result: ValidationResult = service.validateProjectName(safeName);

      expect(result.isValid).toBe(true);
      expect(result.cleanValue).toBe(safeName);
    });
  });

  describe('JSON Data Validation', () => {
    it('should validate proper JSON', () => {
      const validJson = '{"name": "test", "value": 123}';
      const result = service.validateJsonData(validJson);

      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual({ name: 'test', value: 123 });
    });

    it('should reject malformed JSON', () => {
      const invalidJson = '{"name": "test", "value": }';
      const result = service.validateJsonData(invalidJson);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty strings', () => {
      const result = service.validateJsonData('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should log validation failures', () => {
      service.validateJsonData('invalid json');

      const events = service.getRecentEvents();
      const validationEvent = events.find(
        (e) => e.type === DataIntegrityEventType.DATA_VALIDATION_FAILED
      );

      expect(validationEvent).toBeDefined();
    });
  });

  describe('File Path Validation', () => {
    it('should validate safe relative paths', () => {
      const safePaths = [
        'documents/project.json',
        'exports/pattern-2025.pdf',
        'data/backup.db',
      ];

      safePaths.forEach((path) => {
        const result: ValidationResult = service.validateFilePath(path);
        expect(result.isValid).toBe(true);
        expect(result.cleanValue).toBe(path);
      });
    });

    it('should block directory traversal attempts', () => {
      const maliciousPath = '../../../etc/passwd';
      const result: ValidationResult = service.validateFilePath(maliciousPath);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Directory traversal attempt blocked');
      expect(result.cleanValue).not.toContain('..');
    });

    it('should convert absolute paths to relative', () => {
      const absolutePaths = [
        { path: '/home/user/document.txt', expected: 'home/user/document.txt' },
        {
          path: 'C:\\Users\\User\\document.txt',
          expected: 'Users\\User\\document.txt',
        },
        {
          path: '\\\\server\\share\\file.txt',
          expected: 'server\\share\\file.txt',
        }, // UNC paths
      ];

      absolutePaths.forEach(({ path, expected }) => {
        const result: ValidationResult = service.validateFilePath(path);
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Absolute path converted to relative');
        expect(result.cleanValue).toBe(expected);
      });
    });

    it('should preserve safe relative paths', () => {
      const safePath = 'documents/subfolder/file.txt';
      const result: ValidationResult = service.validateFilePath(safePath);

      expect(result.isValid).toBe(true);
      expect(result.cleanValue).toBe(safePath);
    });
  });

  describe('Event Logging', () => {
    it('should maintain reasonable event log size', () => {
      // Generate multiple events
      for (let i = 0; i < 30; i++) {
        service.validateProjectName(`test-${i}`);
      }

      const events = service.getRecentEvents();
      expect(events.length).toBeLessThanOrEqual(50); // Max log size
    });

    it('should provide recent events with proper structure', () => {
      service.validateProjectName('test\x00project');

      const events = service.getRecentEvents(5);
      expect(events.length).toBeGreaterThan(0);

      const event = events[0];
      expect(event.type).toBeDefined();
      expect(event.message).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should limit returned events based on parameter', () => {
      // Generate several events
      for (let i = 0; i < 10; i++) {
        service.validateProjectName(`test-${i}\x00`);
      }

      const limitedEvents = service.getRecentEvents(3);
      expect(limitedEvents.length).toBe(3);
    });

    it('should clear event log when requested', () => {
      service.validateProjectName('test\x00project');
      expect(service.getRecentEvents().length).toBeGreaterThan(1);

      service.clearEventLog();
      expect(service.getRecentEvents().length).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined input gracefully', () => {
      const nullResult = service.validateProjectName(null as any);
      const undefinedResult = service.validateProjectName(undefined as any);

      expect(nullResult.isValid).toBe(false);
      expect(undefinedResult.isValid).toBe(false);
    });

    it('should handle very large input strings', () => {
      const largeInput = 'a'.repeat(1000);
      const result = service.validateProjectName(largeInput);

      expect(result.cleanValue.length).toBeLessThanOrEqual(255);
    });

    it('should handle mixed Unicode and control characters', () => {
      const mixedInput = 'Project 🎨\x00 العربية\x1F Русский';
      const result = service.validateProjectName(mixedInput);

      expect(result.isValid).toBe(false);
      expect(result.cleanValue).toContain('🎨');
      expect(result.cleanValue).toContain('العربية');
      expect(result.cleanValue).toContain('Русский');
      expect(result.cleanValue).not.toMatch(/[\x00-\x1F\x7F]/);
    });
  });

  describe('Local Deployment Optimization', () => {
    it('should use appropriate logging levels', () => {
      service.validateProjectName('test\x00project');

      // Should use debug level for most events
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should maintain small event log for local use', () => {
      // Generate many events to test log size management
      for (let i = 0; i < 100; i++) {
        service.validateProjectName(`test-${i}\x00`);
      }

      const events = service.getRecentEvents();
      expect(events.length).toBeLessThanOrEqual(50);
    });

    it('should focus on data integrity over web security', () => {
      // Should accept content that would be dangerous on web but fine locally
      const webUnsafeButLocallyFine =
        'Project <script>alert("test")</script> Name';
      const result = service.validateProjectName(webUnsafeButLocallyFine);

      // Should block this because < > are file system unsafe characters, not because of XSS
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain(
        'Removed characters that could cause file system issues'
      );
      expect(result.cleanValue).toBe(
        'Project _script_alert(_test_)__script_ Name'
      );
    });
  });
});

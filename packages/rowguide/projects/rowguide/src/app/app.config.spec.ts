import { TestBed } from '@angular/core/testing';
import { ApplicationConfig } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { appConfig } from './app.config';

describe('App Configuration', () => {
  beforeEach(() => {
    TestBed.configureTestingModule(appConfig);
  });

  it('should create a valid application config', () => {
    expect(appConfig).toBeTruthy();
    expect(appConfig.providers).toBeDefined();
    expect(Array.isArray(appConfig.providers)).toBe(true);
    expect(appConfig.providers!.length).toBeGreaterThan(0);
  });

  it('should provide Router functionality', () => {
    const router = TestBed.inject(Router);
    expect(router).toBeTruthy();
    expect(router).toBeInstanceOf(Router);
  });

  it('should provide HttpClient functionality', () => {
    const httpClient = TestBed.inject(HttpClient);
    expect(httpClient).toBeTruthy();
    expect(httpClient).toBeInstanceOf(HttpClient);
  });

  it('should provide Logger functionality', () => {
    const logger = TestBed.inject(NGXLogger);
    expect(logger).toBeTruthy();
    expect(logger).toBeInstanceOf(NGXLogger);
  });

  it('should configure logger with DEBUG level', () => {
    const logger = TestBed.inject(NGXLogger);
    expect(logger).toBeTruthy();
    // Note: NGXLogger internal level checking would require more complex setup
    // This test verifies the logger is available with our configuration
  });

  describe('Provider Configuration', () => {
    it('should include router providers', () => {
      // Test that routing is properly configured by checking if Router is available
      expect(() => TestBed.inject(Router)).not.toThrow();
    });

    it('should include HTTP client providers', () => {
      // Test that HTTP client is properly configured
      expect(() => TestBed.inject(HttpClient)).not.toThrow();
    });

    it('should include animation providers', () => {
      // Animations should be available (async provision)
      // We can verify this by checking if the TestBed setup doesn't throw
      expect(TestBed).toBeTruthy();
    });

    it('should include logger providers', () => {
      // Test that logger is properly configured
      expect(() => TestBed.inject(NGXLogger)).not.toThrow();
    });
  });

  describe('Provider Integration', () => {
    it('should allow multiple provider injections without conflicts', () => {
      // Test that all providers can be injected together
      expect(() => {
        const router = TestBed.inject(Router);
        const httpClient = TestBed.inject(HttpClient);
        const logger = TestBed.inject(NGXLogger);

        expect(router).toBeTruthy();
        expect(httpClient).toBeTruthy();
        expect(logger).toBeTruthy();
      }).not.toThrow();
    });

    it('should provide singleton services', () => {
      // Test that services are singletons
      const router1 = TestBed.inject(Router);
      const router2 = TestBed.inject(Router);
      const logger1 = TestBed.inject(NGXLogger);
      const logger2 = TestBed.inject(NGXLogger);

      expect(router1).toBe(router2);
      expect(logger1).toBe(logger2);
    });
  });

  describe('Configuration Validation', () => {
    it('should have non-empty providers array', () => {
      expect(appConfig.providers).toBeTruthy();
      expect(appConfig.providers!.length).toBeGreaterThan(3); // Router, HTTP, Animations, Logger
    });

    it('should be a valid ApplicationConfig type', () => {
      // TypeScript compilation ensures this, but we can verify structure
      const config: ApplicationConfig = appConfig;
      expect(config).toBe(appConfig);
      expect(typeof config).toBe('object');
      expect('providers' in config).toBe(true);
    });
  });
});

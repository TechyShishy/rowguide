import { FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright E2E tests for Rowguide');

  // Clear any existing test data
  console.log('🧹 Clearing test data...');

  // You can add any global setup here:
  // - Database initialization
  // - Authentication setup
  // - Test data preparation

  console.log('✅ Global setup complete');
}

export default globalSetup;

import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * Runs once after all tests complete
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up after Playwright E2E tests');

  // You can add any global cleanup here:
  // - Clear test databases
  // - Remove temporary files
  // - Clean up test resources

  console.log('✅ Global teardown complete');
}

export default globalTeardown;

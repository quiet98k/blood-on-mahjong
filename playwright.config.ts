import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  use: {
    // Base URL can be set with BASE_URL env var; defaults to localhost:3000
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    actionTimeout: 10_000,
  },
});

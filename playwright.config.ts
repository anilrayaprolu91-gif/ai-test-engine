import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv.config({ path: path.resolve(__dirname, 'required.env') });

const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const isCI = Boolean(processEnv.CI);
const smokeBaseUrl = processEnv.BASE_URL || 'http://127.0.0.1:4317';
const webServerEnv = {
  ...processEnv,
  VITE_SPEC_DELIVERY_MODE: processEnv.VITE_SPEC_DELIVERY_MODE || 'local',
} as Record<string, string>;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/pages/**',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: smokeBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'smoke-chromium',
      testMatch: '**/dashboard.smoke.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev --prefix ui -- --host 127.0.0.1 --port 4317',
    url: smokeBaseUrl,
    reuseExistingServer: !isCI,
    timeout: 120000,
    env: webServerEnv,
  },
});

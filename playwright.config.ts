import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    // Authentication forms contain credentials; avoid retaining browser artifacts with submitted values.
    trace: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'cd server && APP_ENV=local APP_URL=http://127.0.0.1:8000 SPA_URL=http://127.0.0.1:5173 DB_CONNECTION=mysql DB_DATABASE=orbital_dispatcher_test SESSION_DRIVER=database CACHE_STORE=array QUEUE_CONNECTION=sync MAIL_MAILER=array APP_DEBUG=false php artisan migrate --force && APP_ENV=local APP_URL=http://127.0.0.1:8000 SPA_URL=http://127.0.0.1:5173 DB_CONNECTION=mysql DB_DATABASE=orbital_dispatcher_test SESSION_DRIVER=database CACHE_STORE=array QUEUE_CONNECTION=sync MAIL_MAILER=array APP_DEBUG=false php artisan serve --host=127.0.0.1 --port=8000',
      url: 'http://127.0.0.1:8000/up',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})

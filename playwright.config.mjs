// 手機尺寸端對端測試。本機只有 Chromium；CI 另外跑 WebKit（最接近 iPhone Safari）。
import { defineConfig, devices } from '@playwright/test';

const projects = [{ name: 'iphone-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } }];
if (process.env.CI) projects.push({ name: 'iphone-webkit', use: { ...devices['iPhone 13'] } });

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.mjs$/,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry' },
  projects,
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
  },
});

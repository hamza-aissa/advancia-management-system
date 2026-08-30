import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 1,
  reporter: 'line',
  use: { baseURL: process.env.BASE_URL || 'http://localhost:8080', trace: 'retain-on-failure' }
})

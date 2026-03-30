import { test, expect } from '@playwright/test';

test.describe('Portal Pages', () => {
  test('portal appointments page loads', async ({ page }) => {
    await page.goto('/portal/appointments');
    await expect(page.locator('h1')).toContainText('Appointments');
  });

  test('portal invoices page loads', async ({ page }) => {
    await page.goto('/portal/invoices');
    await expect(page.locator('h1')).toContainText('Invoices');
  });

  test('portal messages page loads', async ({ page }) => {
    await page.goto('/portal/messages');
    await expect(page.locator('h1')).toContainText('Messages');
  });

  test('portal profile page loads', async ({ page }) => {
    await page.goto('/portal/profile');
    await expect(page.locator('h1')).toContainText('Profile');
  });
});

import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto(`${process.env.BASE_URL ?? 'http://localhost:3000'}/login`);
  // Small delay to allow initial client-side hydration/render before interactions
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Player 1' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: 'Waiting Room' })).toBeVisible();
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: 'Mahjong Room' })).toBeVisible();
  await expect(page.getByText('Waiting for players to start')).toBeVisible();
  await page.getByRole('button', { name: 'Back to Waiting Room' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Join Game' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: 'Join a Game' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open Tables' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Match History' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: 'Match History' })).toBeVisible();
  await expect(page.getByText('Recent games across all rooms')).toBeVisible();
  await page.getByRole('button', { name: '← Back' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Log Out' }).click();
  await page.waitForTimeout(500);
});
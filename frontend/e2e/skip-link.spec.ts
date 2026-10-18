/**
 * frontend/e2e/skip-link.spec.ts
 * E2E tests for the skip-to-content link keyboard interaction (#1467).
 */

import { test, expect } from '@playwright/test';

test.describe('Skip-to-Content link (#1467)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Freighter wallet provider
    await page.addInitScript(() => {
      (window as any).freighter = {
        isConnected: async () => ({ isConnected: false }),
        getPublicKey: async () => ({ publicKey: '' }),
        signTransaction: async () => ({ signedTransaction: '' }),
        requestAccess: async () => ({}),
        isAllowed: async () => ({ isAllowed: false }),
      };
    });
  });

  test('appears on first Tab key press and moves focus to main content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Press Tab once to navigate into the page
    await page.keyboard.press('Tab');

    // The skip link must be focused
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveText('Skip to content');

    // Activating the skip link moves focus to #main-content
    await page.keyboard.press('Enter');

    const mainElement = page.locator('main#main-content');
    await expect(mainElement).toBeFocused();
  });

  test('displays translated skip link text when es locale is selected', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stellar-micropay:locale', 'es');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.keyboard.press('Tab');

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveText('Saltar al contenido');
  });

  test('ensures main and nav landmarks are present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const mainLandmarks = page.getByRole('main');
    await expect(mainLandmarks).toHaveCount(1);

    const navLandmarks = page.getByRole('navigation');
    await expect(navLandmarks).toHaveCount(1);
  });
});

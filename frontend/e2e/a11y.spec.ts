/**
 * frontend/e2e/a11y.spec.ts
 * Automated accessibility scans using @axe-core/playwright (#1470).
 *
 * Scans the primary routes:
 * 1. Landing (/)
 * 2. Dashboard (/dashboard)
 * 3. Send (/pay)
 * 4. Transactions (/transactions)
 * 5. Tip page (/tip/testuser)
 * 6. Settings (/settings)
 *
 * Each route is evaluated under the default light theme and with both
 * the default (en) and Spanish (es) locales.
 *
 * Fails CI on any serious or critical WCAG violations that are not explicitly
 * documented in frontend/e2e/a11y-allowlist.json.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import allowlist from './a11y-allowlist.json';

interface AllowlistEntry {
  id: string;
  description: string;
  issue: string;
  impact?: string;
  routes?: string[];
}

const typedAllowlist = allowlist as AllowlistEntry[];

const ROUTES = [
  { name: 'landing', path: '/' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'send', path: '/pay' },
  { name: 'transactions', path: '/transactions' },
  { name: 'tip page', path: '/tip/testuser' },
  { name: 'settings', path: '/settings' },
];

const LOCALES = ['en', 'es'] as const;

test.describe('Automated Axe Accessibility Suite (#1470)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Freighter wallet provider so pages render without external wallet extension
    await page.addInitScript(() => {
      (window as any).freighter = {
        isConnected: async () => ({ isConnected: true }),
        getPublicKey: async () => ({ publicKey: 'GTESTPUBKEYMOCKED1234567890' }),
        signTransaction: async (xdr: string) => ({ signedTransaction: xdr + '_signed' }),
        requestAccess: async () => ({}),
        isAllowed: async () => ({ isAllowed: true }),
      };
    });

    // Mock Stellar Horizon network responses
    await page.route('**/horizon.stellar.org/**', (route) => {
      const url = route.request().url();
      if (url.includes('/accounts/')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'GTESTPUBKEYMOCKED1234567890',
            balances: [{ asset_type: 'native', balance: '125.5000000' }],
          }),
        });
      } else if (url.includes('/transactions')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ _embedded: { records: [] } }),
        });
      } else if (url.includes('/fee_stats')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            last_ledger: '12345678',
            last_ledger_base_fee: '100',
            fee_charged: {
              max: '1000',
              min: '100',
              mode: '100',
              p10: '100',
              p20: '100',
              p30: '100',
              p40: '100',
              p50: '100',
              p60: '100',
              p70: '100',
              p80: '100',
              p90: '100',
              p95: '200',
              p99: '500',
            },
          }),
        });
      } else {
        route.fulfill({ status: 200, body: '{}' });
      }
    });

    // Mock CoinGecko USD price feed
    await page.route('**/api.coingecko.com/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ stellar: { usd: 0.12 } }),
      });
    });

    // Mock Tip recipient resolver
    await page.route('**/api/accounts/resolve/testuser', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            username: 'testuser',
            publicKey: 'GTESTPUBKEYMOCKED1234567890',
          },
        }),
      });
    });

    // Mock Tips submission
    await page.route('**/api/tips', (route) => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 'mock-tip' } }),
      });
    });

    // Mock backend payment stats
    await page.route('**/api/payments/**/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            publicKey: 'GTESTPUBKEYMOCKED1234567890',
            totalSentXLM: '50.00',
            totalReceivedXLM: '75.50',
            sentCount: 5,
            receivedCount: 8,
            totalTransactions: 13,
          },
        }),
      });
    });
  });

  for (const locale of LOCALES) {
    for (const route of ROUTES) {
      test(`axe a11y scan: ${route.name} (${route.path}) [theme: light, locale: ${locale}]`, async ({ page }) => {
        // Configure light theme and active locale in localStorage before page load
        await page.addInitScript(
          ({ loc }: { loc: string }) => {
            localStorage.setItem('stellar-micropay:theme', 'light');
            localStorage.setItem('stellar-micropay:locale', loc);
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
          },
          { loc: locale }
        );

        const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);

        // Run axe audit against WCAG 2.0 and 2.1 AA rules
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        // Filter for serious and critical violations
        const seriousOrCritical = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical'
        );

        // Filter out allowlisted issues
        const unallowlisted = seriousOrCritical.filter((violation) => {
          const isAllowed = typedAllowlist.some(
            (entry) =>
              entry.id === violation.id &&
              (!entry.impact || entry.impact === violation.impact) &&
              (!entry.routes || entry.routes.includes(route.path))
          );
          return !isAllowed;
        });

        // Fail if there are any unallowlisted serious or critical violations
        if (unallowlisted.length > 0) {
          const formatted = unallowlisted.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            help: v.help,
            helpUrl: v.helpUrl,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              failureSummary: n.failureSummary,
            })),
          }));

          expect(
            unallowlisted,
            `Unexpected serious/critical a11y violations on ${route.path} [${locale}]:\n${JSON.stringify(formatted, null, 2)}`
          ).toEqual([]);
        }
      });
    }
  }
});

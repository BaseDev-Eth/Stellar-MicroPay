# E2E Test Coverage for Stellar-MicroPay

This suite covers all major user journeys:

- Wallet connect (mocked)
- Sending payments (mocked)
- Transaction history
- Payment request flow
- Batch payments
- Recurring payments
- Contact list CRUD

## How it works
- All Stellar SDK network calls are mocked using Playwright's `page.route()`
- Freighter wallet is mocked via `window.freighter` in `addInitScript`
- No real Horizon/Soroban calls are made
- All tests run in CI with coverage

## Running tests locally

```sh
cd frontend
npx playwright test
```

### Running Automated Accessibility Checks (#1470)

The suite includes automated WCAG accessibility audits powered by `@axe-core/playwright` (`e2e/a11y.spec.ts`). It scans six key routes (landing `/`, dashboard `/dashboard`, send `/pay`, transactions `/transactions`, tip page `/tip/testuser`, and settings `/settings`) in both the default light theme and with the Spanish (`es`) locale.

To run only the accessibility checks locally:

```sh
cd frontend
npm run test:a11y
# or
npx playwright test e2e/a11y.spec.ts --project=chromium
```

Any new `serious` or `critical` violation fails CI. Known issues pending design or upstream fixes are documented in `frontend/e2e/a11y-allowlist.json` with issue links and rationale.

## Running in CI

- All tests run on every PR
- Coverage report is generated
- Total runtime should be under 2 minutes

## Adding new tests
- Place new E2E tests in `frontend/e2e/`
- Use the `full-journey.spec.ts` as a template for mocking and user flows

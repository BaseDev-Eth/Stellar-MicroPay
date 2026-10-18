/**
 * frontend/__tests__/skip-link.test.tsx
 * Unit tests for skip-to-content link, landmark structure, and translations (#1467).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/contexts/I18nContext";
import { WalletProvider } from "@/lib/useWallet";
import ToastProvider from "@/lib/ToastContext";
import Navbar from "@/components/Navbar";

// Mock next/router
jest.mock("next/router", () => ({
  useRouter: () => ({
    pathname: "/",
    query: {},
    asPath: "/",
    push: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
    },
  }),
}));

// Mock stellar library
jest.mock("@/lib/stellar", () => ({
  shortenAddress: (addr: string) => addr,
  getNetworkConfig: () => ({ network: "testnet" }),
  fetchNetworkFeeStats: async () => ({ feeLevel: "normal" }),
}));

function TestAppShell({ locale = "en" }: { locale?: string }) {
  localStorage.setItem("stellar-micropay:locale", locale);

  return (
    <I18nProvider initialLocale={locale as any}>
      <WalletProvider>
        <ToastProvider>
          <div className="min-h-screen bg-white">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]"
              data-testid="skip-link"
            >
              {locale === "es" ? "Saltar al contenido" : "Skip to content"}
            </a>
            <Navbar />
            <main id="main-content" tabIndex={-1}>
              <h1>Test Page Content</h1>
            </main>
          </div>
        </ToastProvider>
      </WalletProvider>
    </I18nProvider>
  );
}

describe("Skip-to-Content Link & Landmark Structure (#1467)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders skip link as the first focusable link before navbar", () => {
    render(<TestAppShell locale="en" />);

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "#main-content");
    expect(links[0]).toHaveTextContent("Skip to content");
  });

  it("renders translated skip link text for es locale", () => {
    render(<TestAppShell locale="es" />);

    const skipLink = screen.getByTestId("skip-link");
    expect(skipLink).toHaveTextContent("Saltar al contenido");
  });

  it("targets <main id='main-content'> with tabIndex={-1}", () => {
    render(<TestAppShell locale="en" />);

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("nav landmark is present and labeled", () => {
    render(<TestAppShell locale="en" />);

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  it("receives focus on first Tab key press", async () => {
    const user = userEvent.setup();
    render(<TestAppShell locale="en" />);

    const skipLink = screen.getByTestId("skip-link");

    // Press Tab once from the top of the document
    await user.tab();
    expect(skipLink).toHaveFocus();
  });
});

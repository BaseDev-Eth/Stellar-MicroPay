/**
 * frontend/__tests__/sw-precache.test.ts
 * Tests for service worker precache URLs, static-export paths, and resilient install caching (#1471).
 */

import fs from "fs";
import path from "path";

describe("Service Worker Precache Configuration (#1471)", () => {
  const swPath = path.resolve(__dirname, "../public/sw.js");
  const nginxPath = path.resolve(__dirname, "../../nginx/nginx.conf");
  const nextConfigPath = path.resolve(__dirname, "../next.config.mjs");

  it("public/sw.js defines APP_SHELL_URLS including / and /dashboard", () => {
    const swContent = fs.readFileSync(swPath, "utf-8");

    // Must include the essential exported app shell pages
    expect(swContent).toMatch(/["']\/["']/);
    expect(swContent).toMatch(/["']\/dashboard["']/);
    expect(swContent).toMatch(/["']\/offline\.html["']/);
    expect(swContent).toMatch(/["']\/manifest\.json["']/);
  });

  it("next.config.mjs explicitly sets trailingSlash: false for clean static export", () => {
    const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
    expect(nextConfigContent).toMatch(/output:\s*["']export["']/);
    expect(nextConfigContent).toMatch(/trailingSlash:\s*false/);
  });

  it("nginx.conf try_files checks $uri.html for clean route resolution", () => {
    const nginxContent = fs.readFileSync(nginxPath, "utf-8");
    // Verifies try_files $uri $uri.html $uri/ /index.html;
    expect(nginxContent).toMatch(/try_files\s+\$uri\s+\$uri\.html\s+\$uri\/\s+\/index\.html;/);
  });

  it("sw.js installs precache assets individually without aborting on single failed asset", () => {
    const swContent = fs.readFileSync(swPath, "utf-8");

    // Verifies that cache.addAll is NOT used for atomic aborts
    expect(swContent).not.toMatch(/cache\.addAll\(APP_SHELL_URLS\)/);

    // Verifies individual caching with try/catch / Promise.all
    expect(swContent).toMatch(/APP_SHELL_URLS\.map/);
    expect(swContent).toMatch(/cache\.put\(url,\s*response\)/);
  });

  it("sw.js handleNavigation resolves offline paths gracefully", () => {
    const swContent = fs.readFileSync(swPath, "utf-8");

    // Verifies path normalization and offline fallback matching
    expect(swContent).toMatch(/caches\.match\(request\)/);
    expect(swContent).toMatch(/caches\.match\("\/offline\.html"\)/);
    expect(swContent).toMatch(/cleanPath/);
  });
});

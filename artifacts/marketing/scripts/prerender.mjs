/**
 * Post-build SSR prerender script.
 *
 * 1. Builds an SSR server bundle from src/entry-server.tsx via vite.ssr.config.ts
 * 2. Imports that bundle and calls render() using React's renderToString
 * 3. Injects the resulting HTML into dist/public/index.html
 * 4. Cleans up the server bundle
 *
 * This ensures the pre-rendered HTML is always in sync with the React source tree —
 * no hardcoded strings, no content drift.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const indexPath = path.resolve(root, "dist/public/index.html");
const serverEntryPath = path.resolve(root, "dist/server/entry-server.js");

if (!existsSync(indexPath)) {
  console.error("[prerender] dist/public/index.html not found — run vite build first");
  process.exit(1);
}

console.log("[prerender] Building SSR bundle...");
try {
  execSync("pnpm exec vite build --config vite.ssr.config.ts", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env },
  });
} catch (err) {
  console.error("[prerender] SSR build failed:", err.message);
  process.exit(1);
}

if (!existsSync(serverEntryPath)) {
  console.error("[prerender] SSR entry not found at dist/server/entry-server.js");
  process.exit(1);
}

let appHtml;
try {
  // Cache-busting import to avoid Node.js module cache issues
  const { render } = await import(`${serverEntryPath}?t=${Date.now()}`);
  appHtml = await render();
} catch (err) {
  console.error("[prerender] renderToString failed:", err.message);
  process.exit(1);
}

const template = readFileSync(indexPath, "utf-8");
const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
writeFileSync(indexPath, html);

// Cleanup server bundle
try {
  rmSync(path.resolve(root, "dist/server"), { recursive: true, force: true });
} catch {
  // non-fatal
}

console.log("[prerender] SSR content injected into dist/public/index.html ✓");

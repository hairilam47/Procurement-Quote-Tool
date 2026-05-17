/**
 * Post-build SSR prerender script.
 *
 * 1. Builds an SSR server bundle from src/entry-server.tsx via vite.ssr.config.ts
 * 2. Imports that bundle and calls render() using React's renderToString
 * 3. Injects the resulting HTML into dist/public/index.html
 * 4. Rebuilds and injects the SoftwareApplication JSON-LD with the full currency
 *    list so structured metadata is always present before JavaScript runs
 * 5. Cleans up the server bundle
 *
 * This ensures the pre-rendered HTML is always in sync with the React source tree —
 * no hardcoded strings, no content drift.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

function buildSitemapWithCurrentDate(sitemapPath) {
  if (!existsSync(sitemapPath)) {
    console.error("[prerender] sitemap.xml not found in dist/public — lastmod update failed");
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);
  let sitemap = readFileSync(sitemapPath, "utf-8");
  sitemap = sitemap.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
  writeFileSync(sitemapPath, sitemap);
  console.log(`[prerender] sitemap.xml lastmod dates updated to ${today} ✓`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const indexPath = path.resolve(root, "dist/public/index.html");
const serverEntryPath = path.resolve(root, "dist/server/entry-server.js");

// Canonical list of all 24 supported currencies — keep in sync with home.tsx
const CURRENCIES = [
  { symbol: "$",    code: "USD", name: "US Dollar"           },
  { symbol: "€",    code: "EUR", name: "Euro"                },
  { symbol: "£",    code: "GBP", name: "British Pound"       },
  { symbol: "¥",    code: "JPY", name: "Japanese Yen"        },
  { symbol: "A$",   code: "AUD", name: "Australian Dollar"   },
  { symbol: "C$",   code: "CAD", name: "Canadian Dollar"     },
  { symbol: "Fr",   code: "CHF", name: "Swiss Franc"         },
  { symbol: "¥",    code: "CNY", name: "Chinese Yuan"        },
  { symbol: "₹",    code: "INR", name: "Indian Rupee"        },
  { symbol: "S$",   code: "SGD", name: "Singapore Dollar"    },
  { symbol: "د.إ",  code: "AED", name: "UAE Dirham"          },
  { symbol: "RM",   code: "MYR", name: "Malaysian Ringgit"   },
  { symbol: "NZ$",  code: "NZD", name: "New Zealand Dollar"  },
  { symbol: "HK$",  code: "HKD", name: "Hong Kong Dollar"    },
  { symbol: "₩",    code: "KRW", name: "South Korean Won"    },
  { symbol: "R$",   code: "BRL", name: "Brazilian Real"      },
  { symbol: "$",    code: "MXN", name: "Mexican Peso"        },
  { symbol: "R",    code: "ZAR", name: "South African Rand"  },
  { symbol: "kr",   code: "SEK", name: "Swedish Krona"       },
  { symbol: "kr",   code: "NOK", name: "Norwegian Krone"     },
  { symbol: "kr",   code: "DKK", name: "Danish Krone"        },
  { symbol: "zł",   code: "PLN", name: "Polish Zloty"        },
  { symbol: "฿",    code: "THB", name: "Thai Baht"           },
  { symbol: "Rp",   code: "IDR", name: "Indonesian Rupiah"   },
];

const CURRENCY_CODES = CURRENCIES.map((c) => c.code);
const CURRENCY_NAMES = CURRENCIES.map((c) => c.name);

function buildSoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "KuotFlow",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "QuotationSoftware",
    operatingSystem: "Web",
    url: "https://kuotflow.com/",
    description:
      `All-in-one IT quotation software for managed service providers. ` +
      `Create, brand, and send professional PDF quotes in minutes. ` +
      `Supports ${CURRENCIES.length} currencies: ${CURRENCY_NAMES.join(", ")}. ` +
      `Multi-currency quoting, Stripe payment links, and client tracking built in.`,
    featureList: [
      `Multi-currency IT quotation — ${CURRENCY_CODES.join(", ")}`,
      "Branded PDF generation",
      "Stripe payment link integration",
      "Client quote tracking",
      "IT service line-item quoting",
      "Quote status workflow: Draft, Sent, Accepted, Paid",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Daily Plan",
        price: "2.99",
        priceCurrency: "USD",
        billingDuration: "P1D",
      },
      {
        "@type": "Offer",
        name: "Weekly Plan",
        price: "9.99",
        priceCurrency: "USD",
        billingDuration: "P1W",
      },
      {
        "@type": "Offer",
        name: "Monthly Plan",
        price: "29.99",
        priceCurrency: "USD",
        billingDuration: "P1M",
      },
      {
        "@type": "Offer",
        name: "Yearly Plan",
        price: "199.99",
        priceCurrency: "USD",
        billingDuration: "P1Y",
      },
    ],
  };
  return `<script type="application/ld+json">\n    ${JSON.stringify(schema, null, 2).replace(/\n/g, "\n    ")}\n    </script>`;
}

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

let html = readFileSync(indexPath, "utf-8");

// Inject SSR-rendered React HTML
html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

// Rebuild the SoftwareApplication JSON-LD block with the full currency list.
// Match each JSON-LD script block individually (lazy stop at </script>) so we never
// accidentally span across multiple blocks — then swap only the one whose parsed
// content declares @type === "SoftwareApplication".
const freshJsonLd = buildSoftwareApplicationJsonLd();
const singleBlockPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

let replaced = false;
html = html.replace(singleBlockPattern, (fullMatch, innerContent) => {
  if (!replaced) {
    try {
      const parsed = JSON.parse(innerContent.trim());
      if (parsed["@type"] === "SoftwareApplication") {
        replaced = true;
        return freshJsonLd;
      }
    } catch {
      // Not valid JSON in this script block — leave it untouched
    }
  }
  return fullMatch;
});

if (replaced) {
  console.log("[prerender] SoftwareApplication JSON-LD updated with currency list ✓");
} else {
  // Fallback: inject before </head> if no existing SoftwareApplication block was found
  html = html.replace("</head>", `    ${freshJsonLd}\n  </head>`);
  console.log("[prerender] SoftwareApplication JSON-LD injected before </head> ✓");
}

// Sanity check — ensure all four structured-data types are still present
const requiredTypes = ["WebSite", "Organization", "SoftwareApplication", "FAQPage"];
for (const type of requiredTypes) {
  if (!html.includes(`"@type": "${type}"`)) {
    console.error(`[prerender] MISSING structured data block: @type="${type}"`);
    process.exit(1);
  }
}
console.log("[prerender] All structured-data blocks verified ✓");

writeFileSync(indexPath, html);

// Cleanup server bundle
try {
  rmSync(path.resolve(root, "dist/server"), { recursive: true, force: true });
} catch {
  // non-fatal
}

console.log("[prerender] SSR content injected into dist/public/index.html ✓");

// Update all lastmod dates in the built sitemap to today's date
const sitemapPath = path.resolve(root, "dist/public/sitemap.xml");
buildSitemapWithCurrentDate(sitemapPath);

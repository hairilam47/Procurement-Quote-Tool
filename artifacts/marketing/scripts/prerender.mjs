/**
 * Post-build SSR content injection for SEO.
 *
 * Injects a pre-rendered HTML shell into the built index.html so that web
 * crawlers and curl-based checks see real content (including <h1>) without
 * executing JavaScript.  React will mount and fully hydrate the page for
 * real users.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist/public");
const indexPath = path.resolve(distDir, "index.html");

if (!fs.existsSync(indexPath)) {
  console.error("[prerender] dist/public/index.html not found — run vite build first");
  process.exit(1);
}

const template = fs.readFileSync(indexPath, "utf-8");

const prerendered = `
<div style="font-family:sans-serif;min-height:100vh">
  <header>
    <nav aria-label="Main navigation">
      <a href="/marketing/" style="font-weight:bold">QuoteFlow</a>
      <a href="#features">Features</a>
      <a href="#how-it-works">How it works</a>
      <a href="#pricing">Pricing</a>
      <a href="/sign-in">Log in</a>
      <a href="/sign-up">Sign up</a>
    </nav>
  </header>
  <main>
    <section aria-label="Hero">
      <h1>Stop losing hours to messy Word quotes.</h1>
      <p>QuoteFlow lets you create, send, and track professional, line-item PDF quotes in minutes. The precise quotation engine your MSP deserves.</p>
      <a href="/sign-up">Start for free</a>
      <a href="#pricing">See pricing</a>
    </section>
    <section id="how-it-works" aria-label="How it works">
      <h2>From draft to paid, faster.</h2>
      <ol>
        <li><h3>Create the quote</h3><p>Add clients, drag in saved line items, and adjust margins instantly.</p></li>
        <li><h3>Send &amp; track</h3><p>Send the PDF directly. Get notified when they view it.</p></li>
        <li><h3>Sign &amp; get paid</h3><p>Clients accept with a digital signature and pay via embedded links.</p></li>
      </ol>
    </section>
    <section id="features" aria-label="Features">
      <h2>Everything you need to win the job.</h2>
      <ul>
        <li><h3>Professional PDF Generation</h3></li>
        <li><h3>Complex Line Items</h3></li>
        <li><h3>Status Tracking</h3></li>
        <li><h3>Integrated Payments</h3></li>
        <li><h3>Client Management</h3></li>
        <li><h3>Digital Signatures</h3></li>
      </ul>
    </section>
    <section id="pricing" aria-label="Pricing">
      <h2>Simple, transparent pricing.</h2>
      <p>Daily $2.99 &bull; Weekly $9.99 &bull; Monthly $29.99 &bull; Yearly $199.99</p>
      <a href="/sign-up">Start now</a>
    </section>
    <section id="faq" aria-label="FAQ">
      <h2>Frequently asked questions</h2>
      <dl>
        <dt>How does QuoteFlow compare to Word or Excel?</dt>
        <dd>QuoteFlow is purpose-built: every quote is structured, branded, PDF-ready, and tracked from the moment you send it.</dd>
        <dt>Can I white-label the PDF quotes?</dt>
        <dd>Yes. All plans let you add your company logo and remove the QuoteFlow watermark.</dd>
        <dt>What billing options are available?</dt>
        <dd>Daily ($2.99), Weekly ($9.99), Monthly ($29.99), or Yearly ($199.99). Cancel any time.</dd>
        <dt>Is there a free trial?</dt>
        <dd>QuoteFlow offers a generous free-tier. Upgrade when you are ready.</dd>
        <dt>Can I cancel at any time?</dt>
        <dd>Absolutely. No long-term contracts. Cancel from billing settings at any time.</dd>
      </dl>
    </section>
  </main>
  <footer>
    <p>&copy; ${new Date().getFullYear()} QuoteFlow. All rights reserved.</p>
    <nav aria-label="Footer links">
      <a href="/sign-up">Sign up free</a>
      <a href="/sign-in">Log in</a>
      <a href="/">Dashboard</a>
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
    </nav>
  </footer>
</div>
`;

const html = template.replace(
  '<div id="root"></div>',
  `<div id="root">${prerendered}</div>`
);

fs.writeFileSync(indexPath, html);
console.log("[prerender] SSR content injected into dist/public/index.html ✓");

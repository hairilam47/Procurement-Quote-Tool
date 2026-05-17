# Google Search Console — Sitemap Submission Guide

The sitemap at `https://procurement-quote-tool.replit.app/sitemap.xml` is already
declared in `public/robots.txt`, so Google will discover it during any crawl.
Submitting it directly in Search Console gives you faster indexing and crawl
visibility.

---

## Step 1 — Add and verify your property

1. Go to [Google Search Console](https://search.google.com/search-console).
2. Click **Add property**.
3. Choose **URL prefix** and enter `https://procurement-quote-tool.replit.app`.
4. Pick a verification method. The two easiest for a Replit deployment are:

   | Method | How |
   |--------|-----|
   | **HTML file** | Download the verification file Google gives you (e.g. `googleXXXXXXXX.html`) and place it in `artifacts/marketing/public/`. It will be served at the root path after the next deployment. |
   | **HTML meta tag** | Copy the `<meta name="google-site-verification" …>` tag and add it to the `<head>` of `artifacts/marketing/index.html`. |

5. Click **Verify**. Search Console will confirm ownership once it can fetch the
   file or tag.

---

## Step 2 — Submit the sitemap

1. In the left sidebar, click **Sitemaps** (under *Indexing*).
2. In the *Add a new sitemap* field, enter:
   ```
   sitemap.xml
   ```
   (Search Console prepends your property URL automatically.)
3. Click **Submit**.

You should see the sitemap listed with status **Success** and the number of
discovered URLs within a few minutes.

---

## Step 3 — Request indexing for individual pages (optional)

To fast-track a specific page:

1. Paste the full URL into the search bar at the top of Search Console.
2. Click **Request indexing** in the *URL Inspection* panel.

---

## Keeping the sitemap fresh

The `<lastmod>` dates in `sitemap.xml` are updated automatically by
`scripts/prerender.mjs` on every build. No manual editing is needed — just
deploy and Google Search Console will see the updated dates on its next crawl.

import React from "react";
import Decimal from "decimal.js";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { generateQrDataUrl } from "./qrcode";
import { ModernTemplate } from "./templates/modern";
import { ClassicTemplate } from "./templates/classic";
import type { TemplateProps, TemplateLineItem } from "./templates/types";
import { ObjectStorageService } from "../objectStorage";


type LineItem = {
  id: string;
  sku?: string | null;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  rateFormula?: string | null;
  paymentRequired: boolean;
  lineTotal: string;
};

type QuoteData = {
  id: string;
  number: string;
  status: string;
  issueDate: Date;
  validUntil: Date;
  paidAt?: Date | null;
  currency: string;
  secondaryCurrency?: string | null;
  secondaryExchangeRate?: string | null;
  discountType: string | null;
  discountValue: string;
  discountAmount: string;
  taxRate: string;
  taxAmount: string;
  subtotal: string;
  total: string;
  requiredTotal: string;
  notes: string | null;
  terms: string | null;
  paymentUrl: string | null;
  showQrCode: boolean;
  paymentMethod: string;
  template: string;
  lineItems: LineItem[];
  clientSnapshot: unknown;
  companySnapshot: unknown;
};

type ClientData = {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

type CompanyData = {
  name: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxNumber?: string | null;
  registrationNumber?: string | null;
  logoUrl?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankRecipientName?: string | null;
  bankQrCodeUrl?: string | null;
};

/**
 * Convert a logo URL/path to a base64 data URL for embedding in PDFs.
 *
 * The logo may be stored as an internal `/objects/...` path or as a full
 * serving URL like `https://<host>/api/storage/objects/...`. In both cases
 * we read directly from GCS via the ObjectStorageService so we never make
 * an outbound HTTP request to an auth-gated endpoint from inside the server.
 *
 * For genuinely external URLs (e.g. a user-provided http(s) URL that does not
 * point to our own storage) we fall back to a plain fetch.
 */
const objectStorageService = new ObjectStorageService();

function extractObjectPath(url: string): string | null {
  // Already a normalized internal path
  if (url.startsWith("/objects/")) return url;
  // Relative serving URL: /api/storage/objects/<id> (when REPLIT_DEV_DOMAIN is absent)
  const relMatch = url.match(/\/api\/storage(\/objects\/.+)/);
  if (relMatch) return relMatch[1];
  // Absolute serving URL: https://<host>/api/storage/objects/<id>
  try {
    const parsed = new URL(url);
    const absMatch = parsed.pathname.match(/(\/objects\/.+)/);
    if (absMatch) return absMatch[1];
  } catch {
    // not a valid absolute URL — fall through
  }
  return null;
}

async function fetchLogoDataUrl(
  url: string | null | undefined,
): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const objectPath = extractObjectPath(url);
    if (objectPath) {
      // Read directly from GCS — no HTTP round-trip, no auth issues
      const file = await objectStorageService.getObjectEntityFile(objectPath);
      const [content] = await file.download();
      const [metadata] = await file.getMetadata();
      const ct = (metadata.contentType as string | undefined) ?? "image/png";
      return `data:${ct};base64,${content.toString("base64")}`;
    }
    // Fall back to plain fetch for external URLs
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") ?? "image/png";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function renderFollowUpInvoicePdf(args: {
  quote: QuoteData;
  client: ClientData;
  company: CompanyData;
  invoiceNumber: string;
}): Promise<Buffer> {
  const { quote, client, company, invoiceNumber } = args;

  const effectiveClient =
    (quote.clientSnapshot as ClientData | null) ?? client;
  const effectiveCompany =
    (quote.companySnapshot as CompanyData | null) ?? company;

  const logoDataUrl = await fetchLogoDataUrl(effectiveCompany.logoUrl);

  const deferredItems = quote.lineItems.filter(
    (li) => li.paymentRequired === false,
  );

  const deferredSubtotal = deferredItems
    .reduce((sum, li) => sum + Number(li.lineTotal), 0)
    .toFixed(2);

  const followUpQuote = {
    ...quote,
    number: invoiceNumber,
    lineItems: deferredItems.map((li) => ({
      ...li,
      paymentRequired: true,
    })) as TemplateLineItem[],
    subtotal: deferredSubtotal,
    discountType: null,
    discountValue: "0",
    discountAmount: "0",
    taxAmount: "0",
    taxRate: "0",
    total: deferredSubtotal,
    requiredTotal: deferredSubtotal,
    paymentUrl: null,
    showQrCode: false,
    paymentMethod: "none",
  };

  const props: TemplateProps = {
    quote: followUpQuote,
    client: effectiveClient,
    company: effectiveCompany,
    logoDataUrl,
    invoiceMode: {
      documentTitle: "FOLLOW-UP INVOICE",
      referenceNumber: quote.number,
    },
  };

  const Component =
    quote.template === "CLASSIC" ? ClassicTemplate : ModernTemplate;

  return (await renderToBuffer(
    React.createElement(Component, props) as React.ReactElement<DocumentProps>,
  )) as Buffer;
}

export async function renderReceiptPdf(args: {
  quote: QuoteData;
  client: ClientData;
  company: CompanyData;
}): Promise<Buffer> {
  const { quote, client, company } = args;

  const effectiveClient =
    (quote.clientSnapshot as ClientData | null) ?? client;
  const effectiveCompany =
    (quote.companySnapshot as CompanyData | null) ?? company;

  const logoDataUrl = await fetchLogoDataUrl(effectiveCompany.logoUrl);

  // Include only upfront (paymentRequired=true) items; fall back to all if none are flagged
  const upfrontItems = quote.lineItems.filter((li) => li.paymentRequired !== false);
  const receiptItems = upfrontItems.length > 0 ? upfrontItems : quote.lineItems;

  // Compute receipt-specific financial breakdown using the same proportional
  // logic as computeTotals(), so that subtotal - discount + tax = requiredTotal.
  const D = (v: string | number | null | undefined) =>
    new Decimal(v?.toString() ?? "0");

  const receiptSubtotalD = receiptItems.reduce(
    (acc, li) => acc.add(D(li.lineTotal)),
    new Decimal(0),
  );
  const fullSubtotalD = D(quote.subtotal);
  const fullDiscountD = D(quote.discountAmount);

  let receiptDiscountD = new Decimal(0);
  if (quote.discountType === "PERCENTAGE") {
    receiptDiscountD = receiptSubtotalD
      .mul(D(quote.discountValue))
      .div(100)
      .toDecimalPlaces(2);
  } else if (quote.discountType === "FIXED") {
    if (fullSubtotalD.gt(0)) {
      receiptDiscountD = fullDiscountD
        .mul(receiptSubtotalD)
        .div(fullSubtotalD)
        .toDecimalPlaces(2);
    }
  }
  if (receiptDiscountD.gt(receiptSubtotalD)) receiptDiscountD = receiptSubtotalD;
  if (receiptDiscountD.lt(0)) receiptDiscountD = new Decimal(0);

  const receiptTaxableBaseD = receiptSubtotalD.sub(receiptDiscountD);
  const receiptTaxD = receiptTaxableBaseD
    .mul(D(quote.taxRate))
    .div(100)
    .toDecimalPlaces(2);

  const receiptNumber = `REC-${quote.number}`;

  const receiptQuote = {
    ...quote,
    number: receiptNumber,
    lineItems: receiptItems.map((li) => ({
      ...li,
      paymentRequired: true,
    })) as TemplateLineItem[],
    subtotal: receiptSubtotalD.toFixed(2),
    discountAmount: receiptDiscountD.toFixed(2),
    taxAmount: receiptTaxD.toFixed(2),
    total: quote.requiredTotal,
    requiredTotal: quote.requiredTotal,
    paymentUrl: null,
    showQrCode: false,
    paymentMethod: "none",
  };

  const props: TemplateProps = {
    quote: receiptQuote,
    client: effectiveClient,
    company: effectiveCompany,
    logoDataUrl,
    invoiceMode: {
      documentTitle: "PAYMENT RECEIPT",
      referenceNumber: quote.number,
      paidAt: quote.paidAt ?? quote.issueDate,
      receiptMode: true,
    },
  };

  const Component =
    quote.template === "CLASSIC" ? ClassicTemplate : ModernTemplate;

  return (await renderToBuffer(
    React.createElement(Component, props) as React.ReactElement<DocumentProps>,
  )) as Buffer;
}

export async function renderQuotationPdf(args: {
  quote: QuoteData;
  client: ClientData;
  company: CompanyData;
}): Promise<Buffer> {
  const { quote, client, company } = args;

  // Prefer snapshots when present so sent quotes remain stable forever
  const effectiveClient =
    (quote.clientSnapshot as ClientData | null) ?? client;
  const effectiveCompany =
    (quote.companySnapshot as CompanyData | null) ?? company;

  // Legacy compatibility: if paymentMethod is unset/none but a paymentUrl exists,
  // treat as "stripe" so pre-migration quotes still render their payment block.
  const method =
    (!quote.paymentMethod || quote.paymentMethod === "none") && quote.paymentUrl
      ? "stripe"
      : (quote.paymentMethod ?? "none");
  const needsStripeQr = (method === "stripe" || method === "both") && quote.showQrCode && quote.paymentUrl;
  const needsBankQr = (method === "bank_transfer" || method === "both") && effectiveCompany.bankQrCodeUrl;

  const [logoDataUrl, qrDataUrl, bankQrCodeDataUrl] = await Promise.all([
    fetchLogoDataUrl(effectiveCompany.logoUrl),
    needsStripeQr ? generateQrDataUrl(quote.paymentUrl!) : Promise.resolve(undefined),
    needsBankQr ? fetchLogoDataUrl(effectiveCompany.bankQrCodeUrl) : Promise.resolve(undefined),
  ]);

  const bankDetails = (method === "bank_transfer" || method === "both") ? {
    bankName: effectiveCompany.bankName,
    bankAccountNumber: effectiveCompany.bankAccountNumber,
    bankRecipientName: effectiveCompany.bankRecipientName,
    bankQrCodeDataUrl: bankQrCodeDataUrl ?? null,
  } : null;

  const props: TemplateProps = {
    quote: {
      ...quote,
      lineItems: quote.lineItems as TemplateLineItem[],
      // Use the resolved method (which handles legacy paymentUrl-only rows)
      // so templates don't need to replicate the fallback logic.
      paymentMethod: method,
    },
    client: effectiveClient,
    company: effectiveCompany,
    logoDataUrl,
    qrDataUrl,
    bankDetails,
  };

  const Component =
    quote.template === "CLASSIC" ? ClassicTemplate : ModernTemplate;

  return (await renderToBuffer(
    React.createElement(Component, props) as React.ReactElement<DocumentProps>,
  )) as Buffer;
}

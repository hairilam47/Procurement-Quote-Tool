import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { generateQrDataUrl } from "./qrcode";
import { ModernTemplate } from "./templates/modern";
import { ClassicTemplate } from "./templates/classic";
import type { TemplateProps, TemplateLineItem } from "./templates/types";

type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineTotal: string;
};

type QuoteData = {
  id: string;
  number: string;
  status: string;
  issueDate: Date;
  validUntil: Date;
  currency: string;
  discountType: string | null;
  discountValue: string;
  discountAmount: string;
  taxRate: string;
  taxAmount: string;
  subtotal: string;
  total: string;
  notes: string | null;
  terms: string | null;
  paymentUrl: string | null;
  showQrCode: boolean;
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
  logoUrl?: string | null;
};

async function fetchLogoDataUrl(
  url: string | null | undefined,
): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") ?? "image/png";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
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

  const [logoDataUrl, qrDataUrl] = await Promise.all([
    fetchLogoDataUrl(effectiveCompany.logoUrl),
    quote.showQrCode && quote.paymentUrl
      ? generateQrDataUrl(quote.paymentUrl)
      : Promise.resolve(undefined),
  ]);

  const props: TemplateProps = {
    quote: {
      ...quote,
      lineItems: quote.lineItems as TemplateLineItem[],
    },
    client: effectiveClient,
    company: effectiveCompany,
    logoDataUrl,
    qrDataUrl,
  };

  const Component =
    quote.template === "CLASSIC" ? ClassicTemplate : ModernTemplate;

  return (await renderToBuffer(
    React.createElement(Component, props),
  )) as Buffer;
}

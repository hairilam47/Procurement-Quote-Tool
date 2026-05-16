import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import type { TemplateProps } from "./types";

const C = {
  ink: "#1f2937",
  muted: "#6b7280",
  line: "#d1d5db",
  accent: "#1f2937",
  bg: "#ffffff",
  subtle: "#f9fafb",
  deferred: "#9ca3af",
  deferredBg: "#f3f4f6",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 48,
    fontSize: 10,
    color: C.ink,
    fontFamily: "Times-Roman",
    backgroundColor: C.bg,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    borderBottom: `2pt solid ${C.ink}`,
    paddingBottom: 16,
  },
  logo: { width: 120, height: 48, objectFit: "contain", marginBottom: 8 },
  companyName: {
    fontSize: 14,
    fontFamily: "Times-Bold",
    marginBottom: 4,
    textAlign: "center",
  },
  meta: { color: C.muted, fontSize: 9, lineHeight: 1.5, textAlign: "center" },
  titleSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Times-Bold",
    letterSpacing: 3,
    marginBottom: 4,
  },
  numberText: {
    fontSize: 11,
    color: C.muted,
  },
  billingSection: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 24,
  },
  billingCol: { flex: 1 },
  label: {
    fontSize: 8,
    fontFamily: "Times-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    color: C.muted,
    borderBottom: `1pt solid ${C.line}`,
    paddingBottom: 2,
  },
  bold: { fontFamily: "Times-Bold" },
  datesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingVertical: 8,
    borderTop: `1pt solid ${C.line}`,
    borderBottom: `1pt solid ${C.line}`,
  },
  dateBlock: { flex: 1 },
  table: { marginBottom: 20 },
  thead: {
    flexDirection: "row",
    borderTop: `2pt solid ${C.ink}`,
    borderBottom: `1pt solid ${C.ink}`,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 9,
    fontFamily: "Times-Bold",
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: `0.5pt solid ${C.line}`,
  },
  trDeferred: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: `0.5pt solid ${C.line}`,
    backgroundColor: C.deferredBg,
    opacity: 0.85,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderTop: `1pt dashed ${C.deferred}`,
    borderBottom: `0.5pt solid ${C.line}`,
    backgroundColor: C.deferredBg,
    marginTop: 2,
  },
  cDesc: { width: "50%", paddingRight: 8 },
  cQty: { width: "12%", textAlign: "right" },
  cUnit: { width: "13%", textAlign: "right" },
  cPrice: { width: "12%", textAlign: "right" },
  cTotal: { width: "13%", textAlign: "right" },
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  totalsBox: { width: 220 },
  totalsBoxDual: { width: 310 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  amountDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    marginTop: 3,
    borderTop: `1pt solid ${C.line}`,
    borderBottom: `1pt solid ${C.ink}`,
    fontFamily: "Times-Bold",
    fontSize: 11,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTop: `2pt solid ${C.ink}`,
    borderBottom: `1pt solid ${C.ink}`,
    fontSize: 12,
    fontFamily: "Times-Bold",
  },
  payWrap: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    border: `1pt solid ${C.line}`,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payTextWrap: { flex: 1, paddingRight: 12 },
  payHeading: { fontSize: 11, fontFamily: "Times-Bold", marginBottom: 4 },
  payBlurb: { color: C.muted, fontSize: 9, marginBottom: 8 },
  payButton: {
    backgroundColor: C.ink,
    color: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  payButtonText: { color: "#fff", fontFamily: "Times-Bold", fontSize: 10 },
  qr: { width: 72, height: 72 },
  notesBlock: { marginTop: 8, marginBottom: 8 },
  notesLabel: {
    fontSize: 9,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: "Times-Bold",
    borderBottom: `0.5pt solid ${C.line}`,
    paddingBottom: 2,
  },
  notesBody: { fontSize: 9.5, lineHeight: 1.5, color: C.muted },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTop: `1pt solid ${C.line}`,
    fontSize: 8,
    color: C.muted,
  },
});

const conv = (amount: string | number, rate: string | null | undefined): string => {
  if (!rate) return "";
  const n = typeof amount === "number" ? amount : Number(amount ?? 0);
  return (n * Number(rate)).toFixed(2);
};

const fmtMoney = (v: string | number, currency: string) => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
};

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function ClassicTemplate({
  quote,
  client,
  company,
  logoDataUrl,
  qrDataUrl,
  invoiceMode,
  bankDetails,
}: TemplateProps) {
  const cur = quote.currency;
  const sec = quote.secondaryCurrency ?? null;
  const rate = quote.secondaryExchangeRate ?? null;
  const hasSec = !!(sec && rate);

  const requiredItems = quote.lineItems.filter((li) => li.paymentRequired !== false);
  const deferredItems = quote.lineItems.filter((li) => li.paymentRequired === false);
  const hasDeferred = deferredItems.length > 0;

  const docTitle = invoiceMode?.documentTitle ?? "QUOTATION";
  // isFollowUp = true ONLY for follow-up invoices (invoiceMode present but not standalone and not receipt)
  const isFollowUp = !!invoiceMode && !invoiceMode.standaloneInvoice && !invoiceMode.receiptMode;
  // isInvoiceDoc = true for any invoice variant (standalone OR follow-up) — controls line-item rendering
  const isInvoiceDoc = !!invoiceMode && !invoiceMode.receiptMode;

  const colDesc = hasSec ? "38%" : "50%";
  const colQty = hasSec ? "10%" : "12%";
  const colUnit = hasSec ? "10%" : "13%";
  const colPrice = "12%";
  const colTotal = hasSec ? "15%" : "13%";

  return (
    <Document title={quote.number} author={company.name}>
      <Page size="A4" style={s.page}>
        {/* Centered header */}
        <View style={s.header} fixed>
          {logoDataUrl && <Image src={logoDataUrl} style={s.logo} />}
          <Text style={s.companyName}>{company.name}</Text>
          <Text style={s.meta}>
            {company.addressLine1}
            {company.addressLine2 ? `, ${company.addressLine2}` : ""} ·{" "}
            {company.city}
            {company.region ? `, ${company.region}` : ""} {company.postalCode} ·{" "}
            {company.country}
          </Text>
          {(company.email || company.phone) && (
            <Text style={s.meta}>
              {[company.email, company.phone, company.website]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
          {company.taxNumber && (
            <Text style={s.meta}>Tax No: {company.taxNumber}</Text>
          )}
          {company.registrationNumber && (
            <Text style={s.meta}>Reg No: {company.registrationNumber}</Text>
          )}
        </View>

        {/* Title */}
        <View style={s.titleSection}>
          <Text style={s.title}>{docTitle}</Text>
          <Text style={s.numberText}>{quote.number}</Text>
          {isFollowUp && invoiceMode && !invoiceMode.receiptMode && (
            <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
              Re: Quotation {invoiceMode.referenceNumber}
            </Text>
          )}
        </View>

        {/* Billing + From */}
        <View style={s.billingSection}>
          <View style={s.billingCol}>
            <Text style={s.label}>Prepared for</Text>
            <Text style={s.bold}>{client.name}</Text>
            {client.company && <Text>{client.company}</Text>}
            {client.addressLine1 && <Text>{client.addressLine1}</Text>}
            {client.addressLine2 && <Text>{client.addressLine2}</Text>}
            {(client.city || client.postalCode) && (
              <Text>
                {[client.city, client.region, client.postalCode]
                  .filter(Boolean)
                  .join(" ")}
              </Text>
            )}
            {client.country && <Text>{client.country}</Text>}
            <Text style={{ marginTop: 4 }}>{client.email}</Text>
            {client.phone && <Text>{client.phone}</Text>}
          </View>
          <View style={s.billingCol}>
            <Text style={s.label}>Details</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ color: C.muted }}>Status:</Text>
              <Text style={s.bold}>{quote.status}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ color: C.muted }}>Currency:</Text>
              <Text>{cur}{hasSec ? ` / ${sec}` : ""}</Text>
            </View>
            {hasSec && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                <Text style={{ color: C.muted, fontSize: 8 }}>Rate:</Text>
                <Text style={{ fontSize: 8, color: C.muted }}>
                  1 {cur} = {Number(rate).toFixed(6)} {sec}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={s.datesRow}>
          <View style={s.dateBlock}>
            <Text style={{ color: C.muted, fontSize: 9 }}>Issue date</Text>
            <Text style={s.bold}>{fmtDate(quote.issueDate)}</Text>
          </View>
          <View style={s.dateBlock}>
            {invoiceMode?.receiptMode && invoiceMode.paidAt ? (
              <>
                <Text style={{ color: C.muted, fontSize: 9 }}>Payment date</Text>
                <Text style={s.bold}>{fmtDate(invoiceMode.paidAt)}</Text>
                {invoiceMode.paymentMethodLabel ? (
                  <>
                    <Text style={{ color: C.muted, fontSize: 9, marginTop: 4 }}>Payment method</Text>
                    <Text style={s.bold}>{invoiceMode.paymentMethodLabel}</Text>
                  </>
                ) : null}
              </>
            ) : invoiceMode?.dueDate ? (
              <>
                <Text style={{ color: C.muted, fontSize: 9 }}>Due date</Text>
                <Text style={s.bold}>{fmtDate(invoiceMode.dueDate)}</Text>
              </>
            ) : quote.validUntil ? (
              <>
                <Text style={{ color: C.muted, fontSize: 9 }}>Valid until</Text>
                <Text style={s.bold}>{fmtDate(quote.validUntil)}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Line items */}
        <View style={s.table}>
          <View style={s.thead} fixed>
            <Text style={{ width: colDesc, paddingRight: 8 }}>Description</Text>
            <Text style={{ width: colQty, textAlign: "right" }}>Qty</Text>
            <Text style={{ width: colUnit, textAlign: "right" }}>Unit</Text>
            <Text style={{ width: colPrice, textAlign: "right" }}>Unit price</Text>
            <Text style={{ width: colTotal, textAlign: "right" }}>
              Total ({cur})
            </Text>
            {hasSec && (
              <Text style={{ width: "15%", textAlign: "right" }}>
                Total ({sec})
              </Text>
            )}
          </View>

          {/* In invoice mode (standalone or follow-up): show all items as regular rows */}
          {isInvoiceDoc ? (
            quote.lineItems.map((li) => (
              <View key={li.id} style={s.tr} wrap={false}>
                <View style={{ width: colDesc, paddingRight: 8 }}>
                  <Text>{li.description}</Text>
                  {li.sku ? (
                    <Text style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>
                      SKU: {li.sku}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ width: colQty, textAlign: "right" }}>
                  {Number(li.quantity).toFixed(2)}
                </Text>
                <Text style={{ width: colUnit, textAlign: "right" }}>{li.unit}</Text>
                <View style={{ width: colPrice, textAlign: "right" }}>
                  <Text style={{ textAlign: "right" }}>{fmtMoney(li.unitPrice, cur)}</Text>
                  {li.rateFormula ? (
                    <Text style={{ fontSize: 7, color: C.muted, textAlign: "right", marginTop: 2 }}>
                      ({li.rateFormula})
                    </Text>
                  ) : null}
                </View>
                <Text style={{ width: colTotal, textAlign: "right" }}>
                  {fmtMoney(li.lineTotal, cur)}
                </Text>
                {hasSec && (
                  <Text style={{ width: "15%", textAlign: "right", color: C.muted }}>
                    {fmtMoney(conv(li.lineTotal, rate), sec!)}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <>
              {/* Required items */}
              {requiredItems.map((li) => (
                <View key={li.id} style={s.tr} wrap={false}>
                  <View style={{ width: colDesc, paddingRight: 8 }}>
                    <Text>{li.description}</Text>
                    {li.sku ? (
                      <Text style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>
                        SKU: {li.sku}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ width: colQty, textAlign: "right" }}>
                    {Number(li.quantity).toFixed(2)}
                  </Text>
                  <Text style={{ width: colUnit, textAlign: "right" }}>{li.unit}</Text>
                  <View style={{ width: colPrice, textAlign: "right" }}>
                    <Text style={{ textAlign: "right" }}>{fmtMoney(li.unitPrice, cur)}</Text>
                    {li.rateFormula ? (
                      <Text style={{ fontSize: 7, color: C.muted, textAlign: "right", marginTop: 2 }}>
                        ({li.rateFormula})
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ width: colTotal, textAlign: "right" }}>
                    {fmtMoney(li.lineTotal, cur)}
                  </Text>
                  {hasSec && (
                    <Text style={{ width: "15%", textAlign: "right", color: C.muted }}>
                      {fmtMoney(conv(li.lineTotal, rate), sec!)}
                    </Text>
                  )}
                </View>
              ))}

              {/* Deferred items */}
              {hasDeferred && (
                <>
                  <View style={s.dividerRow} wrap={false}>
                    <Text style={{ fontSize: 8, fontFamily: "Times-Bold", color: C.deferred, textTransform: "uppercase", letterSpacing: 1 }}>
                      Deferred items (billed on delivery)
                    </Text>
                  </View>
                  {deferredItems.map((li) => (
                    <View key={li.id} style={s.trDeferred} wrap={false}>
                      <View style={{ width: colDesc, paddingRight: 8 }}>
                        <Text style={{ color: C.muted }}>{li.description}</Text>
                        {li.sku ? (
                          <Text style={{ fontSize: 8, color: C.deferred, marginTop: 2 }}>
                            SKU: {li.sku}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={{ width: colQty, textAlign: "right", color: C.muted }}>
                        {Number(li.quantity).toFixed(2)}
                      </Text>
                      <Text style={{ width: colUnit, textAlign: "right", color: C.muted }}>{li.unit}</Text>
                      <View style={{ width: colPrice, textAlign: "right" }}>
                        <Text style={{ textAlign: "right", color: C.muted }}>{fmtMoney(li.unitPrice, cur)}</Text>
                        {li.rateFormula ? (
                          <Text style={{ fontSize: 7, color: C.deferred, textAlign: "right", marginTop: 2 }}>
                            ({li.rateFormula})
                          </Text>
                        ) : null}
                      </View>
                      <Text style={{ width: colTotal, textAlign: "right", color: C.muted }}>
                        {fmtMoney(li.lineTotal, cur)}
                      </Text>
                      {hasSec && (
                        <Text style={{ width: "15%", textAlign: "right", color: C.deferred }}>
                          {fmtMoney(conv(li.lineTotal, rate), sec!)}
                        </Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* Totals — double-ruled */}
        <View style={s.totalsWrap} wrap={false}>
          <View style={hasSec ? s.totalsBoxDual : s.totalsBox}>
            {hasSec && (
              <View style={[s.totalRow, { paddingBottom: 4, borderBottom: `1pt solid ${C.line}` }]}>
                <Text style={{ flex: 1 }} />
                <Text style={{ width: "30%", textAlign: "right", fontFamily: "Times-Bold", fontSize: 8, color: C.muted }}>
                  {cur}
                </Text>
                <Text style={{ width: "30%", textAlign: "right", fontFamily: "Times-Bold", fontSize: 8, color: C.muted }}>
                  {sec}
                </Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={{ flex: 1 }}>Subtotal</Text>
              <Text style={{ width: hasSec ? "30%" : undefined, textAlign: hasSec ? "right" : undefined }}>
                {fmtMoney(quote.subtotal, cur)}
              </Text>
              {hasSec && (
                <Text style={{ width: "30%", textAlign: "right", color: C.muted }}>
                  {fmtMoney(conv(quote.subtotal, rate), sec!)}
                </Text>
              )}
            </View>
            {Number(quote.discountAmount) > 0 && (
              <View style={s.totalRow}>
                <Text style={{ flex: 1 }}>
                  Discount
                  {quote.discountType === "PERCENTAGE"
                    ? ` (${Number(quote.discountValue)}%)`
                    : ""}
                </Text>
                <Text style={{ width: hasSec ? "30%" : undefined, textAlign: hasSec ? "right" : undefined }}>
                  −{fmtMoney(quote.discountAmount, cur)}
                </Text>
                {hasSec && (
                  <Text style={{ width: "30%", textAlign: "right", color: C.muted }}>
                    −{fmtMoney(conv(quote.discountAmount, rate), sec!)}
                  </Text>
                )}
              </View>
            )}
            {Number(quote.taxRate) > 0 && (
              <View style={s.totalRow}>
                <Text style={{ flex: 1 }}>Tax ({Number(quote.taxRate)}%)</Text>
                <Text style={{ width: hasSec ? "30%" : undefined, textAlign: hasSec ? "right" : undefined }}>
                  {fmtMoney(quote.taxAmount, cur)}
                </Text>
                {hasSec && (
                  <Text style={{ width: "30%", textAlign: "right", color: C.muted }}>
                    {fmtMoney(conv(quote.taxAmount, rate), sec!)}
                  </Text>
                )}
              </View>
            )}
            {hasDeferred && (
              <View style={[s.amountDueRow, { marginBottom: 4 }]}>
                <Text style={{ flex: 1 }}>Amount due now</Text>
                <Text style={{ width: hasSec ? "30%" : undefined, textAlign: hasSec ? "right" : undefined }}>
                  {fmtMoney(quote.requiredTotal, cur)}
                </Text>
                {hasSec && (
                  <Text style={{ width: "30%", textAlign: "right" }}>
                    {fmtMoney(conv(quote.requiredTotal, rate), sec!)}
                  </Text>
                )}
              </View>
            )}
            <View style={s.grandRow}>
              <Text style={{ flex: 1 }}>{invoiceMode?.receiptMode ? "Total Paid" : hasDeferred ? "Full quotation total" : "Total Due"}</Text>
              <Text style={{ width: hasSec ? "30%" : undefined, textAlign: hasSec ? "right" : undefined }}>
                {fmtMoney(quote.total, cur)}
              </Text>
              {hasSec && (
                <Text style={{ width: "30%", textAlign: "right" }}>
                  {fmtMoney(conv(quote.total, rate), sec!)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Pay Now — conditional on paymentMethod */}
        {(() => {
          const method = quote.paymentMethod ?? "none";
          const showStripe = (method === "stripe" || method === "both") && quote.paymentUrl;
          const showBank = (method === "bank_transfer" || method === "both") && bankDetails && (bankDetails.bankName || bankDetails.bankAccountNumber || bankDetails.bankRecipientName);
          if (!showStripe && !showBank) return null;
          return (
            <View style={s.payWrap} wrap={false}>
              <View style={s.payTextWrap}>
                <Text style={s.payHeading}>Payment Instructions</Text>
                {showStripe && (
                  <>
                    <Text style={s.payBlurb}>
                      Please proceed with payment via the secure link below.
                      {qrDataUrl ? " You may also scan the QR code." : ""}
                    </Text>
                    <Link src={quote.paymentUrl!}>
                      <View style={s.payButton}>
                        <Text style={s.payButtonText}>Pay Now →</Text>
                      </View>
                    </Link>
                  </>
                )}
                {showBank && (
                  <View style={{ marginTop: showStripe ? 8 : 0 }}>
                    <Text style={[s.payBlurb, { marginBottom: 4, fontWeight: "bold" }]}>Bank Transfer Details</Text>
                    {bankDetails!.bankRecipientName ? <Text style={s.payBlurb}>Recipient: {bankDetails!.bankRecipientName}</Text> : null}
                    {bankDetails!.bankName ? <Text style={s.payBlurb}>Bank: {bankDetails!.bankName}</Text> : null}
                    {bankDetails!.bankAccountNumber ? <Text style={s.payBlurb}>Account: {bankDetails!.bankAccountNumber}</Text> : null}
                  </View>
                )}
              </View>
              {showStripe && qrDataUrl && (
                <Link src={quote.paymentUrl!}>
                  <Image src={qrDataUrl} style={s.qr} />
                </Link>
              )}
              {showBank && bankDetails!.bankQrCodeDataUrl && (
                <Image src={bankDetails!.bankQrCodeDataUrl} style={s.qr} />
              )}
            </View>
          );
        })()}

        {/* Notes */}
        {quote.notes && (
          <View style={s.notesBlock} wrap={false}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesBody}>{quote.notes}</Text>
          </View>
        )}

        {/* Terms */}
        {quote.terms && (
          <View style={s.notesBlock} wrap={false}>
            <Text style={s.notesLabel}>Terms & Conditions</Text>
            <Text style={s.notesBody}>{quote.terms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>
            {company.name} · {invoiceMode?.receiptMode ? `Receipt · Ref: ${invoiceMode.referenceNumber}` : invoiceMode?.standaloneInvoice ? `Invoice · ${quote.number}` : isFollowUp && invoiceMode ? `Follow-up Invoice · Ref: ${invoiceMode.referenceNumber}` : `Quotation ${quote.number}`}
          </Text>
          <Text style={{ color: C.line }}>KuotFlow</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

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
  ink: "#0f172a",
  muted: "#475569",
  line: "#e2e8f0",
  accent: "#2563eb",
  accentSoft: "#dbeafe",
  bg: "#ffffff",
  subtle: "#f8fafc",
  deferred: "#94a3b8",
  deferredBg: "#f1f5f9",
};

const conv = (amount: string | number, rate: string | null | undefined): string => {
  if (!rate) return "";
  const n = typeof amount === "number" ? amount : Number(amount ?? 0);
  return (n * Number(rate)).toFixed(2);
};

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontSize: 10,
    color: C.ink,
    fontFamily: "Helvetica",
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  logo: { width: 110, height: 40, objectFit: "contain" },
  companyBlock: { textAlign: "right" },
  companyName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  meta: { color: C.muted, fontSize: 9, lineHeight: 1.4 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 1,
  },
  numberPill: {
    backgroundColor: C.accentSoft,
    color: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  twoCol: { flexDirection: "row", gap: 16, marginBottom: 16 },
  col: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    backgroundColor: C.subtle,
    borderLeft: `3pt solid ${C.accent}`,
  },
  colLabel: {
    fontSize: 8,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  bold: { fontFamily: "Helvetica-Bold" },
  datesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 10,
    borderTop: `1pt solid ${C.line}`,
    borderBottom: `1pt solid ${C.line}`,
  },
  dateBlock: { flex: 1 },
  table: { marginBottom: 16 },
  thead: {
    flexDirection: "row",
    backgroundColor: C.ink,
    color: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: `1pt solid ${C.line}`,
  },
  trAlt: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: `1pt solid ${C.line}`,
    backgroundColor: C.subtle,
  },
  trDeferred: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: `1pt solid ${C.line}`,
    backgroundColor: C.deferredBg,
    opacity: 0.8,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: C.deferredBg,
    borderBottom: `1pt solid ${C.line}`,
    borderTop: `1pt dashed ${C.deferred}`,
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
  totalsBox: { width: 240 },
  totalsBoxDual: { width: 320 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  amountDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 2,
    borderTop: `1pt solid ${C.line}`,
    backgroundColor: C.accentSoft,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    fontSize: 11,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 4,
    borderTop: `2pt solid ${C.ink}`,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  payWrap: {
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    borderRadius: 6,
    backgroundColor: C.subtle,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payTextWrap: { flex: 1, paddingRight: 12 },
  payHeading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  payBlurb: { color: C.muted, fontSize: 9, marginBottom: 8 },
  payButton: {
    backgroundColor: C.accent,
    color: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  payButtonText: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  qr: { width: 80, height: 80 },
  notesBlock: { marginTop: 8, marginBottom: 8 },
  notesLabel: {
    fontSize: 9,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  notesBody: { fontSize: 9.5, lineHeight: 1.5, color: C.muted },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTop: `1pt solid ${C.line}`,
    fontSize: 8,
    color: C.muted,
  },
});

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

export function ModernTemplate({
  quote,
  client,
  company,
  logoDataUrl,
  qrDataUrl,
  invoiceMode,
}: TemplateProps) {
  const cur = quote.currency;
  const sec = quote.secondaryCurrency ?? null;
  const rate = quote.secondaryExchangeRate ?? null;
  const hasSec = !!(sec && rate);

  const requiredItems = quote.lineItems.filter((li) => li.paymentRequired !== false);
  const deferredItems = quote.lineItems.filter((li) => li.paymentRequired === false);
  const hasDeferred = deferredItems.length > 0;

  const docTitle = invoiceMode?.documentTitle ?? "QUOTATION";
  const isFollowUp = !!invoiceMode;

  const colDesc = hasSec ? "38%" : "50%";
  const colQty = hasSec ? "10%" : "12%";
  const colUnit = hasSec ? "10%" : "13%";
  const colPrice = "12%";
  const colTotal = hasSec ? "15%" : "13%";

  return (
    <Document title={quote.number} author={company.name}>
      <Page size="A4" style={s.page}>
        {/* Fixed header */}
        <View style={s.header} fixed>
          {logoDataUrl ? (
            <Image src={logoDataUrl} style={s.logo} />
          ) : (
            <View>
              <Text style={[s.companyName, { color: C.accent }]}>
                {company.name}
              </Text>
            </View>
          )}
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{company.name}</Text>
            <Text style={s.meta}>
              {company.addressLine1}
              {company.addressLine2 ? `, ${company.addressLine2}` : ""}
            </Text>
            <Text style={s.meta}>
              {company.city}
              {company.region ? `, ${company.region}` : ""} {company.postalCode}
            </Text>
            <Text style={s.meta}>{company.country}</Text>
            {company.phone && <Text style={s.meta}>{company.phone}</Text>}
            <Text style={s.meta}>{company.email}</Text>
            {company.website && <Text style={s.meta}>{company.website}</Text>}
            {company.taxNumber && (
              <Text style={s.meta}>Tax No: {company.taxNumber}</Text>
            )}
            {company.registrationNumber && (
              <Text style={s.meta}>Reg No: {company.registrationNumber}</Text>
            )}
          </View>
        </View>

        {/* Title */}
        <View style={s.titleRow}>
          <View>
            <Text style={s.title}>{docTitle}</Text>
            {isFollowUp && invoiceMode && (
              <Text style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>
                Re: Quotation {invoiceMode.referenceNumber}
              </Text>
            )}
          </View>
          <Text style={s.numberPill}>{quote.number}</Text>
        </View>

        {/* Bill-to + Status */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.colLabel}>Bill to</Text>
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
          <View style={s.col}>
            <Text style={s.colLabel}>Status</Text>
            <Text style={s.bold}>{quote.status}</Text>
            <Text style={[s.colLabel, { marginTop: 8 }]}>Currency</Text>
            <Text>{cur}{hasSec ? ` / ${sec}` : ""}</Text>
            {hasSec && (
              <>
                <Text style={[s.colLabel, { marginTop: 8 }]}>Exchange Rate</Text>
                <Text style={{ fontSize: 8, color: C.muted }}>
                  1 {cur} = {Number(rate).toFixed(6)} {sec}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={s.datesRow}>
          <View style={s.dateBlock}>
            <Text style={s.colLabel}>Issue date</Text>
            <Text style={s.bold}>{fmtDate(quote.issueDate)}</Text>
          </View>
          <View style={s.dateBlock}>
            <Text style={s.colLabel}>Valid until</Text>
            <Text style={s.bold}>{fmtDate(quote.validUntil)}</Text>
          </View>
        </View>

        {/* Line items table */}
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

          {/* In follow-up invoice mode: show all items as regular rows */}
          {isFollowUp ? (
            quote.lineItems.map((li, idx) => (
              <View key={li.id} style={idx % 2 === 0 ? s.tr : s.trAlt} wrap={false}>
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
              {requiredItems.map((li, idx) => (
                <View key={li.id} style={idx % 2 === 0 ? s.tr : s.trAlt} wrap={false}>
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

              {/* Deferred items section */}
              {hasDeferred && (
                <>
                  <View style={s.dividerRow} wrap={false}>
                    <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.deferred, textTransform: "uppercase", letterSpacing: 1 }}>
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

        {/* Totals */}
        <View style={s.totalsWrap} wrap={false}>
          <View style={hasSec ? s.totalsBoxDual : s.totalsBox}>
            {hasSec && (
              <View style={[s.totalRow, { paddingBottom: 4, borderBottom: `1pt solid ${C.line}` }]}>
                <Text style={{ width: "40%", color: C.muted, fontSize: 8 }} />
                <Text style={{ width: "30%", textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 8, color: C.muted }}>
                  {cur}
                </Text>
                <Text style={{ width: "30%", textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 8, color: C.muted }}>
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
              <Text style={{ flex: 1 }}>{hasDeferred ? "Full quotation total" : "Total"}</Text>
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

        {/* Pay Now */}
        {quote.paymentUrl ? (
          <View style={s.payWrap} wrap={false}>
            <View style={s.payTextWrap}>
              <Text style={s.payHeading}>Ready to proceed?</Text>
              <Text style={s.payBlurb}>
                Pay this quotation securely online.
                {qrDataUrl ? " Scan the QR with your phone, or click the button." : ""}
              </Text>
              <Link src={quote.paymentUrl}>
                <View style={s.payButton}>
                  <Text style={s.payButtonText}>Click here to pay online →</Text>
                </View>
              </Link>
            </View>
            {qrDataUrl && (
              <Link src={quote.paymentUrl}>
                <Image src={qrDataUrl} style={s.qr} />
              </Link>
            )}
          </View>
        ) : null}

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

        {/* Fixed footer */}
        <View style={s.footer} fixed>
          <Text>
            {company.name} · {isFollowUp && invoiceMode ? `Follow-up Invoice · Ref: ${invoiceMode.referenceNumber}` : `Quotation ${quote.number}`}
          </Text>
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

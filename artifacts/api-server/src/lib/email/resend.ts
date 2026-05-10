import { Resend } from "resend";
import { eq } from "drizzle-orm";
import {
  db,
  quotationsTable,
  lineItemsTable,
  clientsTable,
  companySettingsTable,
} from "@workspace/db";
import { renderReceiptPdf } from "../pdf/render";

let _resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resendClient) _resendClient = new Resend(key);
  return _resendClient;
}

type ReceiptEmailArgs = {
  to: string;
  clientName: string;
  companyName: string;
  quotationNumber: string;
  totalPaid: string;
  currency: string;
  paidAt: Date | null;
  pdfBuffer: Buffer;
};

function buildReceiptHtml(args: ReceiptEmailArgs): string {
  const { clientName, companyName, quotationNumber, totalPaid, currency, paidAt } = args;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(totalPaid));
  const formattedDate = paidAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(paidAt))
    : "N/A";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#10b981;padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Payment Confirmed</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Your receipt is attached to this email</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;">Dear ${clientName},</p>
            <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.65;">
              Thank you for your payment. We have received it successfully.
              Please find your receipt PDF attached to this email for your records.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Quotation</div>
                  <div style="color:#111827;font-size:15px;font-weight:600;margin-top:4px;font-family:monospace;">${quotationNumber}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Amount Paid</div>
                  <div style="color:#10b981;font-size:20px;font-weight:700;margin-top:4px;">${formattedAmount}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Payment Date</div>
                  <div style="color:#111827;font-size:15px;font-weight:500;margin-top:4px;">${formattedDate}</div>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
              If you have any questions about this receipt, please don&rsquo;t hesitate to get in touch with us.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Sent by <strong style="color:#6b7280;">${companyName}</strong>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendReceiptEmail(args: ReceiptEmailArgs): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn("[email] Skipping receipt email — RESEND_API_KEY not set");
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const { error } = await client.emails.send({
    from,
    to: args.to,
    subject: `Payment Receipt \u2014 ${args.quotationNumber}`,
    html: buildReceiptHtml(args),
    attachments: [
      {
        filename: `REC-${args.quotationNumber}.pdf`,
        content: args.pdfBuffer.toString("base64"),
      },
    ],
  });
  if (error) {
    throw new Error(`Resend error: ${(error as { message?: string }).message ?? String(error)}`);
  }
}

/**
 * High-level helper: load all required data, generate the receipt PDF, and
 * send the receipt email to the client. Safe to call fire-and-forget — all
 * errors are thrown so the caller can .catch() them.
 *
 * Silently skips (with a console.warn) when:
 *  - The quotation is not PAID
 *  - The client has no email address on record
 *  - Company settings have not been configured
 *  - RESEND_API_KEY is absent
 */
export async function sendReceiptForQuotation(quotationId: string): Promise<void> {
  const [quote] = await db
    .select()
    .from(quotationsTable)
    .where(eq(quotationsTable.id, quotationId));

  if (!quote || quote.status !== "PAID") return;

  type ClientSnap = { email?: string | null; name?: string };
  type CompanySnap = { name?: string };

  const snap = quote.clientSnapshot as ClientSnap | null;
  let clientEmail: string | null = snap?.email ?? null;
  let clientName: string = snap?.name ?? "";

  if (!clientEmail) {
    const [liveClient] = await db
      .select({ email: clientsTable.email, name: clientsTable.name })
      .from(clientsTable)
      .where(eq(clientsTable.id, quote.clientId));
    clientEmail = liveClient?.email ?? null;
    if (!clientName) clientName = liveClient?.name ?? "Customer";
  }

  if (!clientEmail) {
    console.warn(`[email] Skipping receipt for ${quotationId}: no client email on record`);
    return;
  }

  const [[...lineItems], settingsRows] = await Promise.all([
    db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, quote.id))
      .orderBy(lineItemsTable.position),
    db.select().from(companySettingsTable).limit(1),
  ]);

  const settings = settingsRows[0] ?? null;
  if (!settings) {
    console.warn(`[email] Skipping receipt for ${quotationId}: company settings not configured`);
    return;
  }

  const [liveClient] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, quote.clientId));

  const companySnap = quote.companySnapshot as CompanySnap | null;
  const companyName = companySnap?.name ?? settings.name;

  const pdfBuffer = await renderReceiptPdf({
    quote: { ...quote, lineItems },
    client: liveClient,
    company: settings,
  });

  await sendReceiptEmail({
    to: clientEmail,
    clientName: clientName || "Customer",
    companyName,
    quotationNumber: quote.number,
    totalPaid: quote.requiredTotal ?? quote.total,
    currency: quote.currency,
    paidAt: quote.paidAt,
    pdfBuffer,
  });

  console.log(`[email] Receipt sent for ${quotationId} to ${clientEmail}`);
}

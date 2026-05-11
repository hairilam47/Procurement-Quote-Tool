import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  json,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { clientsTable } from "./clients";
import { usersTable } from "./users";

export const invoicesTable = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    status: text("status").notNull().default("DRAFT"),
    issueDate: timestamp("issue_date").notNull().defaultNow(),
    dueDate: timestamp("due_date").notNull(),
    clientId: text("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "restrict" }),
    clientSnapshot: json("client_snapshot"),
    companySnapshot: json("company_snapshot"),
    currency: text("currency").notNull().default("USD"),
    secondaryCurrency: text("secondary_currency"),
    secondaryExchangeRate: numeric("secondary_exchange_rate", { precision: 18, scale: 6 }),
    discountType: text("discount_type"),
    discountValue: numeric("discount_value", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    requiredTotal: numeric("required_total", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    terms: text("terms"),
    paymentUrl: text("payment_url"),
    showQrCode: boolean("show_qr_code").notNull().default(true),
    paymentMethod: text("payment_method").notNull().default("none"),
    template: text("template").notNull().default("MODERN"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    sentAt: timestamp("sent_at"),
    paidAt: timestamp("paid_at"),
  },
  (t) => [
    index("invoices_client_id_idx").on(t.clientId),
    index("invoices_user_id_idx").on(t.userId),
    index("invoices_status_idx").on(t.status),
    index("invoices_number_idx").on(t.number),
    uniqueIndex("invoices_user_id_number_uidx").on(t.userId, t.number),
  ],
);

export const invoiceLineItemsTable = pgTable(
  "invoice_line_items",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoicesTable.id, { onDelete: "cascade" }),
    sku: text("sku"),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: text("unit").notNull().default("hours"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    rateFormula: text("rate_formula"),
    paymentRequired: boolean("payment_required").notNull().default(true),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("invoice_line_items_invoice_id_idx").on(t.invoiceId)],
);

export const invoicesRelations = relations(invoicesTable, ({ one, many }) => ({
  client: one(clientsTable, {
    fields: [invoicesTable.clientId],
    references: [clientsTable.id],
  }),
  lineItems: many(invoiceLineItemsTable),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItemsTable, ({ one }) => ({
  invoice: one(invoicesTable, {
    fields: [invoiceLineItemsTable.invoiceId],
    references: [invoicesTable.id],
  }),
}));

export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertInvoice = typeof invoicesTable.$inferInsert;
export type InvoiceLineItem = typeof invoiceLineItemsTable.$inferSelect;
export type InsertInvoiceLineItem = typeof invoiceLineItemsTable.$inferInsert;

import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  json,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { clientsTable } from "./clients";

export const quotationsTable = pgTable(
  "quotations",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull().unique(),
    status: text("status").notNull().default("DRAFT"),
    issueDate: timestamp("issue_date").notNull().defaultNow(),
    validUntil: timestamp("valid_until").notNull(),
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
    acceptedAt: timestamp("accepted_at"),
    paidAt: timestamp("paid_at"),
    invoiceId: text("invoice_id"),
  },
  (t) => [
    index("quotations_client_id_idx").on(t.clientId),
    index("quotations_status_idx").on(t.status),
    index("quotations_number_idx").on(t.number),
  ],
);

export const lineItemsTable = pgTable(
  "line_items",
  {
    id: text("id").primaryKey(),
    quotationId: text("quotation_id")
      .notNull()
      .references(() => quotationsTable.id, { onDelete: "cascade" }),
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
  (t) => [index("line_items_quotation_id_idx").on(t.quotationId)],
);

export const quotationsRelations = relations(quotationsTable, ({ one, many }) => ({
  client: one(clientsTable, {
    fields: [quotationsTable.clientId],
    references: [clientsTable.id],
  }),
  lineItems: many(lineItemsTable),
}));

export const lineItemsRelations = relations(lineItemsTable, ({ one }) => ({
  quotation: one(quotationsTable, {
    fields: [lineItemsTable.quotationId],
    references: [quotationsTable.id],
  }),
}));

export const clientsRelations = relations(clientsTable, ({ many }) => ({
  quotations: many(quotationsTable),
}));

export type Quotation = typeof quotationsTable.$inferSelect;
export type InsertQuotation = typeof quotationsTable.$inferInsert;
export type LineItem = typeof lineItemsTable.$inferSelect;
export type InsertLineItem = typeof lineItemsTable.$inferInsert;

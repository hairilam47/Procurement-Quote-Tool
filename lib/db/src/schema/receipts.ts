import {
  pgTable,
  text,
  timestamp,
  numeric,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { invoicesTable } from "./invoices";
import { usersTable } from "./users";

export const receiptsTable = pgTable(
  "receipts",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoicesTable.id, { onDelete: "restrict" })
      .unique(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    paidAt: timestamp("paid_at").notNull(),
    paymentMethod: text("payment_method").notNull().default("manual"),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("USD"),
    clientSnapshot: json("client_snapshot"),
    companySnapshot: json("company_snapshot"),
    lineItemsSnapshot: json("line_items_snapshot"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("receipts_user_id_idx").on(t.userId),
    index("receipts_invoice_id_idx").on(t.invoiceId),
    uniqueIndex("receipts_user_id_number_uidx").on(t.userId, t.number),
  ],
);

export const receiptsRelations = relations(receiptsTable, ({ one }) => ({
  invoice: one(invoicesTable, {
    fields: [receiptsTable.invoiceId],
    references: [invoicesTable.id],
  }),
}));

export type Receipt = typeof receiptsTable.$inferSelect;
export type InsertReceipt = typeof receiptsTable.$inferInsert;

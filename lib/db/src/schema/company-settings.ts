import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const companySettingsTable = pgTable("company_settings", {
  id: text("id").primaryKey().default("singleton"),
  name: text("name").notNull(),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  region: text("region"),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  phone: text("phone"),
  email: text("email").notNull(),
  website: text("website"),
  taxNumber: text("tax_number"),
  registrationNumber: text("registration_number"),
  logoUrl: text("logo_url"),
  currency: text("currency").notNull().default("USD"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  defaultTerms: text("default_terms"),
  defaultNotes: text("default_notes"),
  defaultTemplate: text("default_template").notNull().default("MODERN"),
  defaultPaymentUrl: text("default_payment_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CompanySettings = typeof companySettingsTable.$inferSelect;
export type InsertCompanySettings = typeof companySettingsTable.$inferInsert;

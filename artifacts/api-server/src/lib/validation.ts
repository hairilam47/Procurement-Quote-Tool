import { z } from "zod";

export const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description required").max(2000),
  quantity: z.coerce.number().positive("Quantity must be > 0"),
  unit: z.enum(["hours", "days", "fixed"]).default("hours"),
  unitPrice: z.coerce.number().nonnegative(),
  position: z.number().int().nonnegative().default(0),
});

export const quotationSchema = z
  .object({
    clientId: z.string().min(1, "Pick a client"),
    issueDate: z.coerce.date(),
    validUntil: z.coerce.date(),
    currency: z.string().length(3).default("USD"),
    discountType: z.enum(["PERCENTAGE", "FIXED"]).nullable().optional(),
    discountValue: z.coerce.number().nonnegative().default(0),
    taxRate: z.coerce.number().min(0).max(100).default(0),
    notes: z.string().max(5000).optional().nullable(),
    terms: z.string().max(5000).optional().nullable(),
    paymentUrl: z
      .string()
      .url()
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    showQrCode: z.boolean().default(true),
    template: z.enum(["MODERN", "CLASSIC"]).default("MODERN"),
    lineItems: z.array(lineItemSchema).min(1, "At least one line item"),
  })
  .refine((d) => d.validUntil >= d.issueDate, {
    message: "Valid-until must be on or after issue date",
    path: ["validUntil"],
  });

export type QuotationInput = z.infer<typeof quotationSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;

export const clientSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional().nullable(),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const settingsSchema = z.object({
  name: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1),
  region: z.string().optional().nullable(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email(),
  website: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  taxNumber: z.string().optional().nullable(),
  logoUrl: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  currency: z.string().length(3),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  defaultTerms: z.string().optional().nullable(),
  defaultNotes: z.string().optional().nullable(),
  defaultTemplate: z.enum(["MODERN", "CLASSIC"]),
  defaultPaymentUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const changeStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "PAID", "EXPIRED"]),
});

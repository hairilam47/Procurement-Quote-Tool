export type TemplateLineItem = {
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

export type InvoiceMode = {
  documentTitle: string;
  referenceNumber: string;
  paidAt?: Date | string | null;
  receiptMode?: boolean;
};

export type BankDetails = {
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankRecipientName?: string | null;
  bankQrCodeDataUrl?: string | null;
};

export type TemplateProps = {
  invoiceMode?: InvoiceMode;
  quote: {
    id: string;
    number: string;
    status: string;
    issueDate: Date | string;
    validUntil: Date | string;
    currency: string;
    secondaryCurrency?: string | null;
    secondaryExchangeRate?: string | null;
    discountType: string | null | undefined;
    discountValue: string;
    discountAmount: string;
    taxRate: string;
    taxAmount: string;
    subtotal: string;
    total: string;
    requiredTotal: string;
    notes: string | null | undefined;
    terms: string | null | undefined;
    paymentUrl: string | null | undefined;
    showQrCode: boolean;
    paymentMethod: string;
    template: string;
    lineItems: TemplateLineItem[];
  };
  client: {
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
  company: {
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
  };
  logoDataUrl?: string;
  qrDataUrl?: string;
  bankDetails?: BankDetails | null;
};

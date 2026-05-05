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

export type TemplateProps = {
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
    logoUrl?: string | null;
  };
  logoDataUrl?: string;
  qrDataUrl?: string;
};

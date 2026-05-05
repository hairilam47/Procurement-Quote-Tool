import Decimal from "decimal.js";

export type LineForCalc = {
  quantity: number | string;
  unitPrice: number | string;
  paymentRequired?: boolean;
};

export type Totals = {
  subtotal: Decimal;
  discountAmount: Decimal;
  taxableBase: Decimal;
  taxAmount: Decimal;
  total: Decimal;
  lineTotals: Decimal[];
  requiredTotal: Decimal;
};

const D = (v: number | string | null | undefined) =>
  new Decimal(v?.toString() ?? "0");

export function computeTotals(
  lines: LineForCalc[],
  discount: {
    type: "PERCENTAGE" | "FIXED" | null | undefined;
    value: number | string | null | undefined;
  },
  taxRatePct: number | string | null | undefined,
): Totals {
  const lineTotals = lines.map((l) =>
    D(l.quantity).mul(D(l.unitPrice)).toDecimalPlaces(2),
  );
  const subtotal = lineTotals.reduce(
    (acc, x) => acc.add(x),
    new Decimal(0),
  );

  let discountAmount = new Decimal(0);
  if (discount.type === "PERCENTAGE") {
    discountAmount = subtotal
      .mul(D(discount.value))
      .div(100)
      .toDecimalPlaces(2);
  } else if (discount.type === "FIXED") {
    discountAmount = D(discount.value).toDecimalPlaces(2);
  }
  if (discountAmount.gt(subtotal)) discountAmount = subtotal;
  if (discountAmount.lt(0)) discountAmount = new Decimal(0);

  const taxableBase = subtotal.sub(discountAmount);
  const taxAmount = taxableBase
    .mul(D(taxRatePct))
    .div(100)
    .toDecimalPlaces(2);
  const total = taxableBase.add(taxAmount).toDecimalPlaces(2);

  // Required-only subtotal (items with paymentRequired !== false)
  const requiredLineTotals = lines.map((l, i) =>
    l.paymentRequired === false ? new Decimal(0) : lineTotals[i],
  );
  const requiredSubtotal = requiredLineTotals.reduce(
    (acc, x) => acc.add(x),
    new Decimal(0),
  );

  let requiredDiscountAmount = new Decimal(0);
  if (discount.type === "PERCENTAGE") {
    requiredDiscountAmount = requiredSubtotal
      .mul(D(discount.value))
      .div(100)
      .toDecimalPlaces(2);
  } else if (discount.type === "FIXED") {
    // Proportional allocation of fixed discount
    if (subtotal.gt(0)) {
      requiredDiscountAmount = discountAmount
        .mul(requiredSubtotal)
        .div(subtotal)
        .toDecimalPlaces(2);
    }
  }
  if (requiredDiscountAmount.gt(requiredSubtotal)) requiredDiscountAmount = requiredSubtotal;
  if (requiredDiscountAmount.lt(0)) requiredDiscountAmount = new Decimal(0);

  const requiredTaxableBase = requiredSubtotal.sub(requiredDiscountAmount);
  const requiredTaxAmount = requiredTaxableBase
    .mul(D(taxRatePct))
    .div(100)
    .toDecimalPlaces(2);
  const requiredTotal = requiredTaxableBase.add(requiredTaxAmount).toDecimalPlaces(2);

  return { subtotal, discountAmount, taxableBase, taxAmount, total, lineTotals, requiredTotal };
}

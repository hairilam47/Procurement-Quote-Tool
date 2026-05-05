import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeTotals } from "./calculations.js";

describe("computeTotals — requiredTotal", () => {
  test("all items required: requiredTotal equals total", () => {
    const lines = [
      { quantity: 2, unitPrice: 100, paymentRequired: true },
      { quantity: 3, unitPrice: 50, paymentRequired: true },
    ];
    const result = computeTotals(lines, { type: null, value: 0 }, 0);
    assert.equal(result.requiredTotal.toFixed(2), result.total.toFixed(2));
    assert.equal(result.requiredTotal.toFixed(2), "350.00");
  });

  test("all items deferred: requiredTotal is zero", () => {
    const lines = [
      { quantity: 1, unitPrice: 500, paymentRequired: false },
      { quantity: 2, unitPrice: 200, paymentRequired: false },
    ];
    const result = computeTotals(lines, { type: null, value: 0 }, 0);
    assert.equal(result.requiredTotal.toFixed(2), "0.00");
    assert.equal(result.total.toFixed(2), "900.00");
  });

  test("mixed required/deferred with no discount or tax", () => {
    const lines = [
      { quantity: 1, unitPrice: 1000, paymentRequired: true },
      { quantity: 12, unitPrice: 200, paymentRequired: false },
    ];
    const result = computeTotals(lines, { type: null, value: 0 }, 0);
    assert.equal(result.requiredTotal.toFixed(2), "1000.00");
    assert.equal(result.total.toFixed(2), "3400.00");
  });

  test("mixed required/deferred with percentage discount", () => {
    const lines = [
      { quantity: 1, unitPrice: 1000, paymentRequired: true },
      { quantity: 1, unitPrice: 1000, paymentRequired: false },
    ];
    // 10% discount on subtotal=2000 => discountAmount=200
    // requiredSubtotal=1000, requiredDiscount=1000*(10/100)=100
    // requiredTotal = (1000-100) = 900
    const result = computeTotals(lines, { type: "PERCENTAGE", value: 10 }, 0);
    assert.equal(result.total.toFixed(2), "1800.00");
    assert.equal(result.requiredTotal.toFixed(2), "900.00");
  });

  test("mixed required/deferred with fixed discount (proportional)", () => {
    const lines = [
      { quantity: 1, unitPrice: 1000, paymentRequired: true },
      { quantity: 1, unitPrice: 3000, paymentRequired: false },
    ];
    // subtotal=4000, fixedDiscount=400, discountAmount=400
    // requiredSubtotal=1000, proportion=1000/4000=0.25
    // requiredDiscount=400*0.25=100
    // requiredTotal=(1000-100)=900
    const result = computeTotals(lines, { type: "FIXED", value: 400 }, 0);
    assert.equal(result.total.toFixed(2), "3600.00");
    assert.equal(result.requiredTotal.toFixed(2), "900.00");
  });

  test("mixed required/deferred with tax applied proportionally", () => {
    const lines = [
      { quantity: 1, unitPrice: 1000, paymentRequired: true },
      { quantity: 1, unitPrice: 1000, paymentRequired: false },
    ];
    // No discount. Tax 10% on total=2000 => taxAmount=200, total=2200
    // requiredTaxableBase=1000, requiredTax=100, requiredTotal=1100
    const result = computeTotals(lines, { type: null, value: 0 }, 10);
    assert.equal(result.total.toFixed(2), "2200.00");
    assert.equal(result.requiredTotal.toFixed(2), "1100.00");
  });

  test("percentage discount + tax on mixed items", () => {
    const lines = [
      { quantity: 1, unitPrice: 2000, paymentRequired: true },
      { quantity: 1, unitPrice: 2000, paymentRequired: false },
    ];
    // subtotal=4000, 20% discount=800, taxableBase=3200, tax10%=320, total=3520
    // requiredSubtotal=2000, requiredDiscount=2000*(20/100)=400
    // requiredTaxable=1600, requiredTax=160, requiredTotal=1760
    const result = computeTotals(lines, { type: "PERCENTAGE", value: 20 }, 10);
    assert.equal(result.total.toFixed(2), "3520.00");
    assert.equal(result.requiredTotal.toFixed(2), "1760.00");
  });

  test("paymentRequired defaults to required when undefined", () => {
    const lines = [
      { quantity: 1, unitPrice: 500 },
      { quantity: 1, unitPrice: 500, paymentRequired: false },
    ];
    const result = computeTotals(lines, { type: null, value: 0 }, 0);
    // First item (undefined paymentRequired) treated as required
    assert.equal(result.requiredTotal.toFixed(2), "500.00");
    assert.equal(result.total.toFixed(2), "1000.00");
  });
});

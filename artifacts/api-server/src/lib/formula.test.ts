import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormula } from "./formula.js";

describe("evaluateFormula", () => {
  describe("valid expressions", () => {
    test("simple multiplication", () => {
      assert.equal(evaluateFormula("30 * 0.0032"), 30 * 0.0032);
    });

    test("addition", () => {
      assert.equal(evaluateFormula("1 + 2"), 3);
    });

    test("subtraction", () => {
      assert.equal(evaluateFormula("10 - 3"), 7);
    });

    test("division", () => {
      assert.equal(evaluateFormula("9 / 3"), 3);
    });

    test("parentheses", () => {
      assert.equal(evaluateFormula("(2 + 3) * 4"), 20);
    });

    test("complex multi-operator", () => {
      const result = evaluateFormula("30 * 0.0032 * 0.0043");
      assert.ok(Math.abs(result - 30 * 0.0032 * 0.0043) < 1e-10);
    });

    test("integer literals only", () => {
      assert.equal(evaluateFormula("100"), 100);
    });

    test("decimal inputs", () => {
      assert.equal(evaluateFormula("1.5 * 2"), 3);
    });

    test("whitespace-tolerant", () => {
      assert.equal(evaluateFormula("  5  +  5  "), 10);
    });
  });

  describe("invalid characters", () => {
    test("rejects letters", () => {
      assert.throws(
        () => evaluateFormula("abc"),
        /invalid characters/,
      );
    });

    test("rejects variable-like identifiers", () => {
      assert.throws(
        () => evaluateFormula("days * rate"),
        /invalid characters/,
      );
    });

    test("rejects string literals", () => {
      assert.throws(
        () => evaluateFormula(`"hello"`),
        /invalid characters/,
      );
    });

    test("rejects backtick template literals", () => {
      assert.throws(
        () => evaluateFormula("`code`"),
        /invalid characters/,
      );
    });
  });

  describe("invalid results", () => {
    test("rejects division by zero (Infinity)", () => {
      assert.throws(
        () => evaluateFormula("1 / 0"),
        /not a finite number/,
      );
    });

    test("rejects 0/0 (NaN)", () => {
      assert.throws(
        () => evaluateFormula("0 / 0"),
        /not a finite number/,
      );
    });

    test("rejects negative results", () => {
      assert.throws(
        () => evaluateFormula("3 - 10"),
        /non-negative/,
      );
    });
  });

  describe("edge cases", () => {
    test("rejects empty string", () => {
      assert.throws(
        () => evaluateFormula(""),
        /empty/,
      );
    });

    test("rejects whitespace-only", () => {
      assert.throws(
        () => evaluateFormula("   "),
        /empty/,
      );
    });

    test("rejects malformed parentheses", () => {
      assert.throws(
        () => evaluateFormula("((1 + 2)"),
        /syntax error/,
      );
    });

    test("zero is a valid result", () => {
      assert.equal(evaluateFormula("0"), 0);
    });
  });
});

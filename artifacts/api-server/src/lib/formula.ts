/**
 * Safe arithmetic formula evaluator.
 * Whitelist: digits, decimal points, +, -, *, /, (, ), and whitespace only.
 * No identifiers, strings, or any other JS constructs are permitted.
 */
export function evaluateFormula(formula: string): number {
  const trimmed = formula.trim();
  if (!trimmed) {
    throw new Error("Formula is empty.");
  }

  if (!/^[\d\s.()+\-*/]+$/.test(trimmed)) {
    throw new Error(
      "Formula contains invalid characters. Only digits, decimal points, and operators +, -, *, /, (, ) are allowed.",
    );
  }

  let result: unknown;
  try {
    result = new Function(`"use strict"; return (${trimmed});`)();
  } catch {
    throw new Error(
      "Formula syntax error. Check for mismatched parentheses or invalid expressions.",
    );
  }

  if (typeof result !== "number") {
    throw new Error("Formula did not produce a numeric result.");
  }
  if (isNaN(result) || !isFinite(result)) {
    throw new Error(
      "Formula result is not a finite number (e.g. division by zero).",
    );
  }
  if (result < 0) {
    throw new Error("Formula result must be non-negative.");
  }

  return result;
}

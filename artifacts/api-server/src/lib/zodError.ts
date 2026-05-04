import { ZodError } from "zod";

/**
 * Type-safe ZodError check — avoids `catch (err: any)` patterns.
 * Returns the formatted issues array if the thrown value is a ZodError,
 * otherwise returns null.
 */
export function getZodErrors(err: unknown): ZodError["errors"] | null {
  if (err instanceof ZodError) return err.errors;
  return null;
}

import { describe, expect, it } from "vitest";
import { passwordSchema, PASSWORD_HINT } from "@/lib/password";

describe("passwordSchema", () => {
  it("accepts a valid password", () => {
    expect(passwordSchema.safeParse("galileo123").success).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(passwordSchema.safeParse("abc123").success).toBe(false);
  });

  it("rejects passwords without a number", () => {
    expect(passwordSchema.safeParse("galileosegura").success).toBe(false);
  });

  it("rejects passwords without a letter", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });

  it("rejects passwords longer than 72 characters", () => {
    expect(passwordSchema.safeParse("a1" + "x".repeat(71)).success).toBe(false);
  });

  it("exposes a non-empty hint", () => {
    expect(PASSWORD_HINT.length).toBeGreaterThan(0);
  });
});

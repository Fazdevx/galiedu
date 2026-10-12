import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { generateResetToken, hashToken } from "@/lib/reset-tokens";

describe("reset tokens", () => {
  it("generates a 32-byte hex token", () => {
    expect(generateResetToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens", () => {
    expect(generateResetToken()).not.toBe(generateResetToken());
  });

  it("hashes deterministically with sha256", () => {
    const token = "un-token-de-prueba";
    expect(hashToken(token)).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("does not reveal the token in the hash", () => {
    const token = generateResetToken();
    expect(hashToken(token)).not.toContain(token);
  });
});

import { describe, expect, it } from "vitest";
import { buildReceiptNumber, isUniqueViolation } from "@/lib/receipts";

describe("buildReceiptNumber", () => {
  it("starts at 0001 when there are no receipts", () => {
    expect(buildReceiptNumber(2025, [])).toBe("B-2025-0001");
  });

  it("uses the highest sequence, not the count", () => {
    expect(buildReceiptNumber(2025, ["B-2025-0001", "B-2025-0003"])).toBe("B-2025-0004");
  });

  it("ignores receipts from other years", () => {
    expect(buildReceiptNumber(2025, ["B-2024-0099", "B-2026-0001"])).toBe("B-2025-0001");
  });

  it("pads sequences beyond 9999 without breaking ordering", () => {
    expect(buildReceiptNumber(2025, ["B-2025-0010"])).toBe("B-2025-0011");
  });

  it("ignores malformed values", () => {
    expect(buildReceiptNumber(2025, ["B-2025-abc", "recibo"])).toBe("B-2025-0001");
  });
});

describe("isUniqueViolation", () => {
  it("detects a Prisma P2002 error", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
  });

  it("rejects other errors and non-objects", () => {
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
  });
});

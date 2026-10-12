import { describe, expect, it } from "vitest";
import {
  dayRangeUTC,
  formatDate,
  isDateOnly,
  monthRangeUTC,
  parseDateOnly,
  toDateInput,
} from "@/lib/date";

describe("isDateOnly", () => {
  it("accepts a valid YYYY-MM-DD value", () => {
    expect(isDateOnly("2025-03-01")).toBe(true);
  });

  it("rejects other formats", () => {
    expect(isDateOnly("2025-3-1")).toBe(false);
    expect(isDateOnly("01/03/2025")).toBe(false);
    expect(isDateOnly("")).toBe(false);
  });
});

describe("parseDateOnly", () => {
  it("parses to UTC midnight regardless of the server timezone", () => {
    expect(parseDateOnly("2025-03-01").toISOString()).toBe("2025-03-01T00:00:00.000Z");
  });

  it("round-trips through toDateInput", () => {
    expect(toDateInput(parseDateOnly("2025-12-31"))).toBe("2025-12-31");
  });
});

describe("formatDate", () => {
  it("renders the stored date in UTC, not shifted by the local timezone", () => {
    expect(formatDate(parseDateOnly("2025-03-01"), {}, "en-CA")).toBe("2025-03-01");
  });
});

describe("dayRangeUTC", () => {
  it("returns a [start, end) window of exactly one day in UTC", () => {
    const { start, end } = dayRangeUTC("2025-03-01");
    expect(start.toISOString()).toBe("2025-03-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-03-02T00:00:00.000Z");
  });

  it("does not break at month boundaries", () => {
    const { end } = dayRangeUTC("2025-02-28");
    expect(end.toISOString()).toBe("2025-03-01T00:00:00.000Z");
  });
});

describe("monthRangeUTC", () => {
  it("returns the month window in UTC", () => {
    const { start, end } = monthRangeUTC(2025, 2);
    expect(start.toISOString()).toBe("2025-03-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-04-01T00:00:00.000Z");
  });

  it("handles a month index of -1 (December of the previous year)", () => {
    const { start, end } = monthRangeUTC(2025, -1);
    expect(start.toISOString()).toBe("2024-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });
});

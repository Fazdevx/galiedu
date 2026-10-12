import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows attempts up to the limit", () => {
    const limiter = createRateLimiter(3, 1000);
    expect(limiter.check("k", 0).ok).toBe(true);
    expect(limiter.check("k", 1).ok).toBe(true);
    expect(limiter.check("k", 2).ok).toBe(true);
  });

  it("blocks once the limit is exceeded", () => {
    const limiter = createRateLimiter(2, 1000);
    limiter.check("k", 0);
    limiter.check("k", 1);
    const blocked = limiter.check("k", 2);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(998);
  });

  it("opens a new window after it expires", () => {
    const limiter = createRateLimiter(1, 1000);
    limiter.check("k", 0);
    expect(limiter.check("k", 500).ok).toBe(false);
    expect(limiter.check("k", 1001).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.check("a", 0).ok).toBe(true);
    expect(limiter.check("b", 0).ok).toBe(true);
    expect(limiter.check("a", 0).ok).toBe(false);
  });

  it("clears a key on reset (e.g. after a successful login)", () => {
    const limiter = createRateLimiter(1, 1000);
    limiter.check("k", 0);
    expect(limiter.check("k", 0).ok).toBe(false);
    limiter.reset("k");
    expect(limiter.check("k", 0).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("reads the first x-forwarded-for address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    });
    expect(clientIp(request)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost", { headers: { "x-real-ip": "198.51.100.7" } });
    expect(clientIp(request)).toBe("198.51.100.7");
  });

  it("returns 'unknown' when no header is present", () => {
    expect(clientIp(new Request("http://localhost"))).toBe("unknown");
  });

  it("accepts a Headers-like object directly (next/headers)", () => {
    const headerList = new Headers({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" });
    expect(clientIp(headerList)).toBe("10.0.0.1");
  });
});

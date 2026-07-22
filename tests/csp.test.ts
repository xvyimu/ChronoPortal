import { describe, expect, it } from "vitest";
import {
  applyCspHeaderPairs,
  buildEnforcingCsp,
  buildReportOnlyCsp,
  buildCspHeaderPairs,
  createCspNonce,
  createDynamicCspContext,
  CSP_NONCE_HEADER,
  readCspFlags,
} from "@/lib/csp";

describe("lib/csp", () => {
  it("defaults flags: report-only on, script unsafe-inline on, dynamic off", () => {
    expect(readCspFlags({})).toEqual({
      reportOnlyEnabled: true,
      scriptUnsafeInline: true,
      dynamic: false,
    });
  });

  it("parses CSP_* env flags", () => {
    expect(
      readCspFlags({
        CSP_REPORT_ONLY: "0",
        CSP_SCRIPT_UNSAFE_INLINE: "0",
        CSP_DYNAMIC: "1",
      })
    ).toEqual({
      reportOnlyEnabled: false,
      scriptUnsafeInline: false,
      dynamic: true,
    });
  });

  it("enforcing CSP includes unsafe-inline by default and GA hosts", () => {
    const csp = buildEnforcingCsp({ isDev: false });
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("https://www.googletagmanager.com");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("enforcing CSP can drop unsafe-inline via flag", () => {
    const csp = buildEnforcingCsp({ isDev: false, scriptUnsafeInline: false });
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("enforcing CSP with nonce adds nonce + strict-dynamic (unsafe-inline still listed for migration)", () => {
    const csp = buildEnforcingCsp({
      isDev: false,
      scriptUnsafeInline: true,
      nonce: "abc123",
    });
    expect(csp).toContain("'nonce-abc123'");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("'unsafe-inline'");
  });

  it("report-only never allows script unsafe-inline and has report-uri", () => {
    const csp = buildReportOnlyCsp({ isDev: false });
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).toContain("report-uri /api/csp-report");
  });

  it("header pairs honor reportOnlyEnabled", () => {
    const both = buildCspHeaderPairs({ reportOnlyEnabled: true });
    expect(both.map((h) => h.key)).toEqual([
      "Content-Security-Policy",
      "Content-Security-Policy-Report-Only",
    ]);
    const one = buildCspHeaderPairs({ reportOnlyEnabled: false });
    expect(one.map((h) => h.key)).toEqual(["Content-Security-Policy"]);
  });

  it("createCspNonce returns non-empty url-safe string", () => {
    const a = createCspNonce();
    const b = createCspNonce();
    expect(a.length).toBeGreaterThan(10);
    expect(a).not.toEqual(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("createDynamicCspContext returns null when CSP_DYNAMIC is off", () => {
    expect(
      createDynamicCspContext({
        flags: {
          reportOnlyEnabled: true,
          scriptUnsafeInline: true,
          dynamic: false,
        },
      })
    ).toBeNull();
  });

  it("createDynamicCspContext sets x-nonce and CSP pairs with nonce", () => {
    const incoming = new Headers({ "x-existing": "1" });
    const ctx = createDynamicCspContext({
      flags: {
        reportOnlyEnabled: true,
        scriptUnsafeInline: false,
        dynamic: true,
      },
      isDev: false,
      requestHeaders: incoming,
      nonce: "fixed-nonce-value",
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.nonce).toBe("fixed-nonce-value");
    expect(ctx!.requestHeaders.get(CSP_NONCE_HEADER)).toBe("fixed-nonce-value");
    expect(ctx!.requestHeaders.get("x-existing")).toBe("1");
    const enforcing = ctx!.responseHeaderPairs.find(
      (h) => h.key === "Content-Security-Policy"
    )?.value;
    expect(enforcing).toContain("'nonce-fixed-nonce-value'");
    expect(enforcing).toContain("'strict-dynamic'");
    expect(enforcing).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("applyCspHeaderPairs writes all pairs", () => {
    const bag = new Map<string, string>();
    applyCspHeaderPairs(
      { set: (k, v) => bag.set(k, v) },
      [
        { key: "Content-Security-Policy", value: "default-src 'self'" },
        { key: "Content-Security-Policy-Report-Only", value: "default-src 'none'" },
      ]
    );
    expect(bag.get("Content-Security-Policy")).toBe("default-src 'self'");
    expect(bag.get("Content-Security-Policy-Report-Only")).toBe(
      "default-src 'none'"
    );
  });
});

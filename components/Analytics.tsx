"use client";

import Script from "next/script";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Google Analytics via external scripts only (no inline bootstrap).
 * Loads gtag.js + /api/ga?id= so CSP can drop script unsafe-inline after nonce cutover.
 * When CSP_DYNAMIC=1, parent layout passes the per-request nonce.
 */
export function Analytics({ nonce }: { nonce?: string } = {}) {
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === "G-XXXXXXXXXX") {
    return null;
  }

  const id = encodeURIComponent(GA_MEASUREMENT_ID);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script
        src={`/api/ga?id=${id}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
    </>
  );
}

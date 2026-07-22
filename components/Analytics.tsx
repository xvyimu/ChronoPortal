"use client";

import Script from "next/script";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Google Analytics via external scripts only (no inline bootstrap).
 * Loads gtag.js + /ga.js?id=… so CSP can drop script 'unsafe-inline' after nonce cutover.
 */
export function Analytics() {
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === "G-XXXXXXXXXX") {
    return null;
  }

  const id = encodeURIComponent(GA_MEASUREMENT_ID);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script src={`/api/ga?id=${id}`} strategy="afterInteractive" />
    </>
  );
}

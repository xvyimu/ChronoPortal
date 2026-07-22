/**
 * Edge / HTML rewrite audit for ChronoPortal production.
 * Detects Cloudflare Rocket Loader–style script type mangling and CSP posture.
 */
const base = process.argv[2] || "https://yuanjia1314.ccwu.cc";

const res = await fetch(`${base}/?t=${Date.now()}`, {
  headers: { "user-agent": "chrono-edge-script-audit" },
});
const html = await res.text();
const headers = Object.fromEntries(
  [...res.headers.entries()].filter(([k]) =>
    /cf-|server|content-security|x-/i.test(k)
  )
);

const rocketLoader = /rocket-loader|data-cfasync|cloudflareinsights|cf-beacon/i.test(
  html
);
const mangledTypes = [
  ...html.matchAll(/type=["']([0-9a-f]{8,}[^"']*text\/javascript)["']/gi),
].map((m) => m[1]);
const uniqueMangled = [...new Set(mangledTypes)];
const emailDecode = /\/cdn-cgi\/scripts\/.*email-decode/i.test(html);
const cfRay = res.headers.get("cf-ray");
const server = res.headers.get("server");

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/gi)].length;
const hasGaApi = html.includes("/api/ga") || html.includes("gtag/js");
const hasInlineGtagBootstrap =
  /function gtag\(|gtag\('js'/i.test(html) && !html.includes("/api/ga");

console.log(
  JSON.stringify(
    {
      base,
      status: res.status,
      server,
      cfRay: cfRay || null,
      interestingHeaders: headers,
      signals: {
        rocketLoaderHints: rocketLoader,
        emailDecodeScript: emailDecode,
        mangledScriptTypeCount: mangledTypes.length,
        uniqueMangledTypes: uniqueMangled.slice(0, 5),
        inlineScriptTags: inlineScripts,
        hasGaApiOrGtm: hasGaApi,
        hasInlineGtagBootstrap,
      },
      recommendation: mangledTypes.length
        ? "Cloudflare (or similar edge) is rewriting script type attributes. Disable Rocket Loader / Auto Minify JS for this host, or bypass HTML rewriter for Next documents, before relying on nonce-only CSP."
        : "No Rocket Loader–style type mangling detected on this sample.",
    },
    null,
    2
  )
);

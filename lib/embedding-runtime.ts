const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

/** Cloudflare Bot Fight 会拦默认 User-Agent: node / 空 UA；固定显式客户端名 */
export const EMBED_CLIENT_USER_AGENT = "nav-site-embed-client/1.0";

export type EmbedEndpointSkipReason =
  | "missing"
  | "invalid"
  | "remote-insecure"
  | "remote-missing-api-key"
  | "serverless-loopback-disabled";

export type EmbedEndpointResolution =
  | { endpoint: string; reason: null; authRequired: boolean }
  | { endpoint: null; reason: EmbedEndpointSkipReason; authRequired: false };

type EnvLike = Record<string, string | undefined>;

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
}

function isTruthy(value: string | undefined): boolean {
  return TRUE_VALUES.has(value?.toLowerCase() ?? "");
}

function isServerlessRuntime(env: EnvLike): boolean {
  return (
    isTruthy(env.NETLIFY) ||
    isTruthy(env.VERCEL) ||
    Boolean(env.AWS_LAMBDA_FUNCTION_NAME || env.AWS_EXECUTION_ENV)
  );
}

export function describeEmbedSkipReason(reason: EmbedEndpointSkipReason): string {
  switch (reason) {
    case "missing":
      return "not configured";
    case "invalid":
      return "invalid EMBED_SERVER_URL";
    case "remote-insecure":
      return "non-loopback EMBED_SERVER_URL must use HTTPS";
    case "remote-missing-api-key":
      return "remote EMBED_SERVER_URL requires EMBED_SERVER_API_KEY";
    case "serverless-loopback-disabled":
      return "loopback EMBED_SERVER_URL disabled in serverless runtime";
  }
}

/**
 * Resolve EMBED_SERVER_URL to a concrete endpoint path.
 *
 * Allowed:
 * - loopback http/https (local / self-hosted); serverless requires EMBED_SERVER_LOOPBACK_ENABLED
 * - remote HTTPS when EMBED_SERVER_API_KEY is set
 *
 * Rejected:
 * - remote HTTP (cleartext)
 * - remote HTTPS without API key
 * - non-http(s) schemes
 */
export function resolveEmbedEndpoint({
  raw,
  fallback,
  path,
  apiKey,
  env = process.env,
}: {
  raw: string | undefined;
  fallback?: string;
  path: string;
  apiKey?: string;
  env?: EnvLike;
}): EmbedEndpointResolution {
  const source = raw ?? fallback;
  if (!source) return { endpoint: null, reason: "missing", authRequired: false };

  const key = (apiKey ?? env.EMBED_SERVER_API_KEY)?.trim() || "";

  try {
    const url = new URL(source);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    const isLoopback = LOOPBACK_HOSTS.has(normalizeHostname(url.hostname));

    if (!isHttp) return { endpoint: null, reason: "invalid", authRequired: false };

    if (isLoopback) {
      if (isServerlessRuntime(env) && !isTruthy(env.EMBED_SERVER_LOOPBACK_ENABLED)) {
        return { endpoint: null, reason: "serverless-loopback-disabled", authRequired: false };
      }
      return {
        endpoint: new URL(path, url).toString(),
        reason: null,
        // Loopback may still send a key if configured (optional server-side auth).
        authRequired: Boolean(key),
      };
    }

    // Remote: HTTPS + API key only
    if (url.protocol !== "https:") {
      return { endpoint: null, reason: "remote-insecure", authRequired: false };
    }
    if (!key) {
      return { endpoint: null, reason: "remote-missing-api-key", authRequired: false };
    }

    return {
      endpoint: new URL(path, url).toString(),
      reason: null,
      authRequired: true,
    };
  } catch {
    return { endpoint: null, reason: "invalid", authRequired: false };
  }
}

/** @deprecated Use resolveEmbedEndpoint — kept as alias for gradual renames */
export const resolveLoopbackEmbedEndpoint = resolveEmbedEndpoint;

/**
 * Headers for embed-server requests.
 * Always sets Content-Type for POST; Authorization when EMBED_SERVER_API_KEY is set.
 * Always sets User-Agent so Cloudflare Named Tunnel hosts don't Bot-Fight Vercel/node.
 */
export function buildEmbedRequestHeaders({
  json = true,
  apiKey,
  env = process.env,
}: {
  json?: boolean;
  apiKey?: string;
  env?: EnvLike;
} = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": EMBED_CLIENT_USER_AGENT,
  };
  if (json) headers["Content-Type"] = "application/json";

  const key = (apiKey ?? env.EMBED_SERVER_API_KEY)?.trim();
  if (key) headers.Authorization = `Bearer ${key}`;

  return headers;
}

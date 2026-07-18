import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

export function hasAdminTestSession(): boolean {
  return Boolean(process.env.E2E_AUTH_SECRET);
}

export async function installAdminTestSession(
  context: BrowserContext,
  baseURL: string | undefined
): Promise<void> {
  const secret = process.env.E2E_AUTH_SECRET;
  if (!secret) throw new Error("E2E_AUTH_SECRET is required for authenticated admin tests");
  if (!baseURL) throw new Error("Playwright baseURL is required for authenticated admin tests");

  const target = new URL(baseURL);
  const secure = target.protocol === "https:";
  const cookieName = secure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const token = await encode({
    token: {
      sub: "admin",
      name: "E2E Admin",
      role: "admin",
    },
    secret,
    salt: cookieName,
    maxAge: 60 * 60,
  });

  await context.addCookies([
    {
      name: cookieName,
      value: token,
      domain: target.hostname,
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
  ]);
}

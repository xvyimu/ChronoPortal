import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";

function generateToken(password: string): string {
  return crypto.createHmac("sha256", password).update("admin-session").digest("hex");
}

export async function setSessionCookie(password: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, generateToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function verifyAdmin(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const expected = generateToken(adminPassword);
    if (expected.length !== token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";

/**
 * 生成登录 token：HMAC-SHA256(密码, "admin-session")
 */
function generateToken(password: string): string {
  return crypto.createHmac("sha256", password).update("admin-session").digest("hex");
}

/**
 * 设置登录 cookie
 */
export async function setSessionCookie(password: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, generateToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });
}

/**
 * 验证当前请求是否有管理员权限
 */
export async function verifyAdmin(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;

    return token === generateToken(adminPassword);
  } catch {
    return false;
  }
}

/**
 * 清除登录 cookie
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

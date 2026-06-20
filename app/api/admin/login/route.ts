import { NextResponse } from "next/server";
import { setSessionCookie, clearSession } from "@/lib/admin";

export async function POST(request: Request) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "未配置管理员密码" }, { status: 500 });
  }

  if (password === adminPassword) {
    await setSessionCookie(password);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "密码错误" }, { status: 401 });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
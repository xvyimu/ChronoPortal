import { NextResponse } from "next/server";

// Stripe Checkout - 暂未启用，留接口
export async function POST() {
  return NextResponse.json(
    { error: "付费功能即将上线，敬请期待" },
    { status: 501 }
  );
}

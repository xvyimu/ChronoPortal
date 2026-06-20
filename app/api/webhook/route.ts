import { NextResponse } from "next/server";

// Stripe Webhook - 暂未启用，留接口
export async function POST() {
  return NextResponse.json(
    { error: "Webhook 暂未启用" },
    { status: 501 }
  );
}

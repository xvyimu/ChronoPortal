import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, url, description, category_id } = body;

    // Validate
    if (!title?.trim() || !url?.trim()) {
      return NextResponse.json(
        { error: "站点名称和 URL 为必填项" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "URL 格式不正确" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("nav_links").insert({
      title: title.trim(),
      url: url.trim(),
      description: description?.trim() || null,
      category_id: category_id || null,
      approved: false,
      paid: false,
      featured: false,
    });

    if (error) {
      console.error("Submit error:", error);
      return NextResponse.json(
        { error: "提交失败，请重试" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Submit route error:", e);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}

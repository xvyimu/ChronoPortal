/**
 * trackClick — 火忘式（fire-and-forget）点击计数
 *
 * 抽自 LinkCard.tsx / ToolQuickView.tsx / useLinksFilter.ts 三处重复的
 * `navigator.sendBeacon("/api/click", ...)` 调用。sendBeacon 在页面卸载时
 * 仍能可靠发送，比 fetch 更适合点击外链场景。
 *
 * 服务端（app/api/click/route.ts）按 IP + URL 在 15 分钟窗口内去重，
 * 重复点击只计一次。
 *
 * @param url 被点击的链接 URL（需由调用方保证是合法 http(s) URL）
 */
export function trackClick(url: string): void {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return;
  }
  navigator.sendBeacon(
    "/api/click",
    new Blob([JSON.stringify({ url })], { type: "application/json" }),
  );
}

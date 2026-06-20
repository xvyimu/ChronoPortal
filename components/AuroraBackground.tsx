/**
 * 深空极光背景
 * 多层渐变光晕缓慢浮动，营造极光氛围。纯 CSS，零 JS 开销。
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 深空底色渐变 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.15_0.04_265)] via-[oklch(0.17_0.035_265)] to-[oklch(0.13_0.03_270)]" />

      {/* 极光光晕 1 — 青蓝 */}
      <div
        className="absolute -top-1/4 left-1/4 h-[60vh] w-[60vw] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.72 0.15 220 / 60%), transparent 70%)",
          animation: "aurora-shift 18s ease-in-out infinite",
        }}
      />

      {/* 极光光晕 2 — 紫罗兰 */}
      <div
        className="absolute top-1/3 -right-1/4 h-[55vh] w-[55vw] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.62 0.2 290 / 55%), transparent 70%)",
          animation: "aurora-shift2 22s ease-in-out infinite",
        }}
      />

      {/* 极光光晕 3 — 青绿 */}
      <div
        className="absolute bottom-0 left-1/3 h-[50vh] w-[50vw] rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.75 0.15 160 / 45%), transparent 70%)",
          animation: "aurora-shift 26s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}

/**
 * 柔和满天星背景——增强版
 * 白底浅蓝星光 + 暗色靛蓝星光
 * 极浅的环境光晕 + 可选的慢速漂移动画
 */
export function SubtleStars() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 环境光晕 - 晴天蓝调 */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-50/40 via-transparent via-60% to-transparent dark:from-indigo-950/20 dark:via-transparent" />

      {/* 中心柔光 - 在暗色模式下更明显 */}
      <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent dark:from-primary/[0.05] rounded-full blur-3xl" />

      {/* 星点层 */}

      {/* 暗色模式额外层 - 靛蓝色星光 */}
      <div
        className="absolute inset-0 opacity-0 dark:opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 15% 10%, oklch(0.6 0.15 270 / 0.4), transparent),
            radial-gradient(1.5px 1.5px at 40% 30%, oklch(0.55 0.12 280 / 0.35), transparent),
            radial-gradient(1px 1px at 65% 20%, oklch(0.6 0.15 270 / 0.3), transparent),
            radial-gradient(1.5px 1.5px at 85% 45%, oklch(0.55 0.12 280 / 0.35), transparent),
            radial-gradient(1px 1px at 25% 60%, oklch(0.6 0.15 270 / 0.35), transparent),
            radial-gradient(1.5px 1.5px at 55% 75%, oklch(0.55 0.12 280 / 0.3), transparent),
            radial-gradient(1px 1px at 75% 50%, oklch(0.6 0.15 270 / 0.4), transparent),
            radial-gradient(1.5px 1.5px at 45% 90%, oklch(0.55 0.12 280 / 0.35), transparent),
            radial-gradient(2px 2px at 50% 50%, oklch(0.6 0.15 270 / 0.25), transparent)
          `,
        }}
      />
    </div>
  );
}

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 本仓历史实际使用过的 type（git log --format=%s -200 统计，2026-09-21 重测）：
    // docs 70 · fix 38 · chore 24 · feat 23 · ci 17 · refactor 9 · ops 4 · test 3
    // perf 3 · security 2 · sec 2 · merge 2（另有 2 条 `@` 前缀噪声，不计入 type）。
    // conventional 默认 12 类之外补充：ops（运维支撑）、integrate（跨仓合入）、
    // security（安全补丁，区别于 fix 的通用缺陷）、sec（security 的历史简写，
    // 见 5a2850cc "sec(deps): ..."）、merge（手写合入提交的 type 形态）。
    // `integrate` 本窗口内 0 次，但为跨仓合入保留 —— 与 Chronicle 侧同一口径。
    //
    // 实测：把这 200 条真实 subject 逐条喂给本配置后，剩余 4 条被拒且**故意不放行** ——
    // 3 条带 `@` / `@ ` 前缀（历史噪声），1 条 `fix:sitemap-...` 冒号后缺空格。
    // 新提交不应复制这些形态。
    //
    // 2026-09-21 订正：上面这个「4 条」只喂了 subject，没量 body，因此整条
    // body-max-line-length 被漏掉。用完整 commit message 回放
    // (`pnpm exec commitlint --from 45f4948 --to HEAD`) 的真实结果是 **28 条** 命中
    // Error 规则：body-max-line-length 25 · footer-max-line-length 1 ·
    // subject-empty 3 · type-empty 3（后者与前两者在 `@` 前缀那几条上重叠），
    // 另有 1 条仅 warning（body/footer-leading-blank），不阻断。
    //
    // 不放开 body-max-line-length：2026-07-29 之后 29 条提交 0 违规，仓库当前写法
    // 本就满足 100。且没有任何 CI 回放历史（.husky/commit-msg 只 lint 当次消息），
    // 这 28 条今天不阻断任何东西。若将来加 --from/--to 回放门，起点须晚于
    // 2026-07-28 或届时再议 —— 现在不预先放宽。
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
        'ops',
        'security',
        'sec',
        'integrate',
        'merge',
      ],
    ],
    // 允许中文 subject（历史大量中文提交），不强制大小写。
    'subject-case': [0],
    // 120：近 200 条里最长真实 subject 为 114 字符
    // ("merge: five-layer internal optimization (L1 decouple / ...)")。
    // 全史另有一条 127 字符（3f4235ce "fix: replace broken favicon sources ..."），
    // 已落在本窗口之外，不为其放宽 —— 120 对当前写法够用。
    'header-max-length': [2, 'always', 120],
  },
};
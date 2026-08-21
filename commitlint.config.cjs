/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 本仓历史实际使用过的 type（git log --format=%s -200 统计，2026-08-21 复核）：
    // docs 60 · fix 40 · feat 24 · ci 24 · chore 22 · refactor 9
    // test 4 · perf 4 · ops 4 · security 2 · merge 2 · style 1 · sec 1
    // conventional 默认 12 类之外补充：ops（运维支撑）、integrate（跨仓合入）、
    // security（安全补丁，区别于 fix 的通用缺陷）、sec（security 的历史简写，
    // 见 5a2850cc "sec(deps): ..."）、merge（手写合入提交的 type 形态）。
    //
    // 实测：把这 200 条真实 subject 逐条喂给本配置后，剩余 4 条被拒且**故意不放行** ——
    // 3 条带 `@` / `@ ` 前缀（历史噪声），1 条 `fix:sitemap-...` 冒号后缺空格。
    // 新提交不应复制这些形态。
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
    // 120：实测最长真实 subject 为 114 字符
    // ("merge: five-layer internal optimization (L1 decouple / ...)")。
    'header-max-length': [2, 'always', 120],
  },
};
# -*- coding: utf-8 -*-
"""
解析 Lighthouse raw report HTML（含 window.__LIGHTHOUSE_JSON__），提取关键性能指标。

用于从 GitHub Actions Lighthouse CI 上传到 temporary-public-storage 的 .report.html
中提取生产环境真值，填入 docs/perf/baseline 文档。

坑：raw report 的 JSON 嵌在 <script>window.__LIGHTHOUSE_JSON__ = {...}</script>，
JSON 内部含字符串字面量里的 {}，不能用非贪婪正则 {.*?}（会在第一个 } 截断）。
用括号配平扫描 + 字符串感知，与 extract-bundle-stats.mjs 同源手法。

扩展（H1, 2026-06-30）：额外提取 user-timings 与 main-thread-tasks，
定位 PanguSpacing 的 performance.measure 以及 pangu 相关长任务占用。
"""
import json
import sys
from pathlib import Path

# Windows PowerShell 默认 stdout 走 locale 编码（常为 cp936/GBK），
# 打印中文与全角符号（— （ ））会乱码。显式重配 UTF-8，落实 CLAUDE.md「I/O 一律 UTF-8」铁律。
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def extract_lhr(html: str):
    marker = "window.__LIGHTHOUSE_JSON__"
    idx = html.find(marker)
    if idx == -1:
        return None
    eq = html.find("=", idx)
    if eq == -1:
        return None
    start = html.find("{", eq)
    if start == -1:
        return None
    depth = 0
    in_str = False
    escape = False
    quote = ""
    for i in range(start, len(html)):
        c = html[i]
        if in_str:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == quote:
                in_str = False
        else:
            if c == '"' or c == "'":
                in_str = True
                quote = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(html[start:i + 1])
                    except json.JSONDecodeError as e:
                        print(f"  JSON 解析失败 @ char {i}: {e}", file=sys.stderr)
                        return None
    return None


def fmt_ms(v):
    if v is None:
        return "-"
    return f"{v:.0f}ms"


def fmt_score(v):
    if v is None:
        return "-"
    return f"{int(round(v * 100))}"


def extract_metrics(lhr):
    cats = lhr.get("categories", {})
    audits = lhr.get("audits", {})
    perf = cats.get("performance", {}).get("score")

    def num(audit_id):
        a = audits.get(audit_id, {})
        return a.get("numericValue")

    return {
        "performance": fmt_score(perf),
        "fcp": fmt_ms(num("first-contentful-paint")),
        "lcp": fmt_ms(num("largest-contentful-paint")),
        "tbt": fmt_ms(num("total-blocking-time")),
        "cls": f"{num('cumulative-layout-shift'):.3f}" if num("cumulative-layout-shift") is not None else "-",
        "ttfb": fmt_ms(num("server-response-time")),
        "si": fmt_ms(num("speed-index")),
        "script_eval": fmt_ms(num("script-evaluation")) if num("script-evaluation") else "-",
    }


def extract_pangu_timing(lhr):
    """提取 pangu 相关计时：user-timings 标记 + main-thread-tasks 长任务中的 pangu 任务。

    PanguSpacing.tsx 注入 performance.measure('pangu-spacing-init'/'-mutation')，
    Lighthouse 的 user-timings audit 会捕获。main-thread-tasks 列出所有主线程任务，
    用于交叉确认 pangu 是否构成长任务（>=50ms）及其总占用。
    """
    audits = lhr.get("audits", {})
    out = {"user_timings": [], "long_tasks": [], "pangu_long_task_ms": 0}

    ut = audits.get("user-timings", {})
    for item in (ut.get("details", {}).get("items") or []):
        name = item.get("name", "")
        if "pangu" in name.lower() or "spacing" in name.lower():
            out["user_timings"].append({
                "name": name,
                "type": item.get("timingType", "?"),
                "duration": item.get("duration"),
            })

    mt = audits.get("main-thread-tasks", {})
    pangu_total = 0.0
    for item in (mt.get("details", {}).get("items") or []):
        name = item.get("name", "")
        dur = item.get("duration", 0) or 0
        if dur >= 50:
            out["long_tasks"].append({"name": name, "duration": round(dur)})
        if "pangu" in name.lower() or "spacing" in name.lower():
            pangu_total += dur
    out["pangu_long_task_ms"] = round(pangu_total)
    return out


def main():
    if len(sys.argv) < 2:
        print("用法: python parse-lhr.py <report.html> [report2.html ...]")
        sys.exit(1)
    for path in sys.argv[1:]:
        p = Path(path)
        if not p.exists():
            print(f"\n=== {path} ===\n  文件不存在")
            continue
        html = p.read_text(encoding="utf-8", errors="replace")
        print(f"\n=== {p.name} ({len(html)} bytes) ===")
        lhr = extract_lhr(html)
        if lhr is None:
            print("  未找到 LHR JSON（可能是 viewer 页面而非 raw report）")
            continue
        m = extract_metrics(lhr)
        print(f"  Performance : {m['performance']}")
        print(f"  FCP         : {m['fcp']}")
        print(f"  LCP         : {m['lcp']}")
        print(f"  TBT         : {m['tbt']}")
        print(f"  CLS         : {m['cls']}")
        print(f"  TTFB        : {m['ttfb']}")
        print(f"  Speed Index : {m['si']}")
        print(f"  Script Eval : {m['script_eval']}")
        print(f"  requestedUrl: {lhr.get('finalUrl', '?')}")

        pt = extract_pangu_timing(lhr)
        if pt["user_timings"]:
            print(f"  pangu user-timings:")
            for u in pt["user_timings"]:
                d = u["duration"]
                if d is not None:
                    print(f"    {u['name']} ({u['type']}): {d:.1f}ms")
                else:
                    print(f"    {u['name']} ({u['type']}): mark")
        else:
            print(f"  pangu user-timings: （无 —— 可能未触发或被 Lighthouse 裁剪）")
        print(f"  长任务(>=50ms): {len(pt['long_tasks'])} 个")
        for lt in pt["long_tasks"][:8]:
            print(f"    {lt['duration']}ms  {lt['name']}")
        print(f"  pangu 主线程占用合计: {pt['pangu_long_task_ms']}ms")


if __name__ == "__main__":
    main()

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 AI 导航站 · 精选 AI 工具与开发者资源</p>
          <div className="flex gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <span>·</span>
            <a href="/submit" className="hover:text-foreground transition-colors">
              提交站点
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

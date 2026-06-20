# AI 导航站

精选 AI 工具与开发者资源导航网站。

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS v4
- **数据库**: Supabase (PostgreSQL)
- **部署**: Vercel

## 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 凭据

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 环境变量

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `STRIPE_SECRET_KEY` | Stripe 密钥（暂未启用） |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 密钥（暂未启用） |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 ID |
| `NEXT_PUBLIC_SITE_URL` | 站点 URL（用于 sitemap） |

## 数据库表结构

- `nav_categories` - 导航分类
- `nav_links` - 导航链接（含审核/付费/推荐状态）

## 功能

- ✅ 分类展示导航链接
- ✅ 分类筛选 + 搜索
- ✅ 提交新站点（需审核）
- ✅ SEO 优化（meta/sitemap/robots）
- ✅ 响应式设计
- 🔜 Stripe 付费优选提交
- 🔜 后台管理面板

## 部署

推送到 GitHub 后在 Vercel 连接仓库，配置环境变量即可。

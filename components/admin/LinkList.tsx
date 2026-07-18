"use client";

import { memo } from "react";
import { ExternalLink, Globe2, Pencil, Plus, Trash2 } from "lucide-react";
import type { NavLink } from "@/lib/types";

interface LinkListProps {
  links: NavLink[];
  onEdit: (link: NavLink) => void;
  onDelete: (link: NavLink) => void;
  onAdd: () => void;
}

/** 管理后台链接列表：桌面表格 + 移动卡片，空态引导新增。 */
export function LinkList({ links, onEdit, onDelete, onAdd }: LinkListProps) {
  if (links.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--admin-primary-soft)] text-[var(--admin-primary)]">
          <Globe2 className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-sm font-semibold">暂无匹配链接</h3>
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 flex min-h-9 items-center gap-2 rounded-md bg-[var(--admin-primary)] px-3 text-sm font-medium text-white hover:bg-[var(--admin-primary-hover)]"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          新增链接
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="bg-[var(--admin-surface)] text-xs font-semibold text-[var(--admin-muted)]">
            <tr>
              <th className="w-[38%] px-5 py-3">链接</th>
              <th className="w-[20%] px-4 py-3">分类</th>
              <th className="w-[22%] px-4 py-3">状态</th>
              <th className="w-[20%] px-5 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border)]">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--admin-border)] md:hidden">
        {links.map((link) => (
          <LinkCard key={link.id} link={link} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </>
  );
}

const LinkRow = memo(function LinkRow({
  link,
  onEdit,
  onDelete,
}: {
  link: NavLink;
  onEdit: (link: NavLink) => void;
  onDelete: (link: NavLink) => void;
}) {
  return (
    <tr className="group transition-colors hover:bg-[var(--admin-surface)]">
      <td className="px-5 py-3.5 align-middle">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--admin-border)] bg-white text-[var(--admin-primary)]">
            <Globe2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--admin-text)]">{link.title}</p>
            <p className="truncate text-xs text-[var(--admin-muted)]">{link.url}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm text-[var(--admin-muted)]">
        <span className="block truncate">{link.category_name ?? "未分类"}</span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone={link.approved ? "success" : "warning"}>
            {link.approved ? "已审核" : "待审核"}
          </StatusBadge>
          {link.featured && <StatusBadge tone="primary">精选</StatusBadge>}
          {link.paid && <StatusBadge tone="neutral">付费</StatusBadge>}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex justify-end gap-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-icon-button"
            aria-label={`打开 ${link.title}`}
            title="打开链接"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          </a>
          <button
            type="button"
            onClick={() => onEdit(link)}
            className="admin-icon-button"
            aria-label={`编辑 ${link.title}`}
            title="编辑"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(link)}
            className="admin-icon-button hover:bg-[var(--admin-danger-soft)] hover:text-[var(--admin-danger)]"
            aria-label={`删除 ${link.title}`}
            title="删除"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </td>
    </tr>
  );
});

const LinkCard = memo(function LinkCard({
  link,
  onEdit,
  onDelete,
}: {
  link: NavLink;
  onEdit: (link: NavLink) => void;
  onDelete: (link: NavLink) => void;
}) {
  return (
    <article className="p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--admin-border)] text-[var(--admin-primary)]">
          <Globe2 className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{link.title}</h3>
          <p className="mt-0.5 truncate text-xs text-[var(--admin-muted)]">{link.url}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge tone={link.approved ? "success" : "warning"}>
              {link.approved ? "已审核" : "待审核"}
            </StatusBadge>
            {link.featured && <StatusBadge tone="primary">精选</StatusBadge>}
            <StatusBadge tone="neutral">{link.category_name ?? "未分类"}</StatusBadge>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-1 border-t border-[var(--admin-border)] pt-3">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="admin-icon-button" aria-label={`打开 ${link.title}`}>
          <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
        </a>
        <button type="button" onClick={() => onEdit(link)} className="admin-icon-button" aria-label={`编辑 ${link.title}`}>
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={() => onDelete(link)} className="admin-icon-button hover:bg-[var(--admin-danger-soft)] hover:text-[var(--admin-danger)]" aria-label={`删除 ${link.title}`}>
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </article>
  );
});

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "primary" | "success" | "warning" | "neutral";
}) {
  const color = {
    primary: "bg-[var(--admin-primary-soft)] text-[var(--admin-primary)]",
    success: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
    warning: "bg-[var(--admin-warning-soft)] text-[var(--admin-warning)]",
    neutral: "bg-[var(--admin-surface)] text-[var(--admin-muted)]",
  }[tone];

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {children}
    </span>
  );
}

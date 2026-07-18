"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderTree, Loader2, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin/client";
import type { Category } from "@/lib/types";
import {
  adminQueryKeys,
  useAdminCategories,
} from "@/components/admin/admin-queries";
import { FadeContent } from "@/components/admin/FadeContent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface CategoryManagerProps {
  initialCategories: Category[];
}

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
}

/** 根据编辑目标创建分类表单初值。 */
function formFromCategory(category: Category | null): CategoryFormState {
  return category
    ? {
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        icon: category.icon ?? "",
        sort_order: category.sort_order,
      }
    : { name: "", slug: "", description: "", icon: "", sort_order: 0 };
}

/** 分类管理工作台，负责本地筛选、编辑状态和缓存同步。 */
export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const queryClient = useQueryClient();
  const categoriesQuery = useAdminCategories(initialCategories);
  const categories: Category[] = categoriesQuery.data ?? initialCategories;
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [form, setForm] = useState<CategoryFormState>(() => formFromCategory(null));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const visibleCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return categories.filter((category) =>
      !normalized || [category.name, category.slug, category.description ?? ""]
        .some((value) => value.toLowerCase().includes(normalized))
    );
  }, [categories, query]);

  /** 打开新建或编辑面板，并重置上一轮错误。 */
  function openEditor(category: Category | null) {
    setEditing(category);
    setForm(formFromCategory(category));
    setFormError(null);
  }

  /** 保存分类并把返回实体合并进 React Query 缓存。 */
  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFormError(null);

    try {
      const input = {
        ...form,
        description: form.description || null,
        icon: form.icon || null,
      };
      // 编辑命令和创建命令共享同一 client interface，HTTP 分支留在 adapter 内。
      const saved = editing
        ? await adminApi.categories.save({ id: editing.id, input })
        : await adminApi.categories.save({ input });
      queryClient.setQueryData<Category[]>(adminQueryKeys.categories, (current: Category[] | undefined) => {
        const categories = current ?? [];
        const exists = categories.some((category) => category.id === saved.id);
        const next = exists
          ? categories.map((category) => (category.id === saved.id ? saved : category))
          : [...categories, saved];
        return next.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      });
      setEditing(undefined);
      toast.success("分类已保存");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  /** 删除已确认分类，并同步移除缓存实体。 */
  async function handleDelete() {
    if (!deleting || deletePending) return;
    const categoryToDelete = deleting;
    setDeletePending(true);

    try {
      // 分类删除通过 client seam 执行，组件不解析 Response。
      await adminApi.categories.remove(categoryToDelete.id);

      queryClient.setQueryData<Category[]>(adminQueryKeys.categories, (current: Category[] | undefined) =>
        (current ?? []).filter((category) => category.id !== categoryToDelete.id)
      );
      setDeleting(null);
      toast.success("分类已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--admin-muted)]">内容结构</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight">分类管理</h1>
        </div>
        <Button
          type="button"
          onClick={() => openEditor(null)}
          className="h-10 rounded-md bg-[var(--admin-primary)] px-4 text-white hover:bg-[var(--admin-primary-hover)]"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          新增分类
        </Button>
      </header>

      <section className="admin-panel overflow-hidden" aria-labelledby="categories-heading">
        <div className="flex flex-col gap-3 border-b border-[var(--admin-border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 id="categories-heading" className="text-lg font-semibold">分类列表</h2>
            <p className="mt-0.5 text-sm text-[var(--admin-muted)]">{visibleCategories.length} 个分类</p>
          </div>
          <label className="relative block sm:w-64">
            <span className="sr-only">搜索分类</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-faint)]" strokeWidth={1.75} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名称或标识"
              className="field-input pl-9"
            />
          </label>
        </div>

        {visibleCategories.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--admin-primary-soft)] text-[var(--admin-primary)]">
              <FolderTree className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h3 className="mt-4 text-sm font-semibold">暂无匹配分类</h3>
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {visibleCategories.map((category) => (
              <article key={category.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--admin-surface)] sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--admin-border)] bg-white text-[var(--admin-primary)]">
                  <FolderTree className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{category.name}</h3>
                    <span className="rounded-full bg-[var(--admin-surface)] px-2 py-0.5 text-[11px] text-[var(--admin-muted)]">
                      {category.slug}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--admin-muted)]">
                    排序 {category.sort_order}{category.description ? ` · ${category.description}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => openEditor(category)} className="admin-icon-button" aria-label={`编辑 ${category.name}`} title="编辑">
                    <Pencil className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <button type="button" onClick={() => setDeleting(category)} className="admin-icon-button hover:bg-[var(--admin-danger-soft)] hover:text-[var(--admin-danger)]" aria-label={`删除 ${category.name}`} title="删除">
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Sheet open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <SheetContent className="w-full overflow-y-auto bg-white sm:max-w-lg">
          <SheetHeader className="border-b border-[var(--admin-border)] px-6 py-5 pr-16">
            <SheetTitle>{editing ? "编辑分类" : "新增分类"}</SheetTitle>
            <SheetDescription>{editing ? editing.name : "创建分类"}</SheetDescription>
          </SheetHeader>
          <FadeContent>
          <form onSubmit={handleSave} className="space-y-5 p-6">
            {formError && (
              <p role="alert" className="rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]">
                {formError}
              </p>
            )}
            <Field label="名称" htmlFor="category-name" required>
              <input id="category-name" className="field-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={saving} required />
            </Field>
            <Field label="标识" htmlFor="category-slug" required>
              <input id="category-slug" className="field-input" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} disabled={saving} required />
            </Field>
            <Field label="描述" htmlFor="category-description">
              <textarea id="category-description" className="field-input min-h-24 resize-y" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} disabled={saving} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="排序" htmlFor="category-order">
                <input id="category-order" type="number" className="field-input" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number.parseInt(event.target.value, 10) || 0 }))} disabled={saving} />
              </Field>
              <Field label="图标标识" htmlFor="category-icon">
                <input id="category-icon" className="field-input" value={form.icon} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} placeholder="可选" disabled={saving} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-5">
              <Button type="button" variant="outline" className="rounded-md" onClick={() => setEditing(undefined)} disabled={saving}>取消</Button>
              <Button type="submit" className="rounded-md bg-[var(--admin-primary)] text-white hover:bg-[var(--admin-primary-hover)]" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.75} />}
                {saving ? "保存中" : "保存"}
              </Button>
            </div>
          </form>
          </FadeContent>
        </SheetContent>
      </Sheet>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="rounded-lg border-[var(--admin-border)] bg-white shadow-[var(--admin-shadow)]">
          <DialogHeader>
            <DialogTitle>删除分类</DialogTitle>
            <DialogDescription>
              确定删除“{deleting?.name}”吗？该分类下的链接将变为未分类。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-md" onClick={() => setDeleting(null)}>取消</Button>
            <Button type="button" variant="destructive" className="rounded-md" disabled={deletePending} onClick={handleDelete}>
              {deletePending ? "删除中" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 渲染带关联 label 的分类表单字段。 */
function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
    </div>
  );
}

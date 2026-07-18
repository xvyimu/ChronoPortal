"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { adminApi } from "@/lib/admin/client";
import type { Category, NavLink } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface LinkFormProps {
  categories: Category[];
  editingLink: NavLink | null;
  onSave: (link: NavLink) => void;
  onCancel: () => void;
}

interface LinkFormState {
  title: string;
  url: string;
  description: string;
  icon: string;
  category_id: string | null;
  approved: boolean;
  featured: boolean;
}

/** 根据编辑状态创建稳定的链接表单初值。 */
function initialForm(categories: Category[], editingLink: NavLink | null): LinkFormState {
  if (editingLink) {
    return {
      title: editingLink.title,
      url: editingLink.url,
      description: editingLink.description ?? "",
      icon: editingLink.icon ?? "",
      category_id: editingLink.category_id,
      approved: editingLink.approved,
      featured: editingLink.featured,
    };
  }

  return {
    title: "",
    url: "",
    description: "",
    icon: "",
    category_id: categories[0]?.id ?? null,
    approved: true,
    featured: false,
  };
}

/** 管理链接创建/编辑表单。 */
export function LinkForm({ categories, editingLink, onSave, onCancel }: LinkFormProps) {
  const [form, setForm] = useState(() => initialForm(categories, editingLink));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 提交链接表单，并通过类型化 API adapter 选择创建或更新。 */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      // 有 ID 时使用更新 contract；无 ID 时使用创建 contract。
      const savedLink = editingLink
        ? await adminApi.links.save({ id: editingLink.id, input: form })
        : await adminApi.links.save({ input: form });
      onSave(savedLink);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {error && (
        <p role="alert" className="rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <Field label="标题" htmlFor="link-title" required>
          <input
            id="link-title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="field-input"
            required
            disabled={saving}
          />
        </Field>

        <Field label="网址" htmlFor="link-url" required>
          <input
            id="link-url"
            type="url"
            value={form.url}
            onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
            className="field-input"
            required
            disabled={saving}
          />
        </Field>

        <Field label="描述" htmlFor="link-description">
          <textarea
            id="link-description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="field-input min-h-24 resize-y"
            disabled={saving}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="分类" htmlFor="link-category">
            <select
              id="link-category"
              value={form.category_id ?? ""}
              onChange={(event) => setForm((current) => ({
                ...current,
                category_id: event.target.value || null,
              }))}
              className="field-input"
              disabled={saving}
            >
              <option value="">未分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </Field>

          <Field label="图标标识" htmlFor="link-icon">
            <input
              id="link-icon"
              value={form.icon}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
              className="field-input"
              placeholder="可选"
              disabled={saving}
            />
          </Field>
        </div>
      </div>

      <fieldset className="space-y-3 border-t border-[var(--admin-border)] pt-5">
        <legend className="sr-only">链接状态</legend>
        <Toggle
          label="已审核"
          description="公开列表可见"
          checked={form.approved}
          disabled={saving}
          onChange={(checked) => setForm((current) => ({ ...current, approved: checked }))}
        />
        <Toggle
          label="精选"
          description="在精选区域优先展示"
          checked={form.featured}
          disabled={saving}
          onChange={(checked) => setForm((current) => ({ ...current, featured: checked }))}
        />
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-5">
        <Button type="button" variant="outline" className="rounded-md" onClick={onCancel} disabled={saving}>
          取消
        </Button>
        <Button
          type="submit"
          className="rounded-md bg-[var(--admin-primary)] text-white hover:bg-[var(--admin-primary-hover)]"
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.75} />}
          {saving ? "保存中" : "保存"}
        </Button>
      </div>
    </form>
  );
}

/** 渲染带关联 label 的表单字段容器。 */
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

/** 渲染布尔状态切换项，并把 DOM 事件转换为业务布尔值。 */
function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-[var(--admin-border)] px-3 py-2.5">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-[var(--admin-muted)]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--admin-primary)]"
      />
    </label>
  );
}

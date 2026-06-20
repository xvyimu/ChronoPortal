"use client";

import { type NavLink } from "@/lib/types";

export function LinkCard({ link }: { link: NavLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-ring hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
        {link.icon || "🔗"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium text-card-foreground group-hover:text-primary">
            {link.title}
          </h3>
          {link.featured && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              推荐
            </span>
          )}
          {link.paid && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              优选
            </span>
          )}
        </div>
        {link.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {link.description}
          </p>
        )}
        {link.category_name && (
          <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {link.category_name}
          </span>
        )}
      </div>
      <svg
        className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}

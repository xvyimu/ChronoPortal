import { Skeleton } from "@/components/ui/skeleton";

/** 骨架屏占位数量（与实际数据结构近似） */
const SIDEBAR_ITEMS = 6;
const CONTENT_SECTIONS = 3;
const CARDS_PER_SECTION = 5;

export function NavSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden w-64 shrink-0 space-y-1 border-r border-border/50 p-3 md:block">
        {Array.from({ length: SIDEBAR_ITEMS }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg" />
        ))}
      </aside>

      <div className="min-w-0 w-full flex-1 space-y-6 px-4 py-6 md:px-6">
        <Skeleton className="h-11 rounded-[24px]" />

        {Array.from({ length: CONTENT_SECTIONS }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: CARDS_PER_SECTION }).map((_, j) => (
                <Skeleton
                  key={j}
                  className="h-[66px] rounded-xl"
                  style={{ animationDelay: `${(i * CARDS_PER_SECTION + j) * 40}ms` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

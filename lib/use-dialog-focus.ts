"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * useDialogFocus — 对话框焦点管理（焦点陷阱 + 焦点恢复）
 *
 * 抽自 ToolQuickView.tsx 原内联逻辑。负责四件事：
 *   1. 打开时记录触发元素（triggerRef），用于关闭后焦点回退
 *   2. 打开时把焦点移到关闭按钮（或第一个可聚焦元素）
 *   3. Tab / Shift+Tab 在对话框内循环（焦点陷阱）
 *   4. Escape 键触发 onClose
 *   5. 关闭时焦点回到原触发元素（恢复）
 *
 * @example
 *   const dialogRef = useRef<HTMLDivElement>(null);
 *   const closeRef = useRef<HTMLButtonElement>(null);
 *   useDialogFocus({
 *     open: link !== null,
 *     onClose,
 *     dialogRef,
 *     closeRef,
 *   });
 */
export function useDialogFocus<T extends HTMLElement>({
  open,
  onClose,
  dialogRef,
  closeRef,
}: {
  open: boolean;
  onClose: () => void;
  dialogRef: RefObject<T | null>;
  closeRef?: RefObject<HTMLElement | null>;
}) {
  // 触发元素引用：打开瞬间记录，关闭时恢复
  const triggerRef = useRef<HTMLElement | null>(null);

  // 打开时记录触发元素（必须在 dialog effect 之前，否则 document.activeElement
  // 已被 closeRef.focus() 改变）
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // 焦点移到关闭按钮（屏幕阅读器用户能立刻按 Escape）
    closeRef?.current?.focus();

    const dialog = dialogRef.current;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      // 焦点陷阱：Tab 在对话框内循环
      if (event.key === "Tab" && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // 关闭后焦点回到触发元素
      triggerRef.current?.focus();
    };
  }, [open, onClose, dialogRef, closeRef]);
}

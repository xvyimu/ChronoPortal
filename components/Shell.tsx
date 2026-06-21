"use client";

import { useState, createContext, useContext, type ReactNode } from "react";

interface ShellContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const ShellContext = createContext<ShellContextType | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within Shell");
  return ctx;
}

export function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <ShellContext.Provider value={{ sidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </ShellContext.Provider>
  );
}
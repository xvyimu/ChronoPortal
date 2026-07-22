"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

export function ThemeProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  /** Per-request CSP nonce (T9″); enables next-themes inline script under strict CSP. */
  nonce?: string;
}) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      nonce={nonce}
    >
      {children}
    </NextThemeProvider>
  );
}
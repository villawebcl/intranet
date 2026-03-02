"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "soft-dark";

const STORAGE_KEY = "intranet-theme";
const THEME_TRANSITION_CLASS = "theme-switching";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
}

function getInitialTheme(): ThemeMode {
  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "soft-dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "soft-dark" : "light";
}

type ThemeToggleProps = {
  inline?: boolean;
};

export function ThemeToggle({ inline = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const datasetTheme = document.documentElement.dataset.theme;
    if (datasetTheme === "light" || datasetTheme === "soft-dark") {
      return datasetTheme;
    }

    return getInitialTheme();
  });

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    const root = document.documentElement;
    root.classList.add(THEME_TRANSITION_CLASS);
    window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS);
    }, 260);

    setTheme((current) => (current === "light" ? "soft-dark" : "light"));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      className={[
        "theme-toggle-button inline-flex items-center gap-2 border-0 bg-slate-100 text-xs font-semibold text-slate-700 transition hover:bg-slate-200",
        inline
          ? "rounded-md px-3 py-2"
          : "fixed bottom-4 right-4 z-50 rounded-md bg-slate-100/95 px-3 py-2 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur-sm hover:bg-slate-200",
      ].join(" ")}
    >
      <span className="inline-flex h-2 w-2 rounded-full bg-slate-400" aria-hidden />
      <span>Tema</span>
    </button>
  );
}

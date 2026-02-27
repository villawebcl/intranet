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

export function ThemeToggle() {
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
      className="theme-toggle-button fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur-sm hover:bg-white"
    >
      <span className="inline-flex h-2 w-2 rounded-full bg-slate-400" aria-hidden />
      <span>Tema</span>
    </button>
  );
}

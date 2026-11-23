import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme | undefined) ?? "light",
  );

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("10is-theme", t);
    } catch {
      /* private mode */
    }
    setThemeState(t);
  }, []);

  // Follow the OS until the player picks a theme themselves.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("10is-theme");
      } catch {
        /* ignore */
      }
      if (!saved) {
        const t: Theme = mql.matches ? "dark" : "light";
        document.documentElement.dataset.theme = t;
        setThemeState(t);
      }
    };
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}

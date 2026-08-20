"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "rpgcord.theme";

/**
 * Tema da aplicacao inteira.
 *
 * Antes o tema era estado do workspace, entao a tela de login e o salao de
 * campanhas ficavam sempre claros ate o jogador entrar numa mesa. Aqui ele vive
 * na raiz, comeca seguindo a preferencia do sistema e so passa a ser fixo
 * depois de uma escolha explicita.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [chosen, setChosen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      setChosen(true);
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(media.matches ? "dark" : "light");
    const follow = (event: MediaQueryListEvent) => setTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const chooseTheme = useCallback((next: Theme) => {
    setTheme(next);
    setChosen(true);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const followSystem = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setChosen(false);
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  return { theme, chosen, chooseTheme, followSystem };
}

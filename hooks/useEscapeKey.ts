"use client";

import { useEffect } from "react";

/**
 * Fecha a camada mais recente com Esc.
 *
 * Usa a fase de captura e para a propagacao para que, com varias camadas
 * abertas ao mesmo tempo, apenas a ultima montada reaja — o listener mais
 * novo do document e o ultimo a ser adicionado, entao a pilha e respeitada
 * marcando o evento como ja tratado.
 */
export function useEscapeKey(onEscape: (() => void) | undefined, enabled = true) {
  useEffect(() => {
    if (!enabled || !onEscape) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, onEscape]);
}

"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useState } from "react";

const LEFT_DEFAULT = 246;
const RIGHT_DEFAULT = 460;
const LEFT_MIN = 210;
const LEFT_MAX = 360;
const RIGHT_MIN = 360;
const RIGHT_MAX = 720;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function savedWidth(key: string, fallback: number) {
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function useResizablePanels() {
  const [sidebarWidth, setSidebarWidth] = useState(LEFT_DEFAULT);
  const [panelWidth, setPanelWidth] = useState(RIGHT_DEFAULT);

  useEffect(() => {
    setSidebarWidth(clamp(savedWidth("rpgcord.layout.sidebarWidth", LEFT_DEFAULT), LEFT_MIN, LEFT_MAX));
    setPanelWidth(clamp(savedWidth("rpgcord.layout.panelWidth", RIGHT_DEFAULT), RIGHT_MIN, RIGHT_MAX));
  }, []);

  const startResize = useCallback((side: "left" | "right", event: ReactPointerEvent<HTMLButtonElement>) => {
    if (window.innerWidth <= 800) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const move = (pointerEvent: PointerEvent) => {
      if (side === "left") {
        setSidebarWidth(clamp(pointerEvent.clientX, LEFT_MIN, Math.min(LEFT_MAX, window.innerWidth * .35)));
        return;
      }
      setPanelWidth(clamp(window.innerWidth - pointerEvent.clientX, RIGHT_MIN, Math.min(RIGHT_MAX, window.innerWidth * .58)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelection;
      setSidebarWidth((width) => {
        window.localStorage.setItem("rpgcord.layout.sidebarWidth", String(Math.round(width)));
        return width;
      });
      setPanelWidth((width) => {
        window.localStorage.setItem("rpgcord.layout.panelWidth", String(Math.round(width)));
        return width;
      });
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }, []);

  return { sidebarWidth, panelWidth, startResize };
}

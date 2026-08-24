"use client";

import { useEffect, useState } from "react";

export function usePanelPresence<T>(activeItem: T | undefined, exitDuration = 220) {
  const [lastItem, setLastItem] = useState<T | undefined>(activeItem);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (activeItem !== undefined) {
      setLastItem(activeItem);
      setClosing(false);
      return;
    }
    if (lastItem === undefined) return;

    setClosing(true);
    const timeout = window.setTimeout(() => {
      setLastItem(undefined);
      setClosing(false);
    }, exitDuration);
    return () => window.clearTimeout(timeout);
  }, [activeItem, exitDuration, lastItem]);

  const renderedItem = activeItem ?? lastItem;
  return {
    renderedItem,
    isClosing: activeItem === undefined && closing,
    isPresent: renderedItem !== undefined,
  };
}

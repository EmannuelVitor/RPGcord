"use client";

import { useCallback, useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Guarda o evento de instalacao do PWA para oferecer o atalho na hora certa.
 * Navegadores so disparam beforeinstallprompt uma vez e exigem que o prompt
 * parta de um gesto do usuario, por isso o evento fica retido aqui.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent>();
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(undefined); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(undefined);
  }, [deferred]);

  return { canInstall: Boolean(deferred) && !installed, installed, install };
}

"use client";

import { Moon, Settings, Sun, X } from "lucide-react";

type Props = { theme: "light" | "dark"; embedded?: boolean; onTheme: (theme: "light" | "dark") => void; onClose: () => void };

export function SettingsPanel({ theme, embedded = false, onTheme, onClose }: Props) {
  return (
    <div className={"drawer-backdrop settings-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer settings-drawer">
        <header><div><p className="eyebrow">Preferências locais</p><h2><Settings size={19} /> Configurações</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
        <section className="settings-content">
          <h3>Aparência</h3>
          <div className="theme-options">
            <button className={theme === "light" ? "active" : ""} onClick={() => onTheme("light")}><Sun /><strong>Modo claro</strong><span>Visual atual do RPGcord</span></button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => onTheme("dark")}><Moon /><strong>Modo escuro</strong><span>Menos brilho durante a sessão</span></button>
          </div>
          <p>A preferência fica salva somente neste navegador.</p>
        </section>
      </aside>
    </div>
  );
}

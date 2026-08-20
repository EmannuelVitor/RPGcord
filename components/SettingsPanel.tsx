"use client";

import { Check, Download, Moon, Settings, Sun, X } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

type Props = { theme: "light" | "dark"; embedded?: boolean; onTheme: (theme: "light" | "dark") => void; onClose: () => void };

export function SettingsPanel({ theme, embedded = false, onTheme, onClose }: Props) {
  const { canInstall, installed, install } = useInstallPrompt();
  useEscapeKey(onClose, !embedded);

  return (
    <div className={"drawer-backdrop settings-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer settings-drawer">
        <header><div><p className="eyebrow">Preferências locais</p><h2><Settings size={19} /> Configurações</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
        <section className="settings-content">
          <h3>Aparência</h3>
          <div className="theme-options">
            <button className={theme === "light" ? "active" : ""} onClick={() => onTheme("light")}><Sun /><strong>Modo claro</strong><span>Pergaminho e violeta</span></button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => onTheme("dark")}><Moon /><strong>Modo escuro</strong><span>Menos brilho durante a sessão</span></button>
          </div>
          <p>A preferência fica salva somente neste navegador.</p>

          <h3>Aplicativo</h3>
          {installed ? (
            <div className="install-state"><Check size={16} /><span><strong>RPGcord instalado</strong><small>Abrindo em janela própria, sem a barra do navegador.</small></span></div>
          ) : canInstall ? (
            <button className="secondary-button full" onClick={() => void install()}><Download size={16} /> Instalar o RPGcord neste dispositivo</button>
          ) : (
            <p>Para instalar, use a opção <strong>Instalar aplicativo</strong> do seu navegador. No iPhone, use <strong>Compartilhar → Adicionar à Tela de Início</strong>.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

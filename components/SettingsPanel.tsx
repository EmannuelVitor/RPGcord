"use client";

import { Check, Download, ExternalLink, Github, Moon, Settings, Sun, X } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { useTheme } from "@/hooks/useTheme";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

type Props = { appearance: ReturnType<typeof useTheme>; embedded?: boolean; onClose: () => void };

export function SettingsPanel({ appearance, embedded = false, onClose }: Props) {
  const { theme, chosen, chooseTheme, followSystem } = appearance;
  const { canInstall, installed, install } = useInstallPrompt();
  useEscapeKey(onClose, !embedded);

  return (
    <div className={"drawer-backdrop settings-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer settings-drawer">
        <header><div><p className="eyebrow">Preferências locais</p><h2><Settings size={19} /> Configurações</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
        <section className="settings-content">
          <h3>Aparência</h3>
          <div className="theme-options">
            <button className={chosen && theme === "light" ? "active" : ""} onClick={() => chooseTheme("light")}><Sun /><strong>Modo claro</strong><span>Pergaminho e violeta</span></button>
            <button className={chosen && theme === "dark" ? "active" : ""} onClick={() => chooseTheme("dark")}><Moon /><strong>Modo escuro</strong><span>Menos brilho durante a sessão</span></button>
          </div>
          <p>{chosen
            ? <>Preferência salva neste navegador. <button className="text-button inline" onClick={followSystem}>Voltar a seguir o sistema</button></>
            : <>Seguindo o tema do seu sistema ({theme === "dark" ? "escuro" : "claro"}). Escolha acima para fixar.</>}</p>

          <h3>Aplicativo</h3>
          {installed ? (
            <div className="install-state"><Check size={16} /><span><strong>RPGcord instalado</strong><small>Abrindo em janela própria, sem a barra do navegador.</small></span></div>
          ) : canInstall ? (
            <button className="secondary-button full" onClick={() => void install()}><Download size={16} /> Instalar o RPGcord neste dispositivo</button>
          ) : (
            <p>Para instalar, use a opção <strong>Instalar aplicativo</strong> do seu navegador. No iPhone, use <strong>Compartilhar → Adicionar à Tela de Início</strong>.</p>
          )}

          <h3>Créditos</h3>
          <div className="credits-list">
            <a href="https://github.com/ErickMascarenhas" target="_blank" rel="noreferrer"><Github size={17} /><span><strong>Erick Mascarenhas</strong><small>Desenvolvimento e direção do projeto</small></span><ExternalLink size={14} /></a>
            <a href="https://github.com/EmannuelVitor" target="_blank" rel="noreferrer"><Github size={17} /><span><strong>Emannuel Vitor</strong><small>Desenvolvimento e colaboração</small></span><ExternalLink size={14} /></a>
          </div>
        </section>
      </aside>
    </div>
  );
}

"use client";

import { Shield, Sparkles } from "lucide-react";

type Props = {
  context: "discord" | "web";
  loading: boolean;
  error?: string;
  onGoogleLogin: () => Promise<void>;
  onTutorial: () => void;
};

export function LoginScreen({ context, loading, error, onGoogleLogin, onTutorial }: Props) {
  return (
    <main className="entry-shell">
      <section className="entry-card login-card">
        <span className="entry-mark"><Sparkles /></span>
        <p className="eyebrow">RPGcord</p>
        <h1>Sua mesa de RPG,<br />sempre no mesmo lugar.</h1>
        <p className="entry-copy">Crie campanhas, convide seus amigos, monte sua ficha e jogue com tudo sincronizado em tempo real.</p>
        {error && <div className="entry-error"><strong>Não foi possível entrar.</strong><span>{error}</span></div>}
        {context === "web" ? (
          <button className="google-button" onClick={onGoogleLogin} disabled={loading}>
            <b>G</b>{loading ? "Abrindo o Google…" : "Continuar com Google"}
          </button>
        ) : (
          <div className="discord-wait"><Shield size={18} /><span>{loading ? "Conectando à sua conta do Discord…" : "Abra novamente a atividade no Discord."}</span></div>
        )}
        <button className="tutorial-link" onClick={onTutorial}>Ver como o RPGcord funciona</button>
        <small className="entry-footnote">Ao entrar, você poderá criar uma campanha ou aceitar um convite.</small>
      </section>
    </main>
  );
}

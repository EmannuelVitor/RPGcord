"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[RPGcord] Erro de rota", error); }, [error]);
  return (
    <main className="fatal-error-page">
      <div><AlertTriangle size={38} /><p className="eyebrow">A aventura foi interrompida</p><h1>Não foi possível carregar esta tela</h1><p>Seus dados sincronizados continuam seguros. Tente reconstruir a tela ou volte ao início.</p><span>{error.digest ? `Código do erro: ${error.digest}` : null}</span><section><button className="primary-button" onClick={reset}><RotateCcw size={16} /> Tentar novamente</button><Link className="secondary-button" href="/"><Home size={16} /> Voltar ao início</Link></section></div>
    </main>
  );
}

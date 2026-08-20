"use client";

import { RotateCcw } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR"><body><main className="fatal-error-page"><div><p className="eyebrow">RPGcord</p><h1>A aplicação precisa ser recarregada</h1><p>Ocorreu um erro inesperado na estrutura principal. A sessão salva no Firebase não será apagada.</p><button className="primary-button" onClick={reset}><RotateCcw size={16} /> Recarregar aplicação</button></div></main></body></html>
  );
}

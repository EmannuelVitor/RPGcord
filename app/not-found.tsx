import { Home, Map } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return <main className="fatal-error-page"><div><Map size={38} /><p className="eyebrow">Caminho desconhecido</p><h1>Esta área não existe no mapa</h1><p>O endereço acessado não corresponde a nenhuma página do RPGcord.</p><Link className="primary-button" href="/"><Home size={16} /> Voltar ao início</Link></div></main>;
}

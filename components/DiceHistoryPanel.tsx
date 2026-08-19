"use client";

import { Dices, X } from "lucide-react";
import type { DiceRoll, DiceValidationMode } from "@/lib/types";

type Props = { rolls: DiceRoll[]; embedded?: boolean; onClose: () => void };

const validationLabels: Record<DiceValidationMode, string> = {
  highest: "maior resultado",
  lowest: "menor resultado",
  sum: "soma",
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(timestamp);
}

export function DiceHistoryPanel({ rolls, embedded = false, onClose }: Props) {
  return (
    <div className={"drawer-backdrop history-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer history-drawer">
        <header>
          <div><p className="eyebrow">Registro da mesa</p><h2><Dices size={19} /> Histórico de dados</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>
        <div className="history-list">
          {rolls.length === 0 ? <div className="history-empty"><Dices /><strong>Nenhuma rolagem ainda</strong><span>Os resultados desta campanha aparecerão aqui.</span></div> : rolls.map((roll) => (
            <article key={roll.id}>
              <span className="roll-avatar">{roll.userName.slice(0, 1).toUpperCase()}</span>
              <div><strong>{roll.userName}</strong><span>{roll.quantity ?? 1}d{roll.sides}{roll.modifier ? ` ${roll.modifier > 0 ? "+" : ""}${roll.modifier}` : ""} · {validationLabels[roll.validationMode ?? "sum"]}</span>{roll.results && roll.results.length > 1 ? <small>[{roll.results.join(", ")}]</small> : null}</div>
              <div className="history-total"><strong>{roll.total}</strong><time>{formatDate(roll.createdAt)}</time></div>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}

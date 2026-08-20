"use client";

import { ChevronLeft, ChevronRight, Dices, Plus, RotateCcw, Swords, Trash2, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { InitiativeEntry, InitiativeState, MapToken } from "@/lib/types";

type Props = {
  initiative: InitiativeState;
  tokens: MapToken[];
  isGM: boolean;
  embedded?: boolean;
  onSave: (initiative: InitiativeState) => Promise<void>;
  onClose: () => void;
};

function ordered(entries: InitiativeEntry[]) {
  return [...entries].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name, "pt-BR"));
}

export function InitiativeTracker({ initiative, tokens, isGM, embedded = false, onSave, onClose }: Props) {
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [customName, setCustomName] = useState("");
  const [score, setScore] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const availableTokens = useMemo(() => tokens.filter((token) => !initiative.entries.some((entry) => entry.tokenId === token.id)), [initiative.entries, tokens]);

  async function commit(next: InitiativeState) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await onSave(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a iniciativa.");
    } finally {
      setBusy(false);
    }
  }

  function addEntry(event: FormEvent) {
    event.preventDefault();
    const token = tokens.find((item) => item.id === selectedTokenId);
    const name = token?.name.trim() || customName.trim();
    if (!name) { setError("Escolha um pino ou informe um nome."); return; }
    const entry: InitiativeEntry = { id: crypto.randomUUID(), ...(token ? { tokenId: token.id } : {}), name, initiative: Math.round(score) };
    const activeId = initiative.entries[initiative.activeIndex]?.id;
    const entries = ordered([...initiative.entries, entry]);
    void commit({ ...initiative, entries, activeIndex: initiative.running && activeId ? entries.findIndex((item) => item.id === activeId) : -1 });
    setSelectedTokenId("");
    setCustomName("");
  }

  function rollAll() {
    const entries = tokens.map((token) => ({ id: crypto.randomUUID(), tokenId: token.id, name: token.name, initiative: Math.floor(Math.random() * 20) + 1 }));
    void commit({ entries: ordered(entries), activeIndex: entries.length ? 0 : -1, round: entries.length ? 1 : 0, running: entries.length > 0 });
  }

  function start() {
    const entries = ordered(initiative.entries);
    void commit({ ...initiative, entries, activeIndex: entries.length ? 0 : -1, round: entries.length ? 1 : 0, running: entries.length > 0 });
  }

  function advance(direction: 1 | -1) {
    if (!initiative.entries.length) return;
    let activeIndex = initiative.activeIndex + direction;
    let round = initiative.round;
    if (activeIndex >= initiative.entries.length) { activeIndex = 0; round += 1; }
    if (activeIndex < 0) { activeIndex = initiative.entries.length - 1; round = Math.max(1, round - 1); }
    void commit({ ...initiative, activeIndex, round, running: true });
  }

  function updateEntry(entryId: string, patch: Partial<InitiativeEntry>) {
    const activeId = initiative.entries[initiative.activeIndex]?.id;
    const entries = ordered(initiative.entries.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry));
    void commit({ ...initiative, entries, activeIndex: activeId ? entries.findIndex((entry) => entry.id === activeId) : -1 });
  }

  function removeEntry(entryId: string) {
    const activeId = initiative.entries[initiative.activeIndex]?.id;
    const entries = initiative.entries.filter((entry) => entry.id !== entryId);
    const activeIndex = activeId && activeId !== entryId ? entries.findIndex((entry) => entry.id === activeId) : Math.min(initiative.activeIndex, entries.length - 1);
    void commit({ ...initiative, entries, activeIndex, running: initiative.running && entries.length > 0, round: entries.length ? initiative.round : 0 });
  }

  return (
    <div className={"drawer-backdrop initiative-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer initiative-drawer">
        <header><div><p className="eyebrow">Ordem de combate</p><h2><Swords size={19} /> Iniciativa</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
        <div className="initiative-content">
          <section className="initiative-round"><div><span>Rodada</span><strong>{initiative.round || "—"}</strong></div><p>{initiative.running && initiative.entries[initiative.activeIndex] ? <>Turno de <strong>{initiative.entries[initiative.activeIndex].name}</strong></> : "Combate ainda não iniciado"}</p></section>

          {initiative.entries.length ? <ol className="initiative-list">{initiative.entries.map((entry, index) => {
            const token = tokens.find((item) => item.id === entry.tokenId);
            return <li className={initiative.running && index === initiative.activeIndex ? "active" : ""} key={entry.id}>
              <span className="initiative-position">{index + 1}</span>
              <span className="initiative-avatar" style={{ "--token-color": token?.color ?? "#7259c7" } as React.CSSProperties}>{token?.imageUrl ? <img src={token.imageUrl} alt="" /> : token?.initials || entry.name.slice(0, 2).toUpperCase()}</span>
              <div><strong>{entry.name}</strong>{initiative.running && index === initiative.activeIndex ? <small>Turno atual</small> : null}</div>
              {isGM ? <input key={`${entry.id}:${entry.initiative}`} aria-label={`Iniciativa de ${entry.name}`} type="number" defaultValue={entry.initiative} onBlur={(event) => updateEntry(entry.id, { initiative: Number(event.target.value) || 0 })} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /> : <b>{entry.initiative}</b>}
              {isGM ? <button className="initiative-remove" onClick={() => removeEntry(entry.id)} aria-label={`Remover ${entry.name}`}><Trash2 size={13} /></button> : null}
            </li>;
          })}</ol> : <div className="initiative-empty"><Swords size={28} /><strong>Ninguém na ordem de iniciativa</strong><span>O mestre pode adicionar pinos ou participantes avulsos.</span></div>}

          {error ? <p className="form-error">{error}</p> : null}
          {isGM ? <>
            <div className="initiative-controls">
              {initiative.running ? <><button className="secondary-button" disabled={busy} onClick={() => advance(-1)}><ChevronLeft size={15} /> Anterior</button><button className="primary-button" disabled={busy} onClick={() => advance(1)}>Próximo <ChevronRight size={15} /></button></> : <button className="primary-button full" disabled={busy || !initiative.entries.length} onClick={start}><Swords size={15} /> Iniciar combate</button>}
            </div>
            <form className="initiative-form" onSubmit={addEntry}>
              <h3>Adicionar participante</h3>
              <label>Pino da mesa<select value={selectedTokenId} onChange={(event) => setSelectedTokenId(event.target.value)}><option value="">Participante avulso</option>{availableTokens.map((token) => <option value={token.id} key={token.id}>{token.name}</option>)}</select></label>
              {!selectedTokenId ? <label>Nome<input value={customName} maxLength={80} onChange={(event) => setCustomName(event.target.value)} placeholder="Ex.: Guarda da torre" /></label> : null}
              <label>Valor de iniciativa<input type="number" value={score} onChange={(event) => setScore(Number(event.target.value) || 0)} /></label>
              <button className="secondary-button full" disabled={busy}><Plus size={15} /> Adicionar à ordem</button>
            </form>
            <div className="initiative-quick-actions"><button onClick={rollAll} disabled={busy || !tokens.length}><Dices size={14} /> Rolar todos os pinos</button><button onClick={() => void commit({ entries: [], activeIndex: -1, round: 0, running: false })} disabled={busy || !initiative.entries.length}><RotateCcw size={14} /> Limpar combate</button></div>
          </> : <p className="initiative-readonly">A ordem é controlada pelo mestre e atualizada ao vivo para toda a mesa.</p>}
        </div>
      </aside>
    </div>
  );
}

"use client";

import { Eye, EyeOff, Gauge, HeartPulse, LockKeyhole, Plus, Save, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { isMonsterFieldRevealed, monsterFieldKey, normalizeMonsterSheet, toggleMonsterField } from "@/lib/monster-sheet";
import type { InitiativeState, MapToken, MonsterDetail, MonsterDetailKind, MonsterSheet } from "@/lib/types";

const groups: Array<{ kind: MonsterDetailKind; key: "attributes" | "weaknesses" | "abilities"; label: string }> = [
  { kind: "attribute", key: "attributes", label: "Atributos" },
  { kind: "weakness", key: "weaknesses", label: "Fraquezas" },
  { kind: "ability", key: "abilities", label: "Habilidades" },
];

export function MonsterSheetEditor({ token, onSave, revealControls = true }: { token: MapToken; onSave: (sheet: MonsterSheet) => Promise<void>; revealControls?: boolean }) {
  const [draft, setDraft] = useState(() => normalizeMonsterSheet(token.monsterSheet));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(normalizeMonsterSheet(token.monsterSheet)), [token.monsterSheet]);

  function addDetail(key: "attributes" | "weaknesses" | "abilities") {
    const defaults = key === "attributes" ? ["Novo atributo", "0"] : key === "weaknesses" ? ["Nova fraqueza", "Descrição"] : ["Nova habilidade", "Descrição"];
    setDraft((current) => ({ ...current, [key]: [...current[key], { id: crypto.randomUUID(), label: defaults[0], value: defaults[1] }] }));
  }

  function updateDetail(key: "attributes" | "weaknesses" | "abilities", id: string, patch: Partial<MonsterDetail>) {
    setDraft((current) => ({ ...current, [key]: current[key].map((detail) => detail.id === id ? { ...detail, ...patch } : detail) }));
  }

  async function save(next = draft) {
    if (busy) return;
    setBusy(true);
    try {
      const normalized = normalizeMonsterSheet(next);
      setDraft(normalized);
      await onSave(normalized);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(field: string) {
    const next = toggleMonsterField(draft, field);
    setDraft(next);
    await save(next);
  }

  return <div className="monster-sheet-editor">
    <div className="monster-core-fields">
      <label>Nível<input type="number" min="0" max="999" value={draft.level} onChange={(event) => setDraft({ ...draft, level: Number(event.target.value) })} /></label>
      {revealControls ? <button className={isMonsterFieldRevealed(draft, "level") ? "revealed" : ""} type="button" onClick={() => void toggle("level")} title="Alternar revelação do nível">{isMonsterFieldRevealed(draft, "level") ? <Eye size={14} /> : <EyeOff size={14} />}</button> : <span />}
      <label>Vida atual<input type="number" min="0" value={draft.hp} onChange={(event) => setDraft({ ...draft, hp: Number(event.target.value) })} /></label>
      <label>Vida máxima<input type="number" min="1" value={draft.maxHp} onChange={(event) => setDraft({ ...draft, maxHp: Number(event.target.value) })} /></label>
      {revealControls ? <button className={isMonsterFieldRevealed(draft, "health") ? "revealed" : ""} type="button" onClick={() => void toggle("health")} title="Alternar revelação da vida">{isMonsterFieldRevealed(draft, "health") ? <Eye size={14} /> : <EyeOff size={14} />}</button> : <span />}
    </div>

    {groups.map((group) => <section className="monster-detail-group" key={group.kind}>
      <header><strong>{group.label}</strong><button type="button" onClick={() => addDetail(group.key)}><Plus size={13} /> Adicionar</button></header>
      {draft[group.key].map((detail) => {
        const field = monsterFieldKey(group.kind, detail.id);
        const revealed = isMonsterFieldRevealed(draft, field);
        return <article key={detail.id}>
          <input aria-label={`Nome de ${group.label.toLowerCase()}`} value={detail.label} onChange={(event) => updateDetail(group.key, detail.id, { label: event.target.value })} />
          <textarea aria-label={`Descrição de ${detail.label}`} value={detail.value} onChange={(event) => updateDetail(group.key, detail.id, { value: event.target.value })} />
          {revealControls ? <button className={revealed ? "revealed" : ""} type="button" onClick={() => void toggle(field)} title={revealed ? "Ocultar dos jogadores" : "Revelar aos jogadores"}>{revealed ? <Eye size={14} /> : <EyeOff size={14} />}</button> : <span />}
          <button className="danger" type="button" onClick={() => setDraft((current) => ({ ...current, [group.key]: current[group.key].filter((item) => item.id !== detail.id), revealedFields: current.revealedFields.filter((item) => item !== field) }))}><Trash2 size={14} /></button>
        </article>;
      })}
      {!draft[group.key].length ? <p>Nenhuma informação cadastrada.</p> : null}
    </section>)}
    <button className="secondary-button full" type="button" disabled={busy} onClick={() => void save()}><Save size={14} /> {busy ? "Salvando…" : saved ? "Ficha sincronizada" : "Salvar ficha da criatura"}</button>
  </div>;
}

function RevealButton({ revealed, label, onClick }: { revealed: boolean; label: string; onClick: () => void }) {
  return <button className="monster-reveal-button" type="button" title={(revealed ? "Ocultar " : "Revelar ") + label} aria-label={(revealed ? "Ocultar " : "Revelar ") + label} onClick={onClick}>{revealed ? <Eye size={13} /> : <EyeOff size={13} />}</button>;
}

export function MonsterCombatCards({ initiative, tokens, isGM, onSave }: {
  initiative: InitiativeState;
  tokens: MapToken[];
  isGM: boolean;
  onSave?: (tokenId: string, sheet: MonsterSheet) => Promise<void>;
}) {
  const monsters = initiative.entries.map((entry) => tokens.find((token) => token.id === entry.tokenId && token.kind === "monster")).filter((token): token is MapToken => Boolean(token));
  if (!monsters.length) return null;

  function toggle(token: MapToken, field: string) {
    if (!isGM || !onSave) return;
    void onSave(token.id, toggleMonsterField(normalizeMonsterSheet(token.monsterSheet), field));
  }

  return <section className="monster-combat-section">
    <header><div><ShieldAlert size={17} /><strong>Informações dos inimigos</strong></div><small>Dados revelados pelo mestre durante o combate</small></header>
    <div className="monster-combat-grid">{monsters.map((token) => {
      const sheet = normalizeMonsterSheet(token.monsterSheet);
      const levelVisible = isGM || isMonsterFieldRevealed(sheet, "level");
      const healthVisible = isGM || isMonsterFieldRevealed(sheet, "health");
      const healthPercent = sheet.maxHp > 0 ? Math.max(0, Math.min(100, sheet.hp / sheet.maxHp * 100)) : 0;
      return <article className="monster-combat-card" key={token.id}>
        <header><span style={{ "--token-color": token.color } as React.CSSProperties}>{token.imageUrl ? <img src={token.imageUrl} alt="" /> : token.initials}</span><div><strong>{token.name}</strong><small>{levelVisible ? `Nível ${sheet.level}` : <><LockKeyhole size={11} /> Nível oculto</>}</small></div>{isGM ? <RevealButton revealed={isMonsterFieldRevealed(sheet, "level")} label={`nível de ${token.name}`} onClick={() => toggle(token, "level")} /> : null}</header>
        <div className={"monster-health " + (healthVisible ? "revealed" : "hidden")}>
          <p><HeartPulse size={13} /><span>Vida</span><b>{healthVisible ? `${sheet.hp}/${sheet.maxHp}` : "Oculta"}</b>{isGM ? <RevealButton revealed={isMonsterFieldRevealed(sheet, "health")} label={`vida de ${token.name}`} onClick={() => toggle(token, "health")} /> : null}</p>
          <i><em style={{ width: healthVisible ? `${healthPercent}%` : "0%" }} /></i>
        </div>
        {groups.map((group) => <section key={group.kind}>
          <h4>{group.kind === "attribute" ? <Gauge size={13} /> : group.kind === "weakness" ? <ShieldAlert size={13} /> : <Sparkles size={13} />}{group.label}</h4>
          {sheet[group.key].length ? sheet[group.key].map((detail) => {
            const field = monsterFieldKey(group.kind, detail.id);
            const visible = isGM || isMonsterFieldRevealed(sheet, field);
            return <div className={visible ? "revealed" : "hidden"} key={detail.id}><span>{visible ? detail.label : <><LockKeyhole size={11} /> Informação oculta</>}</span><strong>{visible ? detail.value : "—"}</strong>{isGM ? <RevealButton revealed={isMonsterFieldRevealed(sheet, field)} label={`${detail.label} de ${token.name}`} onClick={() => toggle(token, field)} /> : null}</div>;
          }) : <p className="monster-group-empty">{isGM ? "Nada cadastrado" : "Nenhuma informação revelada"}</p>}
        </section>)}
      </article>;
    })}</div>
  </section>;
}

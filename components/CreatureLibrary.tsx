"use client";

import { Check, Plus, Save, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { MonsterSheetEditor } from "@/components/MonsterSheets";
import { blankCreature, normalizeCreature } from "@/lib/creature";
import { toDirectDriveUrl } from "@/lib/drive";
import type { CreatureRecord, MapToken, MonsterSheet } from "@/lib/types";

function editableCreature(creature: CreatureRecord): CreatureRecord {
  return {
    ...creature,
    sheet: {
      ...creature.sheet,
      attributes: creature.sheet.attributes.map((item) => ({ ...item })),
      weaknesses: creature.sheet.weaknesses.map((item) => ({ ...item })),
      abilities: creature.sheet.abilities.map((item) => ({ ...item })),
      revealedFields: [],
    },
  };
}

export function CreatureLibrary({ campaignId, creatures, onSave, onDelete }: {
  campaignId: string;
  creatures: CreatureRecord[];
  onSave: (creature: CreatureRecord) => Promise<void>;
  onDelete: (creatureId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CreatureRecord>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [error, setError] = useState<string>();
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return term ? creatures.filter((creature) => creature.name.toLocaleLowerCase("pt-BR").includes(term)) : creatures;
  }, [creatures, query]);

  function select(creature: CreatureRecord) {
    setDraft(editableCreature(creature));
    setDeleteArmed(false);
    setError(undefined);
  }

  function create() {
    setDraft(blankCreature());
    setDeleteArmed(false);
    setError(undefined);
  }

  async function save(sheet: MonsterSheet = draft?.sheet ?? blankCreature().sheet) {
    if (!draft || busy) return;
    if (!draft.name.trim()) { setError("Informe o nome da criatura."); return; }
    setBusy(true);
    setError(undefined);
    try {
      const next = normalizeCreature({ ...draft, imageUrl: toDirectDriveUrl(draft.imageUrl ?? "", campaignId), sheet });
      await onSave(next);
      setDraft(editableCreature(next));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a criatura.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await onDelete(draft.id);
      setDraft(undefined);
      setDeleteArmed(false);
    } finally {
      setBusy(false);
    }
  }

  const token: MapToken | undefined = draft ? {
    id: draft.id,
    ownerId: "library",
    name: draft.name,
    initials: draft.initials,
    x: 50,
    y: 50,
    color: draft.color,
    imageUrl: draft.imageUrl,
    kind: "monster",
    monsterSheet: draft.sheet,
  } : undefined;

  return <div className="creature-library">
    <div className="creature-toolbar">
      <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no bestiário" /></label>
      <button className="secondary-button" type="button" onClick={create}><Plus size={15} /> Nova criatura</button>
    </div>
    <div className="creature-library-layout">
      <aside className="creature-catalog" aria-label="Bestiário da campanha">
        {filtered.map((creature) => <button className={draft?.id === creature.id ? "active" : ""} type="button" key={creature.id} onClick={() => select(creature)}>
          <span style={{ background: creature.color }}>{creature.imageUrl ? <img src={creature.imageUrl} alt="" /> : creature.initials}</span>
          <div><strong>{creature.name}</strong><small>Nível {creature.sheet.level} · {creature.sheet.hp} PV</small></div>
        </button>)}
        {!filtered.length ? <p>{creatures.length ? "Nenhuma criatura encontrada." : "O bestiário está vazio."}</p> : null}
      </aside>
      <section className="creature-editor">
        {draft && token ? <>
          <div className="creature-identity">
            <label>Nome<input value={draft.name} maxLength={100} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label>Cor do pino<input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /></label>
            <label className="wide">Imagem opcional<input value={draft.imageUrl ?? ""} placeholder="Link público ou Google Drive" onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} /></label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="creature-identity-actions">
            {deleteArmed ? <><span>Excluir do bestiário?</span><button className="danger-button" type="button" disabled={busy} onClick={() => void remove()}><Trash2 size={14} /> Confirmar</button></> : <button className="danger-text-button" type="button" onClick={() => setDeleteArmed(true)}><Trash2 size={14} /> Excluir</button>}
            <button className="secondary-button" type="button" disabled={busy} onClick={() => void save()}>{saved ? <Check size={14} /> : <Save size={14} />} {saved ? "Salva" : "Salvar identidade"}</button>
          </div>
          <MonsterSheetEditor token={token} revealControls={false} onSave={save} />
        </> : <div className="creature-editor-empty"><strong>Bestiário reutilizável</strong><span>Selecione uma criatura ou crie uma nova. Depois, ela poderá ser colocada em qualquer cena.</span></div>}
      </section>
    </div>
  </div>;
}

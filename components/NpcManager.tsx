"use client";

import { MapPin, Plus, Save, Search, Tags, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toDirectDriveUrl } from "@/lib/drive";
import type { NpcRecord } from "@/lib/types";

function blankNpc(): NpcRecord {
  return {
    id: crypto.randomUUID(),
    name: "",
    role: "",
    location: "",
    description: "",
    appearance: "",
    personality: "",
    goals: "",
    notes: "",
    tags: [],
  };
}

export function NpcManager({ campaignId, npcs, embedded = false, onSave, onDelete, onClose }: {
  campaignId: string;
  npcs: NpcRecord[];
  embedded?: boolean;
  onSave: (npc: NpcRecord) => Promise<void>;
  onDelete: (npcId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<NpcRecord>();
  const [tagText, setTagText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [deleteArmed, setDeleteArmed] = useState(false);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return npcs;
    return npcs.filter((npc) => [npc.name, npc.role, npc.location, ...npc.tags].some((value) => value.toLocaleLowerCase("pt-BR").includes(term)));
  }, [npcs, query]);

  function edit(npc: NpcRecord) {
    setDraft({ ...npc, tags: [...npc.tags] });
    setTagText(npc.tags.join(", "));
    setDeleteArmed(false);
    setError(undefined);
  }

  function create() {
    const npc = blankNpc();
    setDraft(npc);
    setTagText("");
    setDeleteArmed(false);
    setError(undefined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    if (!draft.name.trim()) { setError("Informe o nome do NPC."); return; }
    setBusy(true);
    setError(undefined);
    try {
      const next = {
        ...draft,
        imageUrl: draft.imageUrl ? toDirectDriveUrl(draft.imageUrl, campaignId) : undefined,
        tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean),
      };
      await onSave(next);
      setDraft(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o NPC.");
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

  return <div className={"drawer-backdrop npc-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="drawer npc-drawer">
      <header><div><p className="eyebrow">Catálogo do mestre</p><h2><UsersRound size={19} /> Personagens não jogáveis</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
      <div className="npc-toolbar">
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, local ou tag" /></label>
        <button className="secondary-button" onClick={create}><Plus size={15} /> Novo NPC</button>
      </div>
      <div className="npc-layout">
        <section className="npc-catalog" aria-label="NPCs catalogados">
          {filtered.map((npc) => <button className={draft?.id === npc.id ? "active" : ""} key={npc.id} onClick={() => edit(npc)}>
            <span>{npc.imageUrl ? <img src={npc.imageUrl} alt="" /> : <UserRound size={18} />}</span>
            <div><strong>{npc.name}</strong><small>{npc.role || "Papel não definido"}</small>{npc.location ? <em><MapPin size={10} /> {npc.location}</em> : null}</div>
          </button>)}
          {!filtered.length ? <div className="npc-empty"><UsersRound size={27} /><strong>{npcs.length ? "Nenhum NPC corresponde à busca" : "Seu catálogo está vazio"}</strong><span>Crie fichas rápidas para aliados, rivais e figurantes.</span></div> : null}
        </section>

        {draft ? <form className="npc-editor" onSubmit={submit}>
          <div className="npc-editor-heading"><div><p className="eyebrow">Ficha simplificada</p><h3>{draft.name || "Novo NPC"}</h3></div><button type="button" onClick={() => setDraft(undefined)} aria-label="Fechar edição"><X size={16} /></button></div>
          <label>Nome<input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <div className="npc-inline-fields"><label>Papel / ocupação<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} placeholder="Ex.: Ferreiro, informante" /></label><label>Localização<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="Ex.: Distrito do porto" /></label></div>
          <label>Imagem opcional<input value={draft.imageUrl ?? ""} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="Link público ou Google Drive" /></label>
          <label>Resumo narrativo<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Quem é e por que importa para a campanha?" /></label>
          <div className="npc-inline-fields"><label>Aparência<textarea value={draft.appearance} onChange={(event) => setDraft({ ...draft, appearance: event.target.value })} /></label><label>Personalidade<textarea value={draft.personality} onChange={(event) => setDraft({ ...draft, personality: event.target.value })} /></label></div>
          <label>Objetivos e motivações<textarea value={draft.goals} onChange={(event) => setDraft({ ...draft, goals: event.target.value })} /></label>
          <label>Anotações privadas<textarea className="npc-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
          <label>Tags<span className="npc-tag-input"><Tags size={14} /><input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="aliado, cidade, guilda" /></span></label>
          {error ? <p className="form-error">{error}</p> : null}
          <footer>
            {npcs.some((npc) => npc.id === draft.id) ? deleteArmed ? <><span>Excluir este NPC?</span><button className="danger-button" type="button" disabled={busy} onClick={() => void remove()}><Trash2 size={14} /> Confirmar</button></> : <button className="text-button danger-text" type="button" onClick={() => setDeleteArmed(true)}><Trash2 size={14} /> Excluir</button> : <span />}
            <button className="primary-button" disabled={busy}><Save size={15} /> {busy ? "Salvando…" : "Salvar NPC"}</button>
          </footer>
        </form> : <section className="npc-editor-placeholder"><UserRound size={30} /><strong>Selecione ou crie um NPC</strong><span>A ficha rápida fica disponível apenas para o mestre.</span></section>}
      </div>
    </aside>
  </div>;
}

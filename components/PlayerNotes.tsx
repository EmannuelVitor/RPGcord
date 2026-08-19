"use client";

import { Eye, EyeOff, NotebookPen, Save, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { CampaignMember, CharacterNotes } from "@/lib/types";

type Props = {
  notes: CharacterNotes;
  participants: CampaignMember[];
  userId: string;
  embedded?: boolean;
  onSave: (notes: CharacterNotes) => Promise<void>;
  onClose: () => void;
};

export function PlayerNotes({ notes, participants, userId, embedded = false, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(notes), [notes]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ ...draft, content: draft.content.slice(0, 20000) });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } finally {
      setSaving(false);
    }
  }

  const otherPlayers = participants.filter((member) => member.userId !== userId && member.role !== "gm");

  return (
    <div className={"drawer-backdrop notes-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="drawer notes-drawer" onSubmit={submit}>
        <header><div><p className="eyebrow">Anotações da personagem</p><h2><NotebookPen size={19} /> Meu bloco de notas</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
        <div className="notes-content">
          <p>Estas notas pertencem à sua ficha. Por padrão, apenas você pode lê-las.</p>
          <textarea maxLength={20000} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="Pistas, suspeitas, objetivos, itens escondidos..." />
          <label className="toggle-field"><input type="checkbox" checked={draft.shareWithGM} onChange={(event) => setDraft({ ...draft, shareWithGM: event.target.checked })} /><span>{draft.shareWithGM ? <Eye size={16} /> : <EyeOff size={16} />}<strong>Permitir que o mestre leia</strong><small>Você pode retirar essa permissão a qualquer momento.</small></span></label>
          {otherPlayers.length > 0 ? <fieldset><legend>Compartilhar com jogadores específicos</legend>{otherPlayers.map((member) => <label key={member.userId}><input type="checkbox" checked={draft.sharedWithPlayerIds.includes(member.userId)} onChange={(event) => setDraft((current) => ({ ...current, sharedWithPlayerIds: event.target.checked ? [...current.sharedWithPlayerIds, member.userId] : current.sharedWithPlayerIds.filter((id) => id !== member.userId) }))} /> {member.name}</label>)}</fieldset> : null}
        </div>
        <footer><span>{saved ? "Notas sincronizadas." : `${draft.content.length.toLocaleString("pt-BR")} / 20.000`}</span><button className="primary-button" disabled={saving}><Save size={16} /> {saving ? "Salvando..." : "Salvar notas"}</button></footer>
      </form>
    </div>
  );
}

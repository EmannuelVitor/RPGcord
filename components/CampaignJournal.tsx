"use client";

import { BookOpen, Save, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { CampaignJournal as Journal } from "@/lib/types";

type Props = {
  journal: Journal;
  isGM: boolean;
  onSave: (content: string) => Promise<void>;
  embedded?: boolean;
  onClose: () => void;
};

export function CampaignJournal({ journal, isGM, embedded = false, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(journal.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(journal.content);
  }, [journal.content]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isGM || saving) return;
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={"drawer-backdrop journal-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer journal-drawer">
        <header>
          <div><p className="eyebrow">Memória da aventura</p><h2><BookOpen size={19} /> Diário da campanha</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>
        {isGM ? (
          <form className="journal-editor" onSubmit={submit}>
            <p>Registre acontecimentos, NPCs, pistas, objetivos e resumos das sessões. Todos os jogadores poderão ler.</p>
            <textarea maxLength={20000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ex.: Sessão 1 — O grupo chegou a Vael Turog..." />
            <footer><span>{saved ? "Diário sincronizado." : `${draft.length.toLocaleString("pt-BR")} / 20.000 caracteres`}</span><button className="primary-button" disabled={saving}><Save size={16} /> {saving ? "Salvando..." : "Salvar diário"}</button></footer>
          </form>
        ) : (
          <div className="journal-reader">
            {journal.content ? <p>{journal.content}</p> : <div><BookOpen /><strong>O diário ainda está em branco</strong><span>O mestre poderá registrar aqui o resumo da campanha.</span></div>}
          </div>
        )}
        {journal.updatedByName && <small className="journal-updated">Última atualização por {journal.updatedByName}</small>}
      </aside>
    </div>
  );
}

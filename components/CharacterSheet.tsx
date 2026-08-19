"use client";

import { Heart, Image as ImageIcon, LoaderCircle, Save, Shield, Sparkles, Upload, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { toDirectDriveUrl } from "@/lib/drive";
import type { AttributeKey, Character } from "@/lib/types";

type Props = { campaignId: string; character: Character; onSave: (character: Character) => Promise<void>; onClose: () => void };
const labels: Record<AttributeKey, string> = { forca: "Força", destreza: "Destreza", constituicao: "Constituição", inteligencia: "Inteligência", sabedoria: "Sabedoria", carisma: "Carisma" };
const attributeKeys = Object.keys(labels) as AttributeKey[];

function modifier(score: number) {
  const value = Math.floor((score - 10) / 2);
  return value >= 0 ? `+${value}` : String(value);
}

export function CharacterSheet({ campaignId, character, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(character);
  const [saved, setSaved] = useState(false);
  const [imageFile, setImageFile] = useState<File>();
  const [imagePreview, setImagePreview] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(undefined);
      return;
    }
    const preview = URL.createObjectURL(imageFile);
    setImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [imageFile]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(undefined);
    try {
      let imageUrl = toDirectDriveUrl(draft.imageUrl ?? "");
      if (imageFile) {
        if (imageFile.size > 4 * 1024 * 1024) throw new Error("A imagem pode ter no máximo 4 MB.");
        const token = await auth?.currentUser?.getIdToken();
        if (!token) throw new Error("Sua sessão expirou. Entre novamente para enviar a imagem.");
        const body = new FormData();
        body.set("campaignId", campaignId);
        body.set("file", imageFile);
        body.set("purpose", "character");
        const response = await fetch("/api/chat-upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível enviar a imagem.");
        imageUrl = result.imageUrl;
      }
      await onSave({ ...draft, imageUrl });
      setDraft((current) => ({ ...current, imageUrl }));
      setImageFile(undefined);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar a ficha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="drawer sheet-drawer" onSubmit={submit}>
        <header>
          <div><p className="eyebrow">Minha personagem</p><h2>Ficha de aventureiro</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>

        <div className="identity-fields">
          <label className="wide">Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>Ancestralidade<input value={draft.ancestry} onChange={(e) => setDraft({ ...draft, ancestry: e.target.value })} /></label>
          <label>Classe<input value={draft.characterClass} onChange={(e) => setDraft({ ...draft, characterClass: e.target.value })} /></label>
          <label>Nível<input type="number" min="1" value={draft.level} onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })} /></label>
          <label className="wide">Imagem da personagem
            <span className="image-link-field">
              <ImageIcon size={16} />
              <input placeholder="Link público da imagem ou do Google Drive" value={draft.imageUrl ?? ""} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} />
            </span>
          </label>
          <label className="character-upload wide">
            <Upload size={17} />
            <span><strong>Enviar uma imagem</strong><small>JPG, PNG, WebP ou GIF — até 4 MB</small></span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImageFile(event.target.files?.[0])} />
          </label>
          {(imagePreview || draft.imageUrl) && <div className="character-image-preview"><img src={imagePreview || toDirectDriveUrl(draft.imageUrl ?? "")} alt="Prévia da personagem" /></div>}
          {imageFile && <div className="character-upload-name"><span>{imageFile.name}</span><button type="button" onClick={() => setImageFile(undefined)}><X size={14} /> Remover</button></div>}
          {error && <p className="sheet-error wide">{error}</p>}
        </div>

        <div className="vitals">
          <label><Heart size={18} /> Vida <input type="number" value={draft.hp} onChange={(e) => setDraft({ ...draft, hp: Number(e.target.value) })} /><span>/</span><input type="number" value={draft.maxHp} onChange={(e) => setDraft({ ...draft, maxHp: Number(e.target.value) })} /></label>
          <label><Shield size={18} /> Classe de armadura <input type="number" value={draft.armorClass} onChange={(e) => setDraft({ ...draft, armorClass: Number(e.target.value) })} /></label>
        </div>

        <section className="sheet-section">
          <h3><Sparkles size={16} /> Atributos</h3>
          <div className="attributes-grid">
            {attributeKeys.map((key) => (
              <label key={key}><span>{labels[key]}</span><input type="number" value={draft.attributes[key]} onChange={(e) => setDraft({ ...draft, attributes: { ...draft.attributes, [key]: Number(e.target.value) } })} /><b>{modifier(draft.attributes[key])}</b></label>
            ))}
          </div>
        </section>

        <section className="sheet-section two-columns">
          <label><span>Perícias <small>(separe por vírgulas)</small></span><textarea value={draft.skills.join(", ")} onChange={(e) => setDraft({ ...draft, skills: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></label>
          <label><span>Inventário <small>(um item por linha)</small></span><textarea value={draft.inventory} onChange={(e) => setDraft({ ...draft, inventory: e.target.value })} /></label>
        </section>

        <footer><span>{saved ? "Ficha salva e sincronizada." : "As mudanças só aparecem após salvar."}</span><button className="primary-button" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} {saving ? "Enviando..." : "Salvar ficha"}</button></footer>
      </form>
    </div>
  );
}

"use client";

import { Bold, CheckSquare, Image as ImageIcon, Italic, List, LoaderCircle, Minus, Plus, Save, Upload, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { toDirectDriveUrl } from "@/lib/drive";
import { buildCharacterFields, syncLegacyCharacter } from "@/lib/sheet-template";
import type { Character, SheetCategory, SheetFieldDefinition, SheetFieldValue, SheetStatusValue, SheetTemplate } from "@/lib/types";

type Props = { campaignId: string; character: Character; template: SheetTemplate; embedded?: boolean; onSave: (character: Character) => Promise<void>; onClose: () => void };

const categoryLabels: Record<SheetCategory, string> = {
  attributes: "Atributos",
  skills: "Perícias",
  abilities: "Habilidades / Magias",
  inventory: "Inventário / Equipamentos",
};

function RichTextInput({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function format(prefix: string, suffix = prefix) {
    const element = ref.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    onChange(value.slice(0, start) + prefix + value.slice(start, end) + suffix + value.slice(end));
    window.requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + prefix.length, end + prefix.length); });
  }
  return <div className="rich-field">
    <div className="rich-toolbar">
      <button type="button" onClick={() => format("**")} title="Negrito"><Bold size={14} /></button>
      <button type="button" onClick={() => format("_")} title="Itálico"><Italic size={14} /></button>
      <button type="button" onClick={() => format("- ", "")} title="Lista"><List size={14} /></button>
    </div>
    <textarea ref={ref} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </div>;
}

export function CharacterSheet({ campaignId, character, template, embedded = false, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Character>(() => ({ ...character, customFields: buildCharacterFields(character, template) }));
  const [saved, setSaved] = useState(false);
  const [imageFile, setImageFile] = useState<File>();
  const [imagePreview, setImagePreview] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setDraft({ ...character, customFields: buildCharacterFields(character, template) }), [character, template]);
  useEffect(() => {
    if (!imageFile) { setImagePreview(undefined); return; }
    const preview = URL.createObjectURL(imageFile);
    setImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [imageFile]);

  function updateValue(field: SheetFieldDefinition, value: SheetFieldValue) {
    setDraft((current) => ({ ...current, customFields: { ...(current.customFields ?? {}), [field.id]: value } }));
  }

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
        const response = await fetch("/api/chat-upload", { method: "POST", headers: { Authorization: "Bearer " + token }, body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível enviar a imagem.");
        imageUrl = result.imageUrl;
      }
      const synchronized = syncLegacyCharacter({ ...draft, imageUrl });
      await onSave(synchronized);
      setDraft(synchronized);
      setImageFile(undefined);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar a ficha.");
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: SheetFieldDefinition) {
    const value = draft.customFields?.[field.id];
    if (field.type === "checkbox") return <label className="dynamic-check"><input type="checkbox" checked={Boolean(value)} onChange={(event) => updateValue(field, event.target.checked)} /><CheckSquare size={17} /><span><strong>{field.label}</strong><small>{field.placeholder}</small></span></label>;
    if (field.type === "status") {
      const status = value && typeof value === "object" ? value as SheetStatusValue : { current: 0, max: 0 };
      const percent = status.max > 0 ? Math.max(0, Math.min(100, status.current / status.max * 100)) : 0;
      return <label className="dynamic-field status-field"><span>{field.label}</span><div className="status-inputs"><input type="number" min={field.min} max={field.max} value={status.current} onChange={(event) => updateValue(field, { ...status, current: Number(event.target.value) })} /><i>/</i><input type="number" min={field.min} max={field.max} value={status.max} onChange={(event) => updateValue(field, { ...status, max: Number(event.target.value) })} /></div><div className="status-bar"><i style={{ width: percent + "%" }} /></div>{field.placeholder && <small>{field.placeholder}</small>}</label>;
    }
    if (field.type === "counter") {
      const count = typeof value === "number" ? value : 0;
      return <label className="dynamic-field counter-field"><span>{field.label}</span><div><button type="button" onClick={() => updateValue(field, Math.max(field.min ?? -9999, count - 1))}><Minus size={15} /></button><input type="number" min={field.min} max={field.max} value={count} onChange={(event) => updateValue(field, Number(event.target.value))} /><button type="button" onClick={() => updateValue(field, Math.min(field.max ?? 9999, count + 1))}><Plus size={15} /></button></div>{field.placeholder && <small>{field.placeholder}</small>}</label>;
    }
    if (field.type === "richtext") return <label className="dynamic-field rich-dynamic-field"><span>{field.label}</span><RichTextInput value={typeof value === "string" ? value : ""} placeholder={field.placeholder} onChange={(nextValue) => updateValue(field, nextValue)} />{field.formula && <small className="field-formula">Fórmula: {field.formula}</small>}</label>;
    return <label className="dynamic-field"><span>{field.label}</span><input type={field.type === "number" ? "number" : "text"} min={field.min} max={field.max} value={field.type === "number" ? (typeof value === "number" ? value : 0) : (typeof value === "string" ? value : "")} placeholder={field.placeholder} onChange={(event) => updateValue(field, field.type === "number" ? Number(event.target.value) : event.target.value)} />{field.formula && <small className="field-formula">Fórmula: {field.formula}</small>}</label>;
  }

  return <div className={"drawer-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="drawer sheet-drawer dynamic-sheet" onSubmit={submit}>
      <header><div><p className="eyebrow">Minha personagem</p><h2>{template.name}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
      <div className="identity-fields">
        <label className="wide">Nome<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="wide">Imagem da personagem<span className="image-link-field"><ImageIcon size={16} /><input placeholder="Link público da imagem ou do Google Drive" value={draft.imageUrl ?? ""} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} /></span></label>
        <label className="character-upload wide"><Upload size={17} /><span><strong>Enviar uma imagem</strong><small>JPG, PNG, WebP ou GIF — até 4 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImageFile(event.target.files?.[0])} /></label>
        {(imagePreview || draft.imageUrl) && <div className="character-image-preview"><img src={imagePreview || toDirectDriveUrl(draft.imageUrl ?? "")} alt="Prévia da personagem" /></div>}
        {imageFile && <div className="character-upload-name"><span>{imageFile.name}</span><button type="button" onClick={() => setImageFile(undefined)}><X size={14} /> Remover</button></div>}
        {error && <p className="sheet-error wide">{error}</p>}
      </div>
      {(Object.keys(categoryLabels) as SheetCategory[]).map((category) => {
        const fields = template.fields.filter((field) => field.category === category);
        if (fields.length === 0) return null;
        return <section className="sheet-section dynamic-category" key={category}><h3>{categoryLabels[category]}</h3><div className="dynamic-fields-grid">{fields.map((field) => <div className={"dynamic-field-wrap type-" + field.type} key={field.id}>{renderField(field)}</div>)}</div></section>;
      })}
      <footer><span>{saved ? "Ficha salva e sincronizada." : "Modelo v" + template.version + " · as mudanças aparecem após salvar."}</span><button className="primary-button" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} {saving ? "Enviando..." : "Salvar ficha"}</button></footer>
    </form>
  </div>;
}

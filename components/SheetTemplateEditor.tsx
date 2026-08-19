"use client";

import { ArrowDown, ArrowUp, Check, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { SheetCategory, SheetFieldDefinition, SheetFieldType, SheetTemplate } from "@/lib/types";

const categoryLabels: Record<SheetCategory, string> = {
  attributes: "Atributos",
  skills: "Perícias",
  abilities: "Habilidades / Magias",
  inventory: "Inventário / Equipamentos",
};

const typeLabels: Record<SheetFieldType, string> = {
  text: "Texto curto",
  number: "Número",
  status: "Barra de status",
  checkbox: "Caixa de seleção",
  counter: "Contador",
  richtext: "Texto rico",
};

type Props = {
  template: SheetTemplate;
  onSave: (template: SheetTemplate) => Promise<void>;
};

export function SheetTemplateEditor({ template, onSave }: Props) {
  const [draft, setDraft] = useState(template);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(template), [template]);

  function updateField(id: string, patch: Partial<SheetFieldDefinition>) {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) => field.id === id ? { ...field, ...patch } : field),
    }));
  }

  function addField(category: SheetCategory) {
    const field: SheetFieldDefinition = {
      id: crypto.randomUUID(),
      category,
      label: "Novo campo",
      type: category === "abilities" ? "richtext" : category === "skills" ? "number" : "text",
      defaultValue: category === "skills" ? 0 : "",
    };
    setDraft((current) => ({ ...current, fields: [...current.fields, field] }));
  }

  function moveField(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.fields.findIndex((field) => field.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.fields.length) return current;
      const fields = [...current.fields];
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...current, fields };
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        ...draft,
        id: "current",
        name: draft.name.trim() || "Ficha da campanha",
        version: Math.max(template.version + 1, draft.version + 1),
        fields: draft.fields
          .filter((field) => field.label.trim())
          .map((field) => ({ ...field, label: field.label.trim() }))
          .slice(0, 120),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sheet-template-editor">
      <label>Nome do modelo<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <p className="field-help">Os jogadores recebem este modelo automaticamente. Campos já preenchidos são preservados quando o modelo muda.</p>

      {(Object.keys(categoryLabels) as SheetCategory[]).map((category) => {
        const fields = draft.fields.filter((field) => field.category === category);
        return (
          <section className="template-category" key={category}>
            <header><div><strong>{categoryLabels[category]}</strong><small>{fields.length} campos</small></div><button type="button" onClick={() => addField(category)}><Plus size={14} /> Campo</button></header>
            {fields.length === 0 && <p className="template-empty">Nenhum campo nesta categoria.</p>}
            {fields.map((field) => (
              <article className="template-field" key={field.id}>
                <div className="template-field-main">
                  <label>Rótulo<input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} /></label>
                  <label>Tipo
                    <select value={field.type} onChange={(event) => {
                      const type = event.target.value as SheetFieldType;
                      updateField(field.id, {
                        type,
                        defaultValue: type === "checkbox" ? false : type === "number" || type === "counter" || type === "status" ? 0 : "",
                        ...(type === "status" ? { defaultMax: 10 } : {}),
                      });
                    }}>
                      {(Object.keys(typeLabels) as SheetFieldType[]).map((type) => <option value={type} key={type}>{typeLabels[type]}</option>)}
                    </select>
                  </label>
                </div>
                <label>Ajuda / placeholder<input value={field.placeholder ?? ""} onChange={(event) => updateField(field.id, { placeholder: event.target.value })} placeholder="Orientação exibida ao jogador" /></label>
                {(field.type === "number" || field.type === "counter" || field.type === "status") && (
                  <div className="template-number-settings">
                    <label>Inicial<input type="number" value={Number(field.defaultValue ?? 0)} onChange={(event) => updateField(field.id, { defaultValue: Number(event.target.value) })} /></label>
                    {field.type === "status" && <label>Máximo inicial<input type="number" value={field.defaultMax ?? 10} onChange={(event) => updateField(field.id, { defaultMax: Number(event.target.value) })} /></label>}
                    <label>Mínimo<input type="number" value={field.min ?? ""} onChange={(event) => updateField(field.id, { min: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
                    <label>Máximo<input type="number" value={field.max ?? ""} onChange={(event) => updateField(field.id, { max: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
                  </div>
                )}
                {field.type === "checkbox" && <label className="toggle-field compact-toggle"><input type="checkbox" checked={Boolean(field.defaultValue)} onChange={(event) => updateField(field.id, { defaultValue: event.target.checked })} /><span><strong>Marcada por padrão</strong></span></label>}
                {category === "skills" && <label>Modificador / fórmula<input value={field.formula ?? ""} onChange={(event) => updateField(field.id, { formula: event.target.value })} placeholder="Ex.: atributo + bônus, 1d20 + modificador" /></label>}
                <footer>
                  <button type="button" onClick={() => moveField(field.id, -1)} aria-label="Mover campo para cima"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => moveField(field.id, 1)} aria-label="Mover campo para baixo"><ArrowDown size={14} /></button>
                  <button className="danger" type="button" onClick={() => setDraft((current) => ({ ...current, fields: current.fields.filter((item) => item.id !== field.id) }))}><Trash2 size={14} /> Remover</button>
                </footer>
              </article>
            ))}
          </section>
        );
      })}

      <button className="primary-button full template-save" type="button" onClick={() => void save()} disabled={saving}>
        {saved ? <Check size={16} /> : <Save size={16} />} {saving ? "Salvando…" : saved ? "Modelo sincronizado" : "Salvar modelo de ficha"}
      </button>
    </div>
  );
}

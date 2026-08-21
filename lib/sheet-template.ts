"use client";

import type { Character, SheetCategory, SheetFieldDefinition, SheetFieldType, SheetFieldValue, SheetStatusValue, SheetTemplate } from "@/lib/types";

export const DEFAULT_SHEET_TEMPLATE: SheetTemplate = {
  id: "current",
  name: "Ficha de aventura",
  version: 1,
  systemId: "rpgcord-universal",
  systemName: "RPGcord Universal",
  fields: [
    { id: "legacy-ancestry", category: "attributes", label: "Ancestralidade / Origem", type: "text", placeholder: "Ex.: Humano" },
    { id: "legacy-class", category: "attributes", label: "Classe / Arquétipo", type: "text", placeholder: "Ex.: Investigador" },
    { id: "legacy-level", category: "attributes", label: "Nível", type: "counter", defaultValue: 1, min: 0, max: 999 },
    { id: "legacy-hp", category: "attributes", label: "Vida", type: "status", defaultValue: 10, defaultMax: 10, min: 0, max: 9999 },
    { id: "legacy-armor", category: "attributes", label: "Defesa", type: "number", defaultValue: 10 },
    { id: "legacy-forca", category: "attributes", label: "Força", type: "number", defaultValue: 10 },
    { id: "legacy-destreza", category: "attributes", label: "Destreza", type: "number", defaultValue: 10 },
    { id: "legacy-constituicao", category: "attributes", label: "Constituição", type: "number", defaultValue: 10 },
    { id: "legacy-inteligencia", category: "attributes", label: "Inteligência", type: "number", defaultValue: 10 },
    { id: "legacy-sabedoria", category: "attributes", label: "Sabedoria", type: "number", defaultValue: 10 },
    { id: "legacy-carisma", category: "attributes", label: "Carisma", type: "number", defaultValue: 10 },
    { id: "legacy-skills", category: "skills", label: "Perícias", type: "richtext", placeholder: "Liste perícias, bônus e fórmulas." },
    { id: "legacy-abilities", category: "abilities", label: "Habilidades e magias", type: "richtext", placeholder: "Descrição, custo, efeito e tags." },
    { id: "legacy-inventory", category: "inventory", label: "Inventário e equipamentos", type: "richtext", placeholder: "Itens, quantidades, peso, valor e propriedades." },
  ],
};

function numeric(value: SheetFieldValue | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function defaultFieldValue(field: SheetFieldDefinition): SheetFieldValue {
  if (field.type === "checkbox") return Boolean(field.defaultValue);
  if (field.type === "number" || field.type === "counter") return Number(field.defaultValue ?? 0);
  if (field.type === "status") return { current: Number(field.defaultValue ?? 0), max: Number(field.defaultMax ?? field.defaultValue ?? 0) };
  return String(field.defaultValue ?? "");
}

export function buildCharacterFields(character: Character, template: SheetTemplate) {
  const values: Record<string, SheetFieldValue> = { ...(character.customFields ?? {}) };
  const legacy: Record<string, SheetFieldValue> = {
    "legacy-ancestry": character.ancestry,
    "legacy-class": character.characterClass,
    "legacy-level": character.level,
    "legacy-hp": { current: character.hp, max: character.maxHp },
    "legacy-armor": character.armorClass,
    "legacy-forca": character.attributes.forca,
    "legacy-destreza": character.attributes.destreza,
    "legacy-constituicao": character.attributes.constituicao,
    "legacy-inteligencia": character.attributes.inteligencia,
    "legacy-sabedoria": character.attributes.sabedoria,
    "legacy-carisma": character.attributes.carisma,
    "legacy-skills": character.skills.join(", "),
    "legacy-inventory": character.inventory,
  };
  for (const field of template.fields) {
    if (values[field.id] === undefined) values[field.id] = legacy[field.id] ?? defaultFieldValue(field);
  }
  return values;
}

export function syncLegacyCharacter(character: Character): Character {
  const values = character.customFields ?? {};
  const hp = values["legacy-hp"] as SheetStatusValue | undefined;
  const skills = typeof values["legacy-skills"] === "string"
    ? values["legacy-skills"].split(/[,\n]/).map((value) => value.trim()).filter(Boolean)
    : character.skills;
  return {
    ...character,
    ancestry: typeof values["legacy-ancestry"] === "string" ? values["legacy-ancestry"] : character.ancestry,
    characterClass: typeof values["legacy-class"] === "string" ? values["legacy-class"] : character.characterClass,
    level: numeric(values["legacy-level"], character.level),
    hp: hp && typeof hp.current === "number" ? hp.current : character.hp,
    maxHp: hp && typeof hp.max === "number" ? hp.max : character.maxHp,
    armorClass: numeric(values["legacy-armor"], character.armorClass),
    attributes: {
      forca: numeric(values["legacy-forca"], character.attributes.forca),
      destreza: numeric(values["legacy-destreza"], character.attributes.destreza),
      constituicao: numeric(values["legacy-constituicao"], character.attributes.constituicao),
      inteligencia: numeric(values["legacy-inteligencia"], character.attributes.inteligencia),
      sabedoria: numeric(values["legacy-sabedoria"], character.attributes.sabedoria),
      carisma: numeric(values["legacy-carisma"], character.attributes.carisma),
    },
    skills,
    inventory: typeof values["legacy-inventory"] === "string" ? values["legacy-inventory"] : character.inventory,
  };
}

export function normalizeSheetTemplate(data?: Partial<SheetTemplate>): SheetTemplate {
  if (!data?.fields || !Array.isArray(data.fields)) return DEFAULT_SHEET_TEMPLATE;
  const categories: SheetCategory[] = ["attributes", "skills", "abilities", "inventory"];
  const types: SheetFieldType[] = ["text", "number", "status", "checkbox", "counter", "richtext"];
  const usedIds = new Set<string>();
  const fields = data.fields.slice(0, 120).flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== "object") return [];
    const category = categories.includes(candidate.category) ? candidate.category : undefined;
    const type = types.includes(candidate.type) ? candidate.type : undefined;
    const label = String(candidate.label || "").trim().slice(0, 100);
    if (!category || !type || !label) return [];
    const requestedId = String(candidate.id || `field-${index + 1}`).trim().slice(0, 100) || `field-${index + 1}`;
    let id = requestedId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${requestedId}-${suffix++}`;
    usedIds.add(id);
    const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
    const field: SheetFieldDefinition = {
      id,
      category,
      label,
      type,
      ...(candidate.placeholder ? { placeholder: String(candidate.placeholder).slice(0, 240) } : {}),
      ...(candidate.formula ? { formula: String(candidate.formula).slice(0, 500) } : {}),
      ...(numeric(candidate.min) !== undefined ? { min: numeric(candidate.min) } : {}),
      ...(numeric(candidate.max) !== undefined ? { max: numeric(candidate.max) } : {}),
    };
    if (type === "checkbox") field.defaultValue = Boolean(candidate.defaultValue);
    else if (type === "number" || type === "counter" || type === "status") field.defaultValue = numeric(candidate.defaultValue) ?? 0;
    else field.defaultValue = String(candidate.defaultValue ?? "").slice(0, 2000);
    if (type === "status") field.defaultMax = numeric(candidate.defaultMax) ?? numeric(candidate.defaultValue) ?? 0;
    return [field];
  });
  return {
    id: "current",
    name: String(data.name || "Ficha da campanha").trim().slice(0, 120) || "Ficha da campanha",
    version: Math.max(1, Math.round(Number(data.version) || 1)),
    systemId: String(data.systemId || "custom").trim().slice(0, 100) || "custom",
    systemName: String(data.systemName || (data.systemId === "rpgcord-universal" ? "RPGcord Universal" : "Modelo personalizado")).trim().slice(0, 120),
    ...(data.sourcePdfUrl ? { sourcePdfUrl: String(data.sourcePdfUrl).trim().slice(0, 2000) } : {}),
    fields,
    ...(typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt) ? { updatedAt: data.updatedAt } : {}),
  };
}

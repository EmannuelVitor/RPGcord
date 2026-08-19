"use client";

import type { Character, SheetFieldDefinition, SheetFieldValue, SheetStatusValue, SheetTemplate } from "@/lib/types";

export const DEFAULT_SHEET_TEMPLATE: SheetTemplate = {
  id: "current",
  name: "Ficha de aventura",
  version: 1,
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
  return {
    id: "current",
    name: String(data.name || "Ficha da campanha"),
    version: Number(data.version || 1),
    fields: data.fields.slice(0, 120),
    updatedAt: data.updatedAt,
  };
}

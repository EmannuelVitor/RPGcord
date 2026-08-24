import { DEFAULT_MONSTER_SHEET, normalizeMonsterSheet } from "@/lib/monster-sheet";
import type { CreatureRecord, MapToken } from "@/lib/types";

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CR";
}

export function blankCreature(): CreatureRecord {
  return {
    id: crypto.randomUUID(),
    name: "",
    initials: "CR",
    color: "#b75252",
    sheet: { ...DEFAULT_MONSTER_SHEET, attributes: [], weaknesses: [], abilities: [], revealedFields: [] },
  };
}

export function normalizeCreature(value: CreatureRecord): CreatureRecord {
  const name = value.name.trim().slice(0, 100) || "Criatura sem nome";
  const imageUrl = value.imageUrl?.trim();
  return {
    ...value,
    id: value.id.trim().slice(0, 100),
    name,
    initials: initials(name),
    color: /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : "#b75252",
    ...(imageUrl ? { imageUrl } : {}),
    sheet: { ...normalizeMonsterSheet(value.sheet), revealedFields: [] },
  };
}

export function tokenFromCreature(creature: CreatureRecord, ownerId: string): MapToken {
  const saved = normalizeCreature(creature);
  return {
    id: crypto.randomUUID(),
    ownerId,
    name: saved.name,
    initials: saved.initials,
    x: 50,
    y: 40,
    color: saved.color,
    ...(saved.imageUrl ? { imageUrl: saved.imageUrl } : {}),
    kind: "monster",
    hidden: false,
    monsterSheet: {
      ...saved.sheet,
      attributes: saved.sheet.attributes.map((item) => ({ ...item })),
      weaknesses: saved.sheet.weaknesses.map((item) => ({ ...item })),
      abilities: saved.sheet.abilities.map((item) => ({ ...item })),
      revealedFields: [],
    },
  };
}

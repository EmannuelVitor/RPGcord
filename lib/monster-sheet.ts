import type { MonsterDetail, MonsterDetailKind, MonsterSheet } from "@/lib/types";

export const DEFAULT_MONSTER_SHEET: MonsterSheet = {
  level: 1,
  hp: 10,
  maxHp: 10,
  attributes: [],
  weaknesses: [],
  abilities: [],
  revealedFields: [],
};

export function monsterFieldKey(kind: MonsterDetailKind, id: string) {
  return `${kind}:${id}`;
}

function normalizeDetails(value: unknown): MonsterDetail[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<MonsterDetail> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      label: String(item.label || "Informação").trim().slice(0, 80),
      value: String(item.value || "").trim().slice(0, 2000),
    }))
    .slice(0, 40);
}

export function normalizeMonsterSheet(value?: Partial<MonsterSheet>): MonsterSheet {
  const hp = Math.max(0, Math.round(Number(value?.hp ?? DEFAULT_MONSTER_SHEET.hp)));
  const maxHp = Math.max(1, Math.round(Number(value?.maxHp ?? Math.max(hp, DEFAULT_MONSTER_SHEET.maxHp))));
  return {
    level: Math.max(0, Math.min(999, Math.round(Number(value?.level ?? DEFAULT_MONSTER_SHEET.level)))),
    hp: Math.min(hp, maxHp),
    maxHp,
    attributes: normalizeDetails(value?.attributes),
    weaknesses: normalizeDetails(value?.weaknesses),
    abilities: normalizeDetails(value?.abilities),
    revealedFields: Array.from(new Set(Array.isArray(value?.revealedFields) ? value.revealedFields.map(String) : [])).slice(0, 160),
  };
}

export function toggleMonsterField(sheet: MonsterSheet, field: string): MonsterSheet {
  const revealed = sheet.revealedFields.includes(field);
  return {
    ...sheet,
    revealedFields: revealed
      ? sheet.revealedFields.filter((item) => item !== field)
      : [...sheet.revealedFields, field],
  };
}

export function isMonsterFieldRevealed(sheet: MonsterSheet, field: string) {
  return sheet.revealedFields.includes(field);
}

/**
 * Projeção segura enviada aos jogadores. Valores ainda ocultos não ficam no
 * documento público do pino, portanto não podem ser descobertos pelo cliente.
 */
export function publicMonsterSheet(value?: Partial<MonsterSheet>): MonsterSheet {
  const sheet = normalizeMonsterSheet(value);
  const revealed = new Set(sheet.revealedFields);
  const publicDetails = (kind: MonsterDetailKind, details: MonsterDetail[]) => details.filter((detail) => revealed.has(monsterFieldKey(kind, detail.id)));
  return {
    level: revealed.has("level") ? sheet.level : 0,
    hp: revealed.has("health") ? sheet.hp : 0,
    maxHp: revealed.has("health") ? sheet.maxHp : 1,
    attributes: publicDetails("attribute", sheet.attributes),
    weaknesses: publicDetails("weakness", sheet.weaknesses),
    abilities: publicDetails("ability", sheet.abilities),
    revealedFields: sheet.revealedFields,
  };
}

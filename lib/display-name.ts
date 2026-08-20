import type { MapToken } from "@/lib/types";

/** Como os nomes dos pinos aparecem no mapa. Preferencia local de cada usuario. */
export type NameDisplayMode = "character" | "player" | "both" | "none";

export const NAME_DISPLAY_MODES: { value: NameDisplayMode; label: string }[] = [
  { value: "character", label: "Apenas personagem" },
  { value: "player", label: "Apenas jogador" },
  { value: "both", label: "Personagem e jogador" },
  { value: "none", label: "Nenhum" },
];

export const NAME_DISPLAY_STORAGE_KEY = "rpgcord.map.nameDisplay";

export function isNameDisplayMode(value: unknown): value is NameDisplayMode {
  return value === "character" || value === "player" || value === "both" || value === "none";
}

/**
 * Nome da personagem de um usuario. O pino do heroi ja carrega o nome salvo na
 * ficha e e sincronizado para todo mundo, entao serve de fonte sem exigir
 * leitura das fichas alheias — e continua valendo para mensagens antigas.
 */
export function characterNameOf(userId: string | undefined, tokens: MapToken[]) {
  if (!userId) return undefined;
  const token = tokens.find((item) => item.kind === "hero" && item.ownerId === userId);
  return token?.name.trim() || undefined;
}

/** Monta "Personagem (Jogador)" respeitando o modo e a ausencia de cada parte. */
export function composeName(characterName?: string, playerName?: string, mode: NameDisplayMode = "both") {
  const character = characterName?.trim();
  const player = playerName?.trim();
  if (mode === "none") return "";
  if (mode === "character") return character || player || "";
  if (mode === "player") return player || character || "";
  if (character && player && character.toLowerCase() !== player.toLowerCase()) return `${character} (${player})`;
  return character || player || "";
}

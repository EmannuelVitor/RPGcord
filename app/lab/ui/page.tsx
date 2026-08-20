"use client";

import { CharacterSheet } from "@/components/CharacterSheet";
import { DiceRoller } from "@/components/DiceRoller";
import { MusicPanel } from "@/components/MusicPanel";
import { DEFAULT_SHEET_TEMPLATE } from "@/lib/sheet-template";
import type { Character, DiceRoll, MapToken, SheetTemplate } from "@/lib/types";

const template: SheetTemplate = {
  ...DEFAULT_SHEET_TEMPLATE,
  fields: [
    ...DEFAULT_SHEET_TEMPLATE.fields,
    { id: "sanidade", category: "attributes", label: "Sanidade", type: "status", defaultValue: 6, defaultMax: 10 },
    { id: "mana", category: "attributes", label: "Pontos de magia", type: "status", defaultValue: 12, defaultMax: 20 },
  ],
};
const character: Character = {
  id: "u1", ownerId: "u1", name: "Lyra Ventoescuro", ancestry: "Meio-elfa", characterClass: "Arcanista",
  level: 4, hp: 17, maxHp: 28, armorClass: 14,
  attributes: { forca: 9, destreza: 14, constituicao: 12, inteligencia: 17, sabedoria: 13, carisma: 15 },
  skills: ["Arcanismo", "Furtividade"], inventory: "Grimório, adaga",
  customFields: { sanidade: { current: 6, max: 10 }, mana: { current: 12, max: 20 } },
};
const tokens: MapToken[] = [{ id: "u1", ownerId: "u1", name: "Lyra Ventoescuro", initials: "LV", x: 35, y: 50, color: "#8b73d8", kind: "hero" }];
const rolls: DiceRoll[] = [
  { id: "r1", userId: "u1", userName: "Erick", sides: 20, value: 17, modifier: 3, total: 20, quantity: 1, results: [17], validationMode: "sum", createdAt: Date.now() },
];

export default function UiLab() {
  return <main style={{ padding: 14, background: "#f8f6fc", minHeight: "100vh", display: "grid", gap: 14, gridTemplateColumns: "330px 1fr 1fr" }}>
    <div><p style={{ font: "11px system-ui" }}>Oráculo com resumo do personagem</p><DiceRoller rolls={rolls} tokens={tokens} character={character} template={template} hasCharacter playerName="Erick" onOpenSheet={() => undefined} onRoll={async () => rolls[0]} /></div>
    <div><p style={{ font: "11px system-ui" }}>Ficha (rodapé deve colar embaixo)</p><div className="workspace-tab-content" style={{ height: "78vh", border: "1px solid #ddd" }}><CharacterSheet embedded campaignId="c1" character={character} template={template} onSave={async () => undefined} onClose={() => undefined} /></div></div>
    <div><p style={{ font: "11px system-ui" }}>Música como guia</p><div className="workspace-tab-content" style={{ height: "78vh", border: "1px solid #ddd" }}><MusicPanel embedded music={{ youtubeUrl: "", title: "", loop: false, playing: false, position: 0 }} isGM onSave={async () => undefined} onClose={() => undefined} /></div></div>
  </main>;
}

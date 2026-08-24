import { DEFAULT_SHEET_TEMPLATE } from "@/lib/sheet-template";
import type { SheetFieldDefinition, SheetTemplate } from "@/lib/types";

export type SheetSystemPreset = {
  id: string;
  name: string;
  description: string;
  template: SheetTemplate;
  sourcePdfUrl?: string;
};

type Field = SheetFieldDefinition;

function template(systemId: string, systemName: string, name: string, fields: Field[]): SheetTemplate {
  return { id: "current", name, version: 1, systemId, systemName, fields };
}

const DND_5E_TEMPLATE = template("dnd-5e", "D&D (5ª edição)", "Ficha de personagem — D&D 5e", [
  { id: "dnd-species", category: "attributes", label: "Espécie / Raça", type: "text" },
  { id: "dnd-class", category: "attributes", label: "Classe e subclasse", type: "text", placeholder: "Ex.: Guerreiro 3 / Mago 2" },
  { id: "dnd-level", category: "attributes", label: "Nível", type: "counter", defaultValue: 1, min: 1, max: 20 },
  { id: "dnd-background", category: "attributes", label: "Antecedente", type: "text" },
  { id: "dnd-alignment", category: "attributes", label: "Tendência", type: "text" },
  { id: "dnd-xp", category: "attributes", label: "Pontos de experiência", type: "number", defaultValue: 0, min: 0 },
  { id: "dnd-strength", category: "attributes", label: "Força", type: "number", defaultValue: 10, min: 1, max: 30 },
  { id: "dnd-dexterity", category: "attributes", label: "Destreza", type: "number", defaultValue: 10, min: 1, max: 30 },
  { id: "dnd-constitution", category: "attributes", label: "Constituição", type: "number", defaultValue: 10, min: 1, max: 30 },
  { id: "dnd-intelligence", category: "attributes", label: "Inteligência", type: "number", defaultValue: 10, min: 1, max: 30 },
  { id: "dnd-wisdom", category: "attributes", label: "Sabedoria", type: "number", defaultValue: 10, min: 1, max: 30 },
  { id: "dnd-charisma", category: "attributes", label: "Carisma", type: "number", defaultValue: 10, min: 1, max: 30 },
  { id: "dnd-hp", category: "attributes", label: "Pontos de vida", type: "status", defaultValue: 1, defaultMax: 1, min: 0, max: 999 },
  { id: "dnd-temporary-hp", category: "attributes", label: "Pontos de vida temporários", type: "number", defaultValue: 0, min: 0, max: 999 },
  { id: "dnd-armor-class", category: "attributes", label: "Classe de armadura", type: "number", defaultValue: 10, min: 0, max: 99 },
  { id: "dnd-initiative", category: "attributes", label: "Iniciativa", type: "number", defaultValue: 0 },
  { id: "dnd-speed", category: "attributes", label: "Deslocamento", type: "text", placeholder: "Ex.: 9 m" },
  { id: "dnd-proficiency", category: "attributes", label: "Bônus de proficiência", type: "number", defaultValue: 2 },
  { id: "dnd-inspiration", category: "attributes", label: "Inspiração", type: "checkbox", defaultValue: false },
  { id: "dnd-hit-dice", category: "attributes", label: "Dados de vida", type: "text", placeholder: "Ex.: 3d10" },
  { id: "dnd-death-saves", category: "attributes", label: "Testes contra a morte", type: "text", placeholder: "Sucessos e fracassos" },
  { id: "dnd-saving-throws", category: "skills", label: "Testes de resistência", type: "richtext", placeholder: "Atributo, bônus total e proficiência" },
  { id: "dnd-skills", category: "skills", label: "Perícias", type: "richtext", placeholder: "Perícia, bônus total, proficiência e especialização", formula: "1d20 + modificador do atributo + proficiência aplicável" },
  { id: "dnd-passive-perception", category: "skills", label: "Percepção passiva", type: "number", defaultValue: 10 },
  { id: "dnd-attacks", category: "abilities", label: "Ataques e conjurações", type: "richtext", placeholder: "Nome, bônus de ataque, dano, tipo e alcance" },
  { id: "dnd-features", category: "abilities", label: "Características e talentos", type: "richtext" },
  { id: "dnd-spellcasting", category: "abilities", label: "Conjuração", type: "richtext", placeholder: "Atributo, CD, bônus de ataque e magias" },
  { id: "dnd-spell-slots", category: "abilities", label: "Espaços de magia", type: "richtext", placeholder: "Espaços totais e usados por círculo" },
  { id: "dnd-equipment", category: "inventory", label: "Equipamentos e tesouros", type: "richtext" },
  { id: "dnd-currency", category: "inventory", label: "Moedas", type: "text", placeholder: "PC, PP, PE, PO e PL" },
]);

const TRESDET_TEMPLATE = template("3det", "3D&T", "Ficha de personagem — 3D&T", [
  { id: "3det-concept", category: "attributes", label: "Conceito / Arquétipo", type: "text" },
  { id: "3det-kit", category: "attributes", label: "Kit / Papel", type: "text" },
  { id: "3det-scale", category: "attributes", label: "Escala", type: "text" },
  { id: "3det-points", category: "attributes", label: "Pontos de personagem", type: "number", defaultValue: 0, min: 0 },
  { id: "3det-experience", category: "attributes", label: "Pontos de experiência", type: "number", defaultValue: 0, min: 0 },
  { id: "3det-forca", category: "attributes", label: "Força (F)", type: "number", defaultValue: 0, min: 0 },
  { id: "3det-habilidade", category: "attributes", label: "Habilidade (H)", type: "number", defaultValue: 0, min: 0 },
  { id: "3det-resistencia", category: "attributes", label: "Resistência (R)", type: "number", defaultValue: 0, min: 0 },
  { id: "3det-armadura", category: "attributes", label: "Armadura (A)", type: "number", defaultValue: 0, min: 0 },
  { id: "3det-poder-de-fogo", category: "attributes", label: "Poder de Fogo (PdF)", type: "number", defaultValue: 0, min: 0 },
  { id: "3det-pv", category: "attributes", label: "Pontos de Vida (PV)", type: "status", defaultValue: 5, defaultMax: 5, min: 0, max: 999 },
  { id: "3det-pm", category: "attributes", label: "Pontos de Magia (PM)", type: "status", defaultValue: 5, defaultMax: 5, min: 0, max: 999 },
  { id: "3det-pe", category: "attributes", label: "Pontos de Experiência em cena", type: "status", defaultValue: 0, defaultMax: 0, min: 0, max: 999 },
  { id: "3det-skills", category: "skills", label: "Perícias e especializações", type: "richtext", placeholder: "Nome, especializações e observações", formula: "Aplique o teste definido pela edição usada na campanha" },
  { id: "3det-advantages", category: "abilities", label: "Vantagens", type: "richtext", placeholder: "Nome, custo e efeito" },
  { id: "3det-disadvantages", category: "abilities", label: "Desvantagens", type: "richtext", placeholder: "Nome, valor e efeito" },
  { id: "3det-techniques", category: "abilities", label: "Técnicas, manobras e magias", type: "richtext", placeholder: "Custo, alcance, duração e efeito" },
  { id: "3det-attacks", category: "abilities", label: "Ataques", type: "richtext", placeholder: "Nome, atributo usado, tipo de dano e observações" },
  { id: "3det-equipment", category: "inventory", label: "Equipamento", type: "richtext" },
  { id: "3det-notes", category: "inventory", label: "Aliados, recursos e anotações", type: "richtext" },
]);

const ORDEM_TEMPLATE = template("ordem-paranormal", "Ordem Paranormal", "Ficha de agente — Ordem Paranormal", [
  { id: "ordem-origin", category: "attributes", label: "Origem", type: "text" },
  { id: "ordem-class", category: "attributes", label: "Classe", type: "text" },
  { id: "ordem-path", category: "attributes", label: "Trilha", type: "text" },
  { id: "ordem-nex", category: "attributes", label: "NEX (%)", type: "number", defaultValue: 5, min: 0, max: 100 },
  { id: "ordem-rank", category: "attributes", label: "Patente", type: "text" },
  { id: "ordem-prestige", category: "attributes", label: "Prestígio", type: "number", defaultValue: 0, min: 0 },
  { id: "ordem-agility", category: "attributes", label: "Agilidade", type: "number", defaultValue: 1, min: 0, max: 9 },
  { id: "ordem-strength", category: "attributes", label: "Força", type: "number", defaultValue: 1, min: 0, max: 9 },
  { id: "ordem-intellect", category: "attributes", label: "Intelecto", type: "number", defaultValue: 1, min: 0, max: 9 },
  { id: "ordem-presence", category: "attributes", label: "Presença", type: "number", defaultValue: 1, min: 0, max: 9 },
  { id: "ordem-vigor", category: "attributes", label: "Vigor", type: "number", defaultValue: 1, min: 0, max: 9 },
  { id: "ordem-pv", category: "attributes", label: "Pontos de Vida (PV)", type: "status", defaultValue: 1, defaultMax: 1, min: 0, max: 999 },
  { id: "ordem-pe", category: "attributes", label: "Pontos de Esforço (PE)", type: "status", defaultValue: 1, defaultMax: 1, min: 0, max: 999 },
  { id: "ordem-san", category: "attributes", label: "Sanidade (SAN)", type: "status", defaultValue: 1, defaultMax: 1, min: 0, max: 999 },
  { id: "ordem-defense", category: "attributes", label: "Defesa", type: "number", defaultValue: 10, min: 0 },
  { id: "ordem-protection", category: "attributes", label: "Proteção e resistências", type: "text" },
  { id: "ordem-speed", category: "attributes", label: "Deslocamento", type: "text", placeholder: "Ex.: 9 m" },
  { id: "ordem-skills", category: "skills", label: "Perícias", type: "richtext", placeholder: "Grau de treinamento, bônus e observações", formula: "Dados do atributo + bônus da perícia" },
  { id: "ordem-attacks", category: "abilities", label: "Ataques", type: "richtext", placeholder: "Arma, teste, dano, crítico, alcance e tipo" },
  { id: "ordem-abilities", category: "abilities", label: "Habilidades e poderes paranormais", type: "richtext", placeholder: "Custo em PE, ação, alcance e efeito" },
  { id: "ordem-rituals", category: "abilities", label: "Rituais", type: "richtext", placeholder: "Círculo, elemento, execução, alcance, duração e resistência" },
  { id: "ordem-ritual-dt", category: "abilities", label: "DT de rituais", type: "number", defaultValue: 10, min: 0 },
  { id: "ordem-inventory", category: "inventory", label: "Inventário", type: "richtext", placeholder: "Item, categoria, espaços e descrição" },
  { id: "ordem-carry", category: "inventory", label: "Espaços de inventário", type: "status", defaultValue: 0, defaultMax: 0, min: 0, max: 999 },
]);

const TORMENTA20_TEMPLATE = template("tormenta-20", "Tormenta 20", "Ficha de personagem — Tormenta 20", [
  { id: "t20-race", category: "attributes", label: "Raça", type: "text" },
  { id: "t20-origin", category: "attributes", label: "Origem", type: "text" },
  { id: "t20-class", category: "attributes", label: "Classe(s)", type: "text" },
  { id: "t20-level", category: "attributes", label: "Nível", type: "counter", defaultValue: 1, min: 1, max: 20 },
  { id: "t20-deity", category: "attributes", label: "Divindade", type: "text" },
  { id: "t20-forca", category: "attributes", label: "Força", type: "number", defaultValue: 0 },
  { id: "t20-destreza", category: "attributes", label: "Destreza", type: "number", defaultValue: 0 },
  { id: "t20-constituicao", category: "attributes", label: "Constituição", type: "number", defaultValue: 0 },
  { id: "t20-inteligencia", category: "attributes", label: "Inteligência", type: "number", defaultValue: 0 },
  { id: "t20-sabedoria", category: "attributes", label: "Sabedoria", type: "number", defaultValue: 0 },
  { id: "t20-carisma", category: "attributes", label: "Carisma", type: "number", defaultValue: 0 },
  { id: "t20-pv", category: "attributes", label: "Pontos de Vida (PV)", type: "status", defaultValue: 1, defaultMax: 1, min: 0, max: 9999 },
  { id: "t20-pm", category: "attributes", label: "Pontos de Mana (PM)", type: "status", defaultValue: 1, defaultMax: 1, min: 0, max: 9999 },
  { id: "t20-defense", category: "attributes", label: "Defesa", type: "number", defaultValue: 10, min: 0 },
  { id: "t20-speed", category: "attributes", label: "Deslocamento", type: "text", placeholder: "Ex.: 9 m" },
  { id: "t20-size", category: "attributes", label: "Tamanho", type: "text" },
  { id: "t20-skills", category: "skills", label: "Perícias", type: "richtext", placeholder: "Total, atributo-chave, treinamento e outros bônus", formula: "1d20 + bônus da perícia" },
  { id: "t20-attacks", category: "abilities", label: "Ataques", type: "richtext", placeholder: "Arma, bônus, dano, crítico, tipo e alcance" },
  { id: "t20-powers", category: "abilities", label: "Habilidades e poderes", type: "richtext", placeholder: "Origem, custo, ação e efeito" },
  { id: "t20-spells", category: "abilities", label: "Magias", type: "richtext", placeholder: "Círculo, escola, execução, alcance, duração, resistência e custo" },
  { id: "t20-spell-dt", category: "abilities", label: "CD de magias", type: "number", defaultValue: 10, min: 0 },
  { id: "t20-equipment", category: "inventory", label: "Equipamentos", type: "richtext", placeholder: "Item, quantidade, espaços e propriedades" },
  { id: "t20-carry", category: "inventory", label: "Carga / Espaços", type: "status", defaultValue: 0, defaultMax: 0, min: 0, max: 999 },
  { id: "t20-money", category: "inventory", label: "Dinheiro", type: "text", placeholder: "TC, T$ e TO" },
]);

const KULT_TEMPLATE = template("kult-divinity-lost", "KULT: Divindade Perdida", "Ficha de personagem — KULT", [
  { id: "kult-archetype", category: "attributes", label: "Arquétipo", type: "text" },
  { id: "kult-occupation", category: "attributes", label: "Ocupação", type: "text" },
  { id: "kult-dark-secret", category: "attributes", label: "Segredo Sombrio", type: "richtext" },
  { id: "kult-appearance", category: "attributes", label: "Aparência", type: "richtext" },
  { id: "kult-fortitude", category: "attributes", label: "Fortitude", type: "number", defaultValue: 0 },
  { id: "kult-reflexes", category: "attributes", label: "Reflexos", type: "number", defaultValue: 0 },
  { id: "kult-willpower", category: "attributes", label: "Força de Vontade", type: "number", defaultValue: 0 },
  { id: "kult-reason", category: "attributes", label: "Razão", type: "number", defaultValue: 0 },
  { id: "kult-intuition", category: "attributes", label: "Intuição", type: "number", defaultValue: 0 },
  { id: "kult-perception", category: "attributes", label: "Percepção", type: "number", defaultValue: 0 },
  { id: "kult-coolness", category: "attributes", label: "Frieza", type: "number", defaultValue: 0 },
  { id: "kult-violence", category: "attributes", label: "Violência", type: "number", defaultValue: 0 },
  { id: "kult-charisma", category: "attributes", label: "Carisma", type: "number", defaultValue: 0 },
  { id: "kult-soul", category: "attributes", label: "Alma", type: "number", defaultValue: 0 },
  { id: "kult-stability", category: "attributes", label: "Estabilidade", type: "number", defaultValue: 10, min: 0, max: 10 },
  { id: "kult-stability-effects", category: "attributes", label: "Efeitos de Estabilidade", type: "richtext", placeholder: "Condições e consequências atuais" },
  { id: "kult-harm", category: "attributes", label: "Ferimentos", type: "richtext", placeholder: "Ferimentos sérios, críticos e estabilizados" },
  { id: "kult-skills", category: "skills", label: "Movimentos e modificadores", type: "richtext", placeholder: "Movimento, atributo e modificadores situacionais", formula: "2d10 + atributo" },
  { id: "kult-advantages", category: "abilities", label: "Vantagens", type: "richtext", placeholder: "Gatilho, opções e efeitos" },
  { id: "kult-disadvantages", category: "abilities", label: "Desvantagens", type: "richtext", placeholder: "Gatilho, opções e efeitos" },
  { id: "kult-relations", category: "abilities", label: "Relações", type: "richtext", placeholder: "Pessoa, intensidade e natureza do vínculo" },
  { id: "kult-weapons", category: "inventory", label: "Armas", type: "richtext", placeholder: "Nome, dano, alcance e propriedades" },
  { id: "kult-gear", category: "inventory", label: "Equipamento e recursos", type: "richtext" },
  { id: "kult-notes", category: "inventory", label: "Anotações", type: "richtext" },
]);

/** Registro central de modelos de ficha disponíveis para todas as campanhas. */
export const SHEET_SYSTEM_PRESETS: SheetSystemPreset[] = [
  { id: "rpgcord-universal", name: "RPGcord Universal", description: "Modelo flexível, indicado para campanhas autorais e adaptações.", template: DEFAULT_SHEET_TEMPLATE },
  { id: "dnd-5e", name: "D&D (5ª edição)", description: "Atributos, recursos, perícias, ataques, magias e equipamentos para D&D 5e.", template: DND_5E_TEMPLATE },
  { id: "3det", name: "3D&T", description: "Características, recursos, vantagens, desvantagens, técnicas e equipamento para mesas de 3D&T.", template: TRESDET_TEMPLATE },
  { id: "ordem-paranormal", name: "Ordem Paranormal", description: "Ficha de agente com NEX, PV, PE, SAN, perícias, poderes, rituais e inventário.", template: ORDEM_TEMPLATE },
  { id: "tormenta-20", name: "Tormenta 20", description: "Atributos, PV, PM, perícias, poderes, magias e equipamentos para Tormenta 20.", template: TORMENTA20_TEMPLATE },
  { id: "kult-divinity-lost", name: "KULT: Divindade Perdida", description: "Atributos, Estabilidade, ferimentos, Vantagens, Desvantagens e Relações para KULT.", template: KULT_TEMPLATE },
];

export function sheetSystemPreset(id?: string) {
  return SHEET_SYSTEM_PRESETS.find((preset) => preset.id === id);
}

export function templateFromPreset(preset: SheetSystemPreset, nextVersion: number): SheetTemplate {
  return {
    ...preset.template,
    id: "current",
    version: nextVersion,
    systemId: preset.id,
    systemName: preset.name,
    ...(preset.sourcePdfUrl ? { sourcePdfUrl: preset.sourcePdfUrl } : {}),
    fields: preset.template.fields.map((field) => ({ ...field })),
  };
}

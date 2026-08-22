import { DEFAULT_SHEET_TEMPLATE } from "@/lib/sheet-template";
import type { SheetTemplate } from "@/lib/types";

export type SheetSystemPreset = {
  id: string;
  name: string;
  description: string;
  template: SheetTemplate;
  sourcePdfUrl?: string;
};

/**
 * Registro central para modelos oficiais. Novos sistemas entram aqui quando
 * seus PDFs e modelos estruturados forem fornecidos, sem alterar a ficha em si.
 */
export const SHEET_SYSTEM_PRESETS: SheetSystemPreset[] = [
  {
    id: "rpgcord-universal",
    name: "RPGcord Universal",
    description: "Modelo flexível atual, indicado para campanhas autorais e adaptações.",
    template: DEFAULT_SHEET_TEMPLATE,
  },
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

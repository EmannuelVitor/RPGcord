"use client";

import { Library, ScrollText, ShieldAlert, X } from "lucide-react";
import { CreatureLibrary } from "@/components/CreatureLibrary";
import { SheetTemplateEditor } from "@/components/SheetTemplateEditor";
import type { CreatureRecord, SheetTemplate } from "@/lib/types";

export function TablePreparationPanel({ campaignId, creatures, sheetTemplate, embedded = false, onSaveCreature, onDeleteCreature, onSaveSheetTemplate, onClose }: {
  campaignId: string;
  creatures: CreatureRecord[];
  sheetTemplate: SheetTemplate;
  embedded?: boolean;
  onSaveCreature: (creature: CreatureRecord) => Promise<void>;
  onDeleteCreature: (creatureId: string) => Promise<void>;
  onSaveSheetTemplate: (template: SheetTemplate) => Promise<void>;
  onClose: () => void;
}) {
  return <div className={"drawer-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="drawer table-preparation-drawer">
      <header><div><p className="eyebrow">Configuração da campanha</p><h2><Library size={20} /> Preparar mesa</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
      <section className="gm-section sheet-model-section"><h3><ScrollText size={17} /> Modelo de ficha da campanha</h3><SheetTemplateEditor template={sheetTemplate} onSave={onSaveSheetTemplate} /></section>
      <section className="gm-section creature-library-section"><h3><ShieldAlert size={17} /> Bestiário da campanha</h3><p className="field-help">Crie a criatura uma vez e reutilize sua ficha ao preparar qualquer cena.</p><CreatureLibrary campaignId={campaignId} creatures={creatures} onSave={onSaveCreature} onDelete={onDeleteCreature} /></section>
    </aside>
  </div>;
}

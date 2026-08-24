import { describe, expect, it } from "vitest";
import { normalizeSheetTemplate } from "@/lib/sheet-template";
import { SHEET_SYSTEM_PRESETS, templateFromPreset } from "@/lib/sheet-systems";

describe("sheet system registry", () => {
  it("offers the universal model and the five standard systems", () => {
    expect(SHEET_SYSTEM_PRESETS.map((preset) => preset.id)).toEqual([
      "rpgcord-universal",
      "dnd-5e",
      "3det",
      "ordem-paranormal",
      "tormenta-20",
      "kult-divinity-lost",
    ]);
  });

  it.each(SHEET_SYSTEM_PRESETS)("keeps unique, valid fields in $name", (preset) => {
    const normalized = normalizeSheetTemplate(preset.template);
    expect(preset.template.fields.length).toBeGreaterThan(0);
    expect(normalized.fields).toHaveLength(preset.template.fields.length);
    expect(new Set(preset.template.fields.map((field) => field.id)).size).toBe(preset.template.fields.length);
    expect(preset.template.systemId).toBe(preset.id);
    expect(preset.template.systemName).toBe(preset.name);
  });

  it("creates an independent campaign template from a registered preset", () => {
    const preset = SHEET_SYSTEM_PRESETS[0];
    const first = templateFromPreset(preset, 4);
    const second = templateFromPreset(preset, 4);
    expect(first).toMatchObject({ id: "current", version: 4, systemId: preset.id, systemName: preset.name });
    expect(first.fields).not.toBe(preset.template.fields);
    expect(first.fields[0]).not.toBe(second.fields[0]);
  });

  it("sanitizes imported fields and gives duplicate identifiers unique names", () => {
    const normalized = normalizeSheetTemplate({
      id: "external",
      name: "  Modelo importado  ",
      version: -2,
      fields: [
        { id: "power", category: "attributes", label: "Poder", type: "number", defaultValue: 3 },
        { id: "power", category: "skills", label: "Poder treinado", type: "checkbox" },
        { id: "ignored", category: "attributes", label: "", type: "text" },
      ],
    });
    expect(normalized.name).toBe("Modelo importado");
    expect(normalized.version).toBe(1);
    expect(normalized.fields.map((field) => field.id)).toEqual(["power", "power-2"]);
  });
});

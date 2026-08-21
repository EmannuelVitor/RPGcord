import { describe, expect, it } from "vitest";
import { normalizeSheetTemplate } from "@/lib/sheet-template";
import { SHEET_SYSTEM_PRESETS, templateFromPreset } from "@/lib/sheet-systems";

describe("sheet system registry", () => {
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

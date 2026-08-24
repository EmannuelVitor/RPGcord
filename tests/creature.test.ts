import { describe, expect, it, vi } from "vitest";
import { normalizeCreature, tokenFromCreature } from "@/lib/creature";
import type { CreatureRecord } from "@/lib/types";

vi.stubGlobal("crypto", { randomUUID: () => "new-token" });

const creature: CreatureRecord = {
  id: "wolf",
  name: " Lobo espectral ",
  initials: "XX",
  color: "#663399",
  sheet: {
    level: 4,
    hp: 12,
    maxHp: 18,
    attributes: [{ id: "def", label: "Defesa", value: "15" }],
    weaknesses: [],
    abilities: [],
    revealedFields: ["level", "attribute:def"],
  },
};

describe("reusable creatures", () => {
  it("normalizes identity and keeps library sheets unrevealed", () => {
    expect(normalizeCreature(creature)).toMatchObject({ name: "Lobo espectral", initials: "LE", sheet: { revealedFields: [] } });
  });

  it("creates an independent scene token with a new identifier", () => {
    const token = tokenFromCreature(creature, "gm");
    expect(token).toMatchObject({ id: "new-token", ownerId: "gm", name: "Lobo espectral", kind: "monster", x: 50, y: 40 });
    expect(token.monsterSheet?.revealedFields).toEqual([]);
    expect(token.monsterSheet?.attributes).not.toBe(creature.sheet.attributes);
  });
});

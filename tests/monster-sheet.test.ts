import { describe, expect, it } from "vitest";
import { normalizeMonsterSheet, publicMonsterSheet, toggleMonsterField } from "@/lib/monster-sheet";

const privateSheet = normalizeMonsterSheet({
  level: 7,
  hp: 18,
  maxHp: 30,
  attributes: [{ id: "armor", label: "Armadura", value: "16" }],
  weaknesses: [{ id: "sun", label: "Luz solar", value: "Dano dobrado" }],
  abilities: [{ id: "bite", label: "Mordida", value: "2d8" }],
  revealedFields: ["level", "attribute:armor"],
});

describe("monster sheets", () => {
  it("keeps unrevealed values out of the public projection", () => {
    const published = publicMonsterSheet(privateSheet);
    expect(published.level).toBe(7);
    expect(published.hp).toBe(0);
    expect(published.maxHp).toBe(1);
    expect(published.attributes).toEqual(privateSheet.attributes);
    expect(published.weaknesses).toEqual([]);
    expect(published.abilities).toEqual([]);
    expect(JSON.stringify(published)).not.toContain("Dano dobrado");
    expect(JSON.stringify(published)).not.toContain("2d8");
  });

  it("reveals and hides one field without changing the others", () => {
    const revealed = toggleMonsterField(privateSheet, "health");
    expect(revealed.revealedFields).toContain("health");
    expect(toggleMonsterField(revealed, "health").revealedFields).not.toContain("health");
    expect(revealed.revealedFields).toContain("level");
  });

  it("clamps invalid health and level values", () => {
    expect(normalizeMonsterSheet({ level: 1200, hp: 80, maxHp: 20 })).toMatchObject({ level: 999, hp: 20, maxHp: 20 });
  });
});

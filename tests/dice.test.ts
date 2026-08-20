import { describe, expect, it } from "vitest";
import { resolveRoll, rollOne, VALIDATION_LABELS } from "@/lib/dice";

describe("dice", () => {
  it("resolves every validation mode", () => {
    expect(resolveRoll([2, 8, 5], "sum")).toBe(15);
    expect(resolveRoll([2, 8, 5], "highest")).toBe(8);
    expect(resolveRoll([2, 8, 5], "lowest")).toBe(2);
    expect(VALIDATION_LABELS.highest).toContain("maior");
  });

  it("keeps cryptographic rolls inside the die", () => {
    for (let index = 0; index < 100; index += 1) expect(rollOne(20)).toBeGreaterThanOrEqual(1);
    for (let index = 0; index < 100; index += 1) expect(rollOne(20)).toBeLessThanOrEqual(20);
  });
});

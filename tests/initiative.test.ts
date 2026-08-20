import { describe, expect, it } from "vitest";
import { advanceInitiative, orderInitiative } from "@/lib/initiative";
import type { InitiativeState } from "@/lib/types";

const entries = [
  { id: "slow", name: "Anão", initiative: 8 },
  { id: "fast", name: "Elfa", initiative: 19 },
  { id: "tie", name: "Dragão", initiative: 19 },
];

describe("initiative", () => {
  it("sorts by score and then by name", () => {
    expect(orderInitiative(entries).map((entry) => entry.id)).toEqual(["tie", "fast", "slow"]);
  });

  it("wraps turns and advances the round", () => {
    const state: InitiativeState = { entries, activeIndex: 2, round: 3, running: true };
    expect(advanceInitiative(state, 1)).toMatchObject({ activeIndex: 0, round: 4 });
    expect(advanceInitiative({ ...state, activeIndex: 0 }, -1)).toMatchObject({ activeIndex: 2, round: 2 });
  });
});

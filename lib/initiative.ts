import type { InitiativeEntry, InitiativeState } from "@/lib/types";

export function orderInitiative(entries: InitiativeEntry[]) {
  return [...entries].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name, "pt-BR"));
}

export function advanceInitiative(state: InitiativeState, direction: 1 | -1): InitiativeState {
  if (!state.entries.length) return state;
  let activeIndex = state.activeIndex + direction;
  let round = Math.max(1, state.round);
  if (activeIndex >= state.entries.length) { activeIndex = 0; round += 1; }
  if (activeIndex < 0) { activeIndex = state.entries.length - 1; round = Math.max(1, round - 1); }
  return { ...state, activeIndex, round, running: true };
}

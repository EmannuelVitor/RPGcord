import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonsterCombatCards } from "@/components/MonsterSheets";
import type { InitiativeState, MapToken } from "@/lib/types";

const initiative: InitiativeState = { entries: [{ id: "entry", tokenId: "monster", name: "Espectro", initiative: 14 }], activeIndex: 0, round: 1, running: true };

function monster(revealedFields: string[] = []): MapToken {
  return {
    id: "monster",
    ownerId: "gm",
    name: "Espectro",
    initials: "ES",
    x: 40,
    y: 40,
    color: "#984c62",
    kind: "monster",
    monsterSheet: {
      level: 8,
      hp: 25,
      maxHp: 40,
      attributes: [{ id: "defense", label: "Defesa", value: "17" }],
      weaknesses: [{ id: "bell", label: "Sinos", value: "Fica atordoado" }],
      abilities: [{ id: "drain", label: "Drenar alma", value: "3d10" }],
      revealedFields,
    },
  };
}

describe("monster combat cards", () => {
  it("does not render private monster values for a player", () => {
    render(<MonsterCombatCards initiative={initiative} tokens={[monster()]} isGM={false} />);
    expect(screen.getByText("Nível oculto")).toBeInTheDocument();
    expect(screen.queryByText("17")).not.toBeInTheDocument();
    expect(screen.queryByText("3d10")).not.toBeInTheDocument();
    expect(screen.queryByText("Fica atordoado")).not.toBeInTheDocument();
  });

  it("shows only the fields individually revealed by the GM", () => {
    render(<MonsterCombatCards initiative={initiative} tokens={[monster(["level", "ability:drain"])]} isGM={false} />);
    expect(screen.getByText("Nível 8")).toBeInTheDocument();
    expect(screen.getByText("Drenar alma")).toBeInTheDocument();
    expect(screen.getByText("3d10")).toBeInTheDocument();
    expect(screen.queryByText("Fica atordoado")).not.toBeInTheDocument();
  });
});

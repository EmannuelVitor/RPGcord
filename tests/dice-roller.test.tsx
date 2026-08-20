import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiceRoller } from "@/components/DiceRoller";
import { DEFAULT_SHEET_TEMPLATE } from "@/lib/sheet-template";
import type { Character, DiceRoll } from "@/lib/types";

const blankCharacter: Character = {
  id: "user-1",
  ownerId: "user-1",
  name: "",
  ancestry: "",
  characterClass: "",
  level: 1,
  hp: 10,
  maxHp: 10,
  armorClass: 10,
  attributes: { forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10 },
  skills: [],
  inventory: "",
};

const rollResult: DiceRoll = {
  id: "roll-1",
  userId: "user-1",
  userName: "Jogador",
  sides: 20,
  value: 10,
  modifier: 0,
  total: 10,
  createdAt: Date.now(),
};

describe("DiceRoller character summary", () => {
  it("shows a neutral icon instead of placeholder initials before a sheet exists", () => {
    const { container } = render(
      <DiceRoller
        rolls={[]}
        character={blankCharacter}
        template={DEFAULT_SHEET_TEMPLATE}
        hasCharacter={false}
        playerName="Jogador"
        onOpenSheet={() => undefined}
        onRoll={async () => rollResult}
      />,
    );

    const portrait = container.querySelector(".dice-portrait");
    expect(portrait).toHaveTextContent("");
    expect(portrait?.querySelector("svg")).toBeInTheDocument();
  });

  it("derives initials from words in a saved character name", () => {
    const { container } = render(
      <DiceRoller
        rolls={[]}
        character={{ ...blankCharacter, name: "Aria Ventobravo" }}
        template={DEFAULT_SHEET_TEMPLATE}
        hasCharacter
        playerName="Jogador"
        onOpenSheet={() => undefined}
        onRoll={async () => rollResult}
      />,
    );

    expect(container.querySelector(".dice-portrait")).toHaveTextContent("AV");
  });
});

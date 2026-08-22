import { describe, expect, it } from "vitest";
import { isTokenInScene, isUserInScene } from "@/lib/scene-presence";
import type { MapToken } from "@/lib/types";

const hero: MapToken = { id: "hero", ownerId: "a", controllerIds: ["a", "b"], name: "Lira", initials: "LI", x: 50, y: 50, color: "#7259c7", kind: "hero" };
const monster: MapToken = { id: "monster", ownerId: "gm", name: "Fera", initials: "FE", x: 50, y: 50, color: "#a33", kind: "monster" };

describe("scene presence", () => {
  it("keeps a shared hero in the scene while one controller remains", () => {
    expect(isTokenInScene(hero, ["a"])).toBe(true);
    expect(isTokenInScene(hero, ["a", "b"])).toBe(false);
  });

  it("does not remove GM creatures with player scene controls", () => {
    expect(isTokenInScene(monster, ["a", "b"])).toBe(true);
  });

  it("marks only explicitly excluded users as outside", () => {
    expect(isUserInScene("a", ["b"])).toBe(true);
    expect(isUserInScene("a", ["a"])).toBe(false);
  });
});

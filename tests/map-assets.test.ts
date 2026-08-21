import { describe, expect, it } from "vitest";
import { normalizeMapAsset, orderMapAssets } from "@/lib/map-assets";
import type { MapAsset } from "@/lib/types";

function asset(patch: Partial<MapAsset> = {}): MapAsset {
  return {
    id: "asset",
    name: "  Barril  ",
    imageUrl: " https://example.com/barrel.png ",
    kind: "scenery",
    x: 50,
    y: 50,
    width: 12,
    rotation: 0,
    layer: 1,
    hidden: false,
    fogAffected: true,
    ...patch,
  };
}

describe("map assets", () => {
  it("normalizes positioning without stretching or leaving the map", () => {
    expect(normalizeMapAsset(asset({ x: -20, y: 130, width: 90, rotation: 300, layer: 30 }))).toMatchObject({
      name: "Barril",
      imageUrl: "https://example.com/barrel.png",
      x: 0,
      y: 100,
      width: 60,
      rotation: 180,
      layer: 20,
    });
  });

  it("orders assets by layer and then name", () => {
    const ordered = orderMapAssets([
      asset({ id: "c", name: "C", layer: 2 }),
      asset({ id: "b", name: "B", layer: 1 }),
      asset({ id: "a", name: "A", layer: 1 }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
});

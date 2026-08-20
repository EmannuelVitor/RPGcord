import { describe, expect, it } from "vitest";
import { characterNameOf, composeName, isOnline } from "@/lib/display-name";
import type { MapToken } from "@/lib/types";

const sharedToken: MapToken = { id: "hero", ownerId: "owner", controllerIds: ["owner", "second"], name: "Lira", initials: "LI", x: 0, y: 0, color: "#000", kind: "hero" };

describe("display names", () => {
  it("finds a shared character through every controller", () => {
    expect(characterNameOf("second", [sharedToken])).toBe("Lira");
    expect(composeName("Lira", "Erick")).toBe("Lira (Erick)");
  });

  it("expires presence after the heartbeat tolerance", () => {
    expect(isOnline({ present: true, lastSeenAt: 10_000 }, 20_000)).toBe(true);
    expect(isOnline({ present: true, lastSeenAt: 10_000 }, 80_001)).toBe(false);
    expect(isOnline({ present: false, lastSeenAt: 79_999 }, 80_000)).toBe(false);
  });
});

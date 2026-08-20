import { describe, expect, it } from "vitest";
import { musicDrift, synchronizedMusicPosition } from "@/lib/music-sync";

describe("music synchronization", () => {
  const base = { youtubeUrl: "", title: "", loop: false, playing: true, position: 12, startedAt: 1_000 };

  it("advances from the authoritative timestamp", () => {
    expect(synchronizedMusicPosition(base, 6_000)).toBe(17);
  });

  it("does not advance while paused or before the server timestamp exists", () => {
    expect(synchronizedMusicPosition({ ...base, playing: false }, 6_000)).toBe(12);
    expect(synchronizedMusicPosition({ ...base, startedAt: undefined }, 6_000)).toBe(12);
  });

  it("measures absolute drift", () => {
    expect(musicDrift(20, base, 6_000)).toBe(3);
  });
});

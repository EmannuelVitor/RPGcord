import { describe, expect, it } from "vitest";
import { parseYouTubeUrl, toYouTubeEmbedUrl } from "@/lib/youtube";

describe("YouTube URLs", () => {
  it("accepts videos, shorts and playlists", () => {
    expect(parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeUrl("https://youtube.com/shorts/abc_123")?.videoId).toBe("abc_123");
    expect(parseYouTubeUrl("https://youtube.com/playlist?list=PL_safe-123")?.playlistId).toBe("PL_safe-123");
  });

  it("rejects unrelated and unsafe hosts", () => {
    expect(parseYouTubeUrl("https://example.com/watch?v=abc")).toBeUndefined();
    expect(parseYouTubeUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("uses the privacy-enhanced embed domain", () => {
    expect(toYouTubeEmbedUrl("https://youtu.be/abc123", true)).toContain("youtube-nocookie.com/embed/abc123");
    expect(toYouTubeEmbedUrl("https://youtu.be/abc123", true)).toContain("loop=1");
  });
});

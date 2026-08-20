import { describe, expect, it } from "vitest";
import { currentMentionQuery, insertMention, splitMentionText } from "@/lib/chat-mentions";

describe("chat mentions", () => {
  it("detects only the active mention", () => {
    expect(currentMentionQuery("Olá @eri")).toBe("eri");
    expect(currentMentionQuery("Olá @Erick tudo bem")).toBeUndefined();
  });

  it("inserts names with spaces", () => {
    expect(insertMention("Olá @eri", "Erick Mascarenhas")).toBe("Olá @Erick Mascarenhas ");
  });

  it("splits mentions safely even with regex characters", () => {
    expect(splitMentionText("Oi @Ana (GM) e @João", ["Ana (GM)", "João"])).toEqual([
      { text: "Oi ", mention: false },
      { text: "@Ana (GM)", mention: true },
      { text: " e ", mention: false },
      { text: "@João", mention: true },
    ]);
  });
});

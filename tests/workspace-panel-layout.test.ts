import { describe, expect, it } from "vitest";
import { workspacePanelWidth } from "@/lib/workspace-panel-layout";

describe("workspace panel layout", () => {
  it("reserves more space for information-dense campaign panels", () => {
    expect(workspacePanelWidth("table")).toBe(900);
    expect(workspacePanelWidth("npcs")).toBe(860);
    expect(workspacePanelWidth("table")).toBeGreaterThan(workspacePanelWidth("chat"));
  });

  it("uses the compact chat width for private conversations and unknown tabs", () => {
    expect(workspacePanelWidth("whisper:player-1")).toBe(480);
    expect(workspacePanelWidth("future-panel")).toBe(480);
  });
});

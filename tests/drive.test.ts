import { describe, expect, it } from "vitest";
import { toDirectDriveUrl } from "@/lib/drive";

describe("protected Drive URLs", () => {
  it("adds the campaign scope to Google Drive links", () => {
    expect(toDirectDriveUrl("https://drive.google.com/file/d/abcdefghijk/view", "campaign-1")).toBe("/api/drive-image?id=abcdefghijk&campaignId=campaign-1");
  });

  it("upgrades a legacy proxy URL", () => {
    expect(toDirectDriveUrl("/api/drive-image?id=abcdefghijk", "campaign-2")).toBe("/api/drive-image?id=abcdefghijk&campaignId=campaign-2");
  });

  it("keeps non-Drive images unchanged", () => {
    expect(toDirectDriveUrl("https://images.example.com/map.png", "campaign-1")).toBe("https://images.example.com/map.png");
  });
});

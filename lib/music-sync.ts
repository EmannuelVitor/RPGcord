import type { CampaignMusic } from "@/lib/types";

export function synchronizedMusicPosition(value: CampaignMusic, now = Date.now()) {
  if (!value.playing || !value.startedAt) return Math.max(0, value.position);
  return Math.max(0, value.position + Math.max(0, now - value.startedAt) / 1000);
}

export function musicDrift(currentPosition: number, shared: CampaignMusic, now = Date.now()) {
  return Math.abs(Math.max(0, currentPosition) - synchronizedMusicPosition(shared, now));
}

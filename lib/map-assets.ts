import type { MapAsset } from "@/lib/types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function normalizeMapAsset(asset: MapAsset): MapAsset {
  return {
    ...asset,
    name: asset.name.trim().slice(0, 100) || "Asset sem nome",
    imageUrl: asset.imageUrl.trim(),
    x: clamp(Number(asset.x) || 0, 0, 100),
    y: clamp(Number(asset.y) || 0, 0, 100),
    width: clamp(Number(asset.width) || 10, 2, 60),
    rotation: clamp(Number(asset.rotation) || 0, -180, 180),
    layer: Math.round(clamp(Number(asset.layer) || 0, 0, 20)),
    hidden: Boolean(asset.hidden),
    fogAffected: asset.fogAffected !== false,
    locked: Boolean(asset.locked),
  };
}

export function orderMapAssets(assets: MapAsset[]) {
  return [...assets].sort((left, right) => left.layer - right.layer || left.name.localeCompare(right.name, "pt-BR"));
}

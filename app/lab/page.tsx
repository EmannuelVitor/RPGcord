"use client";

import { useState } from "react";
import { Battlemap } from "@/components/Battlemap";
import type { CampaignMember, LightSource, MapToken, Scene } from "@/lib/types";

const baseScene: Scene = {
  id: "active", name: "Cripta de Vael Turog", mapUrl: "/lab-map.svg", revealUrl: "",
  gridSize: 64, gridEnabled: true, mapFit: "contain", fogEnabled: true, visionRadius: 14, visionMode: "shared",
  ambientLight: 0, revealedAreas: [{ id: "a1", x: 41, y: 26, radius: 10 }],
  movementBounds: { enabled: false, left: 3, top: 5, right: 97, bottom: 95 },
  dynamicLights: [
    { id: "L1", name: "Tocha", x: 70, y: 55, brightRadius: 7, dimRadius: 16, intensity: .85, color: "#ffd27a", enabled: true },
  ],
};
const baseTokens: MapToken[] = [
  { id: "u1", ownerId: "u1", name: "Lyra Ventoescuro", initials: "LV", x: 35, y: 50, color: "#8b73d8", kind: "hero" },
  { id: "u2", ownerId: "u2", name: "Thorgrim", initials: "TH", x: 48, y: 50, color: "#57a05f", kind: "hero" },
  { id: "m1", ownerId: "u1", name: "Sentinela goblin", initials: "SG", x: 72, y: 40, color: "#b75252", kind: "monster" },
];
const members: CampaignMember[] = [
  { userId: "u1", name: "Erick", role: "gm" },
  { userId: "u2", name: "Marina Alves", role: "player" },
];

export default function Lab() {
  const [scene, setScene] = useState(baseScene);
  const [tokens, setTokens] = useState(baseTokens);
  const [width, setWidth] = useState(900);
  const patch = (next: Partial<Scene>) => setScene((current) => ({ ...current, ...next }));
  const lights = () => scene.dynamicLights ?? [];

  return <main style={{ padding: 12, background: "#f8f6fc", minHeight: "100vh" }}>
    <div style={{ font: "12px system-ui", marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
      <label>largura da janela do mapa: <input id="w" type="range" min="360" max="1200" value={width} onChange={(e) => setWidth(Number(e.target.value))} /> <b>{width}px</b></label>
      <label>ajuste: <select value={scene.mapFit} onChange={(e) => patch({ mapFit: e.target.value as Scene["mapFit"] })}><option value="contain">contain</option><option value="cover">cover</option><option value="stretch">stretch</option></select></label>
      <label><input type="checkbox" checked={scene.fogEnabled} onChange={(e) => patch({ fogEnabled: e.target.checked })} /> névoa</label>
    </div>
    <div style={{ width, transition: "none" }}>
      <Battlemap
        scene={scene} tokens={tokens} participants={members} userId="u1" isGM hasCharacter
        onMove={(id, x, y) => setTokens((c) => c.map((t) => t.id === id ? { ...t, x, y } : t))}
        onCommitRevealed={(areas) => patch({ revealedAreas: areas })}
        onClearRevealed={() => patch({ revealedAreas: [] })}
        onMoveLight={(id, x, y) => patch({ dynamicLights: lights().map((l) => l.id === id ? { ...l, x, y } : l) })}
        onCreateLight={(l: LightSource) => patch({ dynamicLights: [...lights(), l] })}
        onUpdateLight={(l: LightSource) => patch({ dynamicLights: lights().map((i) => i.id === l.id ? l : i) })}
        onDeleteLight={(id) => patch({ dynamicLights: lights().filter((l) => l.id !== id) })}
        onSetGlobalVision={(r) => patch({ visionRadius: r })}
        onSetTokenVision={(id, r) => setTokens((c) => c.map((t) => t.id === id ? { ...t, visionRadius: r } : t))}
        onToggleTokenLock={(id) => setTokens((c) => c.map((t) => t.id === id ? { ...t, locked: !t.locked } : t))}
      />
    </div>
  </main>;
}

"use client";

import { Eye, Lightbulb, Map, Moon, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toDirectDriveUrl } from "@/lib/drive";
import type { MapToken, Scene } from "@/lib/types";

type Props = {
  scene: Scene;
  tokens: MapToken[];
  ownerId: string;
  onSaveScene: (scene: Scene) => Promise<void>;
  onAddToken: (token: MapToken) => Promise<void>;
  onRemoveToken: (id: string) => Promise<void>;
  onClose: () => void;
};

export function GameMasterPanel({ scene, tokens, ownerId, onSaveScene, onAddToken, onRemoveToken, onClose }: Props) {
  const [draft, setDraft] = useState(scene);
  const [tokenName, setTokenName] = useState("");
  const [tokenImage, setTokenImage] = useState("");
  const [newLightRadius, setNewLightRadius] = useState(16);

  async function saveScene(event: FormEvent) {
    event.preventDefault();
    await onSaveScene({
      ...draft,
      mapUrl: toDirectDriveUrl(draft.mapUrl),
      revealUrl: toDirectDriveUrl(draft.revealUrl),
      mapFit: draft.mapFit ?? "contain",
      visionRadius: Math.max(3, Math.min(45, draft.visionRadius ?? 14)),
      revealedAreas: draft.revealedAreas ?? [],
      dynamicLights: (draft.dynamicLights ?? []).map((light) => ({
        ...light,
        x: Math.max(0, Math.min(100, light.x)),
        y: Math.max(0, Math.min(100, light.y)),
        radius: Math.max(3, Math.min(45, light.radius)),
        intensity: Math.max(.1, Math.min(1, light.intensity)),
      })),
    });
  }

  function addLight() {
    setDraft({
      ...draft,
      dynamicLights: [...(draft.dynamicLights ?? []), {
        id: crypto.randomUUID(), name: `Luz ${(draft.dynamicLights?.length ?? 0) + 1}`,
        x: 50, y: 50, radius: newLightRadius, intensity: .85, color: "#ffd27a", enabled: true,
      }],
    });
  }

  async function createToken() {
    if (!tokenName.trim()) return;
    const token: MapToken = {
      id: crypto.randomUUID(), ownerId, name: tokenName.trim(),
      initials: tokenName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      x: 50, y: 40, color: "#b75252", imageUrl: toDirectDriveUrl(tokenImage), kind: "monster",
    };
    await onAddToken(token);
    setTokenName(""); setTokenImage("");
  }

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer gm-drawer">
        <header><div><p className="eyebrow">Ferramentas do mestre</p><h2>Preparar a cena</h2></div><button className="icon-button" onClick={onClose}><X size={20} /></button></header>
        <form onSubmit={saveScene}>
          <section className="gm-section">
            <h3><Map size={17} /> Mapa ativo</h3>
            <label>Nome da cena<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label>Link ou ID da imagem no Google Drive<input placeholder="https://drive.google.com/file/d/..." value={draft.mapUrl} onChange={(e) => setDraft({ ...draft, mapUrl: e.target.value })} /></label>
            <div className="inline-fields">
              <label>Tamanho da grade<input type="number" min="24" max="96" value={draft.gridSize} onChange={(e) => setDraft({ ...draft, gridSize: Number(e.target.value) })} /></label>
              <label>Ajuste da imagem
                <select value={draft.mapFit ?? "contain"} onChange={(e) => setDraft({ ...draft, mapFit: e.target.value as Scene["mapFit"] })}>
                  <option value="contain">Mostrar mapa inteiro</option>
                  <option value="cover">Preencher a área</option>
                  <option value="stretch">Esticar até as bordas</option>
                </select>
              </label>
            </div>
            <p className="field-help">Aceita mapas de qualquer resolução. “Mostrar mapa inteiro” evita cortes na imagem.</p>
          </section>
          <section className="gm-section">
            <h3><Moon size={17} /> Neblina de guerra</h3>
            <label className="toggle-field">
              <input type="checkbox" checked={draft.fogEnabled ?? false} onChange={(e) => setDraft({ ...draft, fogEnabled: e.target.checked })} />
              <span><strong>Escurecer áreas não exploradas</strong><small>Jogadores enxergam ao redor dos pinos de heróis e nas áreas reveladas.</small></span>
            </label>
            <label>Raio de visão dos jogadores (%)<input type="number" min="3" max="45" value={draft.visionRadius ?? 14} onChange={(e) => setDraft({ ...draft, visionRadius: Number(e.target.value) })} /></label>
            <p className="field-help">Depois de salvar, use o botão de luz sobre o mapa para revelar lugares manualmente.</p>
          </section>
          <section className="gm-section">
            <h3><Lightbulb size={17} /> Pontos de iluminação</h3>
            <p className="field-help">Crie tochas, fogueiras e magia. Depois de salvar, arraste os pontos luminosos diretamente no mapa.</p>
            <div className="light-editor-list">
              {(draft.dynamicLights ?? []).map((light) => (
                <article className="light-editor" key={light.id}>
                  <div className="light-editor-title">
                    <input value={light.name} onChange={(event) => setDraft({ ...draft, dynamicLights: (draft.dynamicLights ?? []).map((item) => item.id === light.id ? { ...item, name: event.target.value } : item) })} />
                    <label className="light-enabled"><input type="checkbox" checked={light.enabled} onChange={(event) => setDraft({ ...draft, dynamicLights: (draft.dynamicLights ?? []).map((item) => item.id === light.id ? { ...item, enabled: event.target.checked } : item) })} /> Ativa</label>
                    <button type="button" onClick={() => setDraft({ ...draft, dynamicLights: (draft.dynamicLights ?? []).filter((item) => item.id !== light.id) })} aria-label={`Remover ${light.name}`}><Trash2 size={15} /></button>
                  </div>
                  <div className="light-editor-grid">
                    <label className="light-radius-control">Área revelada <span>{light.radius}%</span><input type="range" min="3" max="45" value={light.radius} onChange={(event) => setDraft({ ...draft, dynamicLights: (draft.dynamicLights ?? []).map((item) => item.id === light.id ? { ...item, radius: Number(event.target.value) } : item) })} /></label>
                    <label>Intensidade<input type="number" min="0.1" max="1" step="0.1" value={light.intensity} onChange={(event) => setDraft({ ...draft, dynamicLights: (draft.dynamicLights ?? []).map((item) => item.id === light.id ? { ...item, intensity: Number(event.target.value) } : item) })} /></label>
                    <label>Cor<input type="color" value={light.color} onChange={(event) => setDraft({ ...draft, dynamicLights: (draft.dynamicLights ?? []).map((item) => item.id === light.id ? { ...item, color: event.target.value } : item) })} /></label>
                    <label>X (%)<input type="number" min="0" max="100" value={Math.round(light.x)} onChange={(event) => setDraft({ ...draft, dynamicLights: (draft.dynamicLights ?? []).map((item) => item.id === light.id ? { ...item, x: Number(event.target.value) } : item) })} /></label>
                    <label>Y (%)<input type="number" min="0" max="100" value={Math.round(light.y)} onChange={(event) => setDraft({ ...draft, dynamicLights: (draft.dynamicLights ?? []).map((item) => item.id === light.id ? { ...item, y: Number(event.target.value) } : item) })} /></label>
                  </div>
                </article>
              ))}
            </div>
            <button className="secondary-button full" type="button" onClick={addLight}><Plus size={16} /> Adicionar ponto de luz</button>
            <label className="new-light-radius">Tamanho da área da próxima luz <strong>{newLightRadius}%</strong><input type="range" min="3" max="45" value={newLightRadius} onChange={(event) => setNewLightRadius(Number(event.target.value))} /></label>
            <button className="primary-button full scene-save" type="submit"><Save size={16} /> Salvar e ativar cena</button>
          </section>
          <section className="gm-section">
            <h3><Eye size={17} /> Revelação aos jogadores</h3>
            <label>Imagem de monstro ou pista<input placeholder="Link do Google Drive" value={draft.revealUrl} onChange={(e) => setDraft({ ...draft, revealUrl: e.target.value })} /></label>
            <p className="field-help">A imagem ficará disponível na tela principal de todos os jogadores.</p>
          </section>
        </form>
        <section className="gm-section">
          <h3><Plus size={17} /> Adicionar criatura</h3>
          <label>Nome<input placeholder="Ex.: Sentinela goblin" value={tokenName} onChange={(e) => setTokenName(e.target.value)} /></label>
          <label>Imagem opcional<input placeholder="Link do Google Drive" value={tokenImage} onChange={(e) => setTokenImage(e.target.value)} /></label>
          <button className="secondary-button full" onClick={createToken}><Plus size={16} /> Colocar no mapa</button>
          <div className="token-list">
            {tokens.filter((token) => token.kind === "monster").map((token) => <div key={token.id}><span className="mini-token" style={{ background: token.color }}>{token.initials}</span><strong>{token.name}</strong><button onClick={() => onRemoveToken(token.id)} aria-label={`Remover ${token.name}`}><Trash2 size={15} /></button></div>)}
          </div>
        </section>
      </aside>
    </div>
  );
}

"use client";

import { Eye, Lightbulb, Map, Moon, Plus, Save, ScrollText, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toDirectDriveUrl } from "@/lib/drive";
import { SheetTemplateEditor } from "@/components/SheetTemplateEditor";
import type { MapToken, Scene, SheetTemplate } from "@/lib/types";

type Props = {
  scene: Scene;
  tokens: MapToken[];
  sheetTemplate: SheetTemplate;
  ownerId: string;
  onSaveScene: (scene: Scene) => Promise<void>;
  onSaveSheetTemplate: (template: SheetTemplate) => Promise<void>;
  onAddToken: (token: MapToken) => Promise<void>;
  onRemoveToken: (id: string) => Promise<void>;
  embedded?: boolean;
  onClose: () => void;
};

export function GameMasterPanel({ scene, tokens, sheetTemplate, ownerId, embedded = false, onSaveScene, onSaveSheetTemplate, onAddToken, onRemoveToken, onClose }: Props) {
  const [draft, setDraft] = useState(scene);
  const [tokenName, setTokenName] = useState("");
  const [tokenImage, setTokenImage] = useState("");
  const [newLightDim, setNewLightDim] = useState(16);
  const [newLightBright, setNewLightBright] = useState(8);

  useEffect(() => setDraft(scene), [scene]);

  function updateLight(id: string, patch: Record<string, string | number | boolean>) {
    setDraft((current) => ({ ...current, dynamicLights: (current.dynamicLights ?? []).map((light) => light.id === id ? { ...light, ...patch } : light) }));
  }

  async function saveScene(event: FormEvent) {
    event.preventDefault();
    await onSaveScene({
      ...draft,
      mapUrl: toDirectDriveUrl(draft.mapUrl),
      revealUrl: toDirectDriveUrl(draft.revealUrl),
      mapFit: draft.mapFit ?? "contain",
      visionRadius: Math.max(3, Math.min(45, draft.visionRadius ?? 14)),
      visionMode: draft.visionMode ?? "shared",
      ambientLight: Math.max(0, Math.min(1, draft.ambientLight ?? 0)),
      movementBounds: {
        enabled: Boolean(draft.movementBounds?.enabled),
        left: Math.max(0, Math.min(99, draft.movementBounds?.left ?? 3)),
        top: Math.max(0, Math.min(99, draft.movementBounds?.top ?? 5)),
        right: Math.max(1, Math.min(100, draft.movementBounds?.right ?? 97)),
        bottom: Math.max(1, Math.min(100, draft.movementBounds?.bottom ?? 95)),
      },
      revealedAreas: draft.revealedAreas ?? [],
      dynamicLights: (draft.dynamicLights ?? []).map((light) => {
        const dimRadius = Math.max(3, Math.min(45, light.dimRadius ?? light.radius ?? 16));
        return { ...light, x: Math.max(0, Math.min(100, light.x)), y: Math.max(0, Math.min(100, light.y)), brightRadius: Math.max(1, Math.min(dimRadius, light.brightRadius ?? dimRadius * .5)), dimRadius, intensity: Math.max(.1, Math.min(1, light.intensity)) };
      }),
    });
  }

  function addLight() {
    setDraft((current) => ({
      ...current,
      dynamicLights: [...(current.dynamicLights ?? []), {
        id: crypto.randomUUID(), name: "Luz " + ((current.dynamicLights?.length ?? 0) + 1),
        x: 50, y: 50, brightRadius: Math.min(newLightBright, newLightDim), dimRadius: newLightDim, intensity: .85, color: "#ffd27a", enabled: true,
      }],
    }));
  }

  async function createToken() {
    if (!tokenName.trim()) return;
    const token: MapToken = {
      id: crypto.randomUUID(), ownerId, name: tokenName.trim(),
      initials: tokenName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      x: 50, y: 40, color: "#b75252", imageUrl: toDirectDriveUrl(tokenImage), kind: "monster",
    };
    await onAddToken(token);
    setTokenName("");
    setTokenImage("");
  }

  return <div className={"drawer-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="drawer gm-drawer">
      <header><div><p className="eyebrow">Ferramentas do mestre</p><h2>Configurar campanha</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
      <form onSubmit={saveScene}>
        <section className="gm-section">
          <h3><Map size={17} /> Mapa ativo</h3>
          <label>Nome da cena<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Link ou ID da imagem no Google Drive<input placeholder="https://drive.google.com/file/d/..." value={draft.mapUrl} onChange={(event) => setDraft({ ...draft, mapUrl: event.target.value })} /></label>
          <div className="inline-fields">
            <label>Tamanho da grade<input type="number" min="24" max="96" value={draft.gridSize} onChange={(event) => setDraft({ ...draft, gridSize: Number(event.target.value) })} /></label>
            <label>Ajuste da imagem<select value={draft.mapFit ?? "contain"} onChange={(event) => setDraft({ ...draft, mapFit: event.target.value as Scene["mapFit"] })}><option value="contain">Mostrar mapa inteiro</option><option value="cover">Preencher a área</option><option value="stretch">Esticar até as bordas</option></select></label>
          </div>
          <p className="field-help">Aceita mapas de qualquer resolução. “Mostrar mapa inteiro” evita cortes na imagem.</p>
        </section>
        <section className="gm-section">
          <h3><Moon size={17} /> Neblina de guerra</h3>
          <label className="toggle-field"><input type="checkbox" checked={draft.fogEnabled ?? false} onChange={(event) => setDraft({ ...draft, fogEnabled: event.target.checked })} /><span><strong>Escurecer áreas não exploradas</strong><small>Jogadores enxergam ao redor dos heróis e das fontes de luz.</small></span></label>
          <label>Raio de visão dos jogadores (%)<input type="number" min="3" max="45" value={draft.visionRadius ?? 14} onChange={(event) => setDraft({ ...draft, visionRadius: Number(event.target.value) })} /></label>
          <label>Como os campos de visão funcionam<select value={draft.visionMode ?? "shared"} onChange={(event) => setDraft({ ...draft, visionMode: event.target.value as Scene["visionMode"] })}><option value="shared">Compartilhado — a visão do grupo se une</option><option value="individual">Individual — cada jogador vê apenas seu herói</option></select></label>
          <label>Iluminação ambiente <span>{Math.round((draft.ambientLight ?? 0) * 100)}%</span><input type="range" min="0" max="1" step=".05" value={draft.ambientLight ?? 0} onChange={(event) => setDraft({ ...draft, ambientLight: Number(event.target.value) })} /></label>
          <label className="toggle-field"><input type="checkbox" checked={draft.movementBounds?.enabled ?? false} onChange={(event) => setDraft({ ...draft, movementBounds: { ...(draft.movementBounds ?? { left: 3, top: 5, right: 97, bottom: 95 }), enabled: event.target.checked } })} /><span><strong>Limitar movimento dos jogadores</strong><small>O mestre continua livre; os jogadores ficam dentro do retângulo definido.</small></span></label>
          {draft.movementBounds?.enabled ? <div className="movement-bounds-grid"><label>Esquerda<input type="number" min="0" max="99" value={draft.movementBounds.left} onChange={(event) => setDraft({ ...draft, movementBounds: { ...draft.movementBounds!, left: Number(event.target.value) } })} /></label><label>Topo<input type="number" min="0" max="99" value={draft.movementBounds.top} onChange={(event) => setDraft({ ...draft, movementBounds: { ...draft.movementBounds!, top: Number(event.target.value) } })} /></label><label>Direita<input type="number" min="1" max="100" value={draft.movementBounds.right} onChange={(event) => setDraft({ ...draft, movementBounds: { ...draft.movementBounds!, right: Number(event.target.value) } })} /></label><label>Base<input type="number" min="1" max="100" value={draft.movementBounds.bottom} onChange={(event) => setDraft({ ...draft, movementBounds: { ...draft.movementBounds!, bottom: Number(event.target.value) } })} /></label></div> : null}
        </section>
        <section className="gm-section">
          <h3><Lightbulb size={17} /> Pontos de iluminação</h3>
          <p className="field-help">Cada luz é independente. Ela pode ser movida no mapa e ter cor, intensidade, áreas intensa e difusa alteradas a qualquer momento.</p>
          <div className="light-editor-list">
            {(draft.dynamicLights ?? []).map((light) => {
              const dimRadius = light.dimRadius ?? light.radius ?? 16;
              const brightRadius = light.brightRadius ?? dimRadius * .5;
              return <article className="light-editor" key={light.id}>
                <div className="light-editor-title">
                  <input value={light.name} onChange={(event) => updateLight(light.id, { name: event.target.value })} />
                  <label className="light-enabled"><input type="checkbox" checked={light.enabled} onChange={(event) => updateLight(light.id, { enabled: event.target.checked })} /> Ativa</label>
                  <button type="button" onClick={() => setDraft((current) => ({ ...current, dynamicLights: (current.dynamicLights ?? []).filter((item) => item.id !== light.id) }))} aria-label={"Remover " + light.name}><Trash2 size={15} /></button>
                </div>
                <div className="light-editor-grid dual-light-grid">
                  <label className="light-radius-control">Luz intensa <span>{Math.round(brightRadius)}%</span><input type="range" min="1" max={dimRadius} value={brightRadius} onChange={(event) => updateLight(light.id, { brightRadius: Number(event.target.value) })} /></label>
                  <label className="light-radius-control">Luz difusa <span>{Math.round(dimRadius)}%</span><input type="range" min="3" max="45" value={dimRadius} onChange={(event) => updateLight(light.id, { dimRadius: Number(event.target.value), brightRadius: Math.min(brightRadius, Number(event.target.value)) })} /></label>
                  <label>Intensidade<input type="number" min="0.1" max="1" step="0.1" value={light.intensity} onChange={(event) => updateLight(light.id, { intensity: Number(event.target.value) })} /></label>
                  <label>Cor<input type="color" value={light.color} onChange={(event) => updateLight(light.id, { color: event.target.value })} /></label>
                  <label>X (%)<input type="number" min="0" max="100" value={Math.round(light.x)} onChange={(event) => updateLight(light.id, { x: Number(event.target.value) })} /></label>
                  <label>Y (%)<input type="number" min="0" max="100" value={Math.round(light.y)} onChange={(event) => updateLight(light.id, { y: Number(event.target.value) })} /></label>
                </div>
              </article>;
            })}
          </div>
          <div className="new-light-settings"><label>Intensa<input type="number" min="1" max={newLightDim} value={newLightBright} onChange={(event) => setNewLightBright(Number(event.target.value))} /></label><label>Difusa<input type="number" min="3" max="45" value={newLightDim} onChange={(event) => setNewLightDim(Number(event.target.value))} /></label></div>
          <button className="secondary-button full" type="button" onClick={addLight}><Plus size={16} /> Adicionar luz no centro</button>
          <button className="primary-button full scene-save" type="submit"><Save size={16} /> Salvar e ativar cena</button>
        </section>
        <section className="gm-section"><h3><Eye size={17} /> Revelação aos jogadores</h3><label>Imagem de monstro ou pista<input placeholder="Link do Google Drive" value={draft.revealUrl} onChange={(event) => setDraft({ ...draft, revealUrl: event.target.value })} /></label></section>
      </form>

      <section className="gm-section sheet-model-section"><h3><ScrollText size={17} /> Modelo de ficha da campanha</h3><SheetTemplateEditor template={sheetTemplate} onSave={onSaveSheetTemplate} /></section>

      <section className="gm-section">
        <h3><Plus size={17} /> Adicionar criatura</h3>
        <label>Nome<input placeholder="Ex.: Sentinela goblin" value={tokenName} onChange={(event) => setTokenName(event.target.value)} /></label>
        <label>Imagem opcional<input placeholder="Link do Google Drive" value={tokenImage} onChange={(event) => setTokenImage(event.target.value)} /></label>
        <button className="secondary-button full" onClick={() => void createToken()}><Plus size={16} /> Colocar no mapa</button>
        <div className="token-list">{tokens.filter((token) => token.kind === "monster").map((token) => <div key={token.id}><span className="mini-token" style={{ background: token.color }}>{token.initials}</span><strong>{token.name}</strong><button onClick={() => onRemoveToken(token.id)} aria-label={"Remover " + token.name}><Trash2 size={15} /></button></div>)}</div>
      </section>
    </aside>
  </div>;
}

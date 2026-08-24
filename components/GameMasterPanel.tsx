"use client";

import { Boxes, ChevronDown, Eye, EyeOff, Library, Lightbulb, Map, Moon, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { MapAssetManager } from "@/components/MapAssetManager";
import { MonsterSheetEditor } from "@/components/MonsterSheets";
import { tokenFromCreature } from "@/lib/creature";
import { toDirectDriveUrl } from "@/lib/drive";
import type { CreatureRecord, MapAsset, MapToken, MonsterSheet, Scene } from "@/lib/types";

type Props = {
  campaignId: string;
  scene: Scene;
  tokens: MapToken[];
  assets: MapAsset[];
  creatures: CreatureRecord[];
  ownerId: string;
  onSaveScene: (scene: Scene) => Promise<void>;
  onAddToken: (token: MapToken) => Promise<void>;
  onRemoveToken: (id: string) => Promise<void>;
  onSetTokenHidden: (id: string, hidden: boolean) => Promise<void>;
  onUpdateMonsterSheet: (id: string, sheet: MonsterSheet) => Promise<void>;
  onSaveAsset: (asset: MapAsset) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  onOpenTable: () => void;
  embedded?: boolean;
  onClose: () => void;
};

export function GameMasterPanel({ campaignId, scene, tokens, assets, creatures, ownerId, embedded = false, onSaveScene, onAddToken, onRemoveToken, onSetTokenHidden, onUpdateMonsterSheet, onSaveAsset, onDeleteAsset, onOpenTable, onClose }: Props) {
  const [draft, setDraft] = useState(scene);
  const [selectedCreatureId, setSelectedCreatureId] = useState("");
  const [newLightDim, setNewLightDim] = useState(16);
  const [newLightBright, setNewLightBright] = useState(8);
  const [expandedMonsterId, setExpandedMonsterId] = useState<string>();

  useEffect(() => setDraft(scene), [scene]);

  function updateLight(id: string, patch: Record<string, string | number | boolean>) {
    setDraft((current) => ({ ...current, dynamicLights: (current.dynamicLights ?? []).map((light) => light.id === id ? { ...light, ...patch } : light) }));
  }

  async function saveScene(event: FormEvent) {
    event.preventDefault();
    await onSaveScene({
      ...draft,
      mapUrl: toDirectDriveUrl(draft.mapUrl, campaignId),
      revealUrl: toDirectDriveUrl(draft.revealUrl, campaignId),
      mapFit: draft.mapFit ?? "contain",
      gridEnabled: Boolean(draft.gridEnabled),
      gridSize: Math.max(12, Math.min(160, Math.round(draft.gridSize || 48))),
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
    const creature = creatures.find((item) => item.id === selectedCreatureId);
    if (!creature) return;
    await onAddToken(tokenFromCreature(creature, ownerId));
  }

  return <div className={"drawer-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="drawer gm-drawer">
      <header><div><p className="eyebrow">Ferramentas do mestre</p><h2>Preparar cena</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
      <form onSubmit={saveScene}>
        <section className="gm-section">
          <h3><Map size={17} /> Mapa ativo</h3>
          <label>Nome da cena<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Link ou ID da imagem no Google Drive<input placeholder="https://drive.google.com/file/d/..." value={draft.mapUrl} onChange={(event) => setDraft({ ...draft, mapUrl: event.target.value })} /></label>
          <label className="toggle-field"><input type="checkbox" checked={draft.gridEnabled ?? false} onChange={(event) => setDraft({ ...draft, gridEnabled: event.target.checked })} /><span><strong>Mostrar grade sobre o mapa</strong><small>Quadriculado de apoio para medir distâncias. Acompanha o zoom.</small></span></label>
          <div className="inline-fields">
            <label>Tamanho da grade (px)<input type="number" min="12" max="160" value={draft.gridSize} onChange={(event) => setDraft({ ...draft, gridSize: Number(event.target.value) })} /></label>
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

      <section className="gm-section">
        <h3><Boxes size={17} /> Assets personalizados do mapa</h3>
        <MapAssetManager campaignId={campaignId} assets={assets} onSave={onSaveAsset} onDelete={onDeleteAsset} />
      </section>

      <section className="gm-section">
        <h3><Plus size={17} /> Colocar criatura na cena</h3>
        {creatures.length ? <><label>Bestiário da campanha<select value={selectedCreatureId} onChange={(event) => setSelectedCreatureId(event.target.value)}><option value="">Selecione uma criatura</option>{creatures.map((creature) => <option value={creature.id} key={creature.id}>{creature.name}</option>)}</select></label><button className="secondary-button full" disabled={!selectedCreatureId} onClick={() => void createToken()}><Plus size={16} /> Colocar no centro do mapa</button></> : <div className="creature-library-callout"><Library size={20} /><div><strong>Seu bestiário está vazio</strong><span>Cadastre criaturas em Preparar mesa para reutilizá-las em qualquer cena.</span></div></div>}
        <button className="text-link-button" type="button" onClick={onOpenTable}><Library size={14} /> Abrir bestiário em Preparar mesa</button>
        <p className="field-help">Cada criatura colocada recebe uma cópia independente da ficha. Revelações e dano desta cena não alteram o bestiário.</p>
        <div className="token-list monster-token-list">{tokens.filter((token) => token.kind === "monster").map((token) => <article className={expandedMonsterId === token.id ? "expanded" : ""} key={token.id}>
          <div className="monster-token-summary"><span className="mini-token" style={{ background: token.color }}>{token.imageUrl ? <img src={token.imageUrl} alt="" /> : token.initials}</span><strong>{token.name}</strong><button className="monster-sheet-toggle" type="button" onClick={() => setExpandedMonsterId((current) => current === token.id ? undefined : token.id)} aria-expanded={expandedMonsterId === token.id} aria-label={`Editar ficha de ${token.name}`}><ChevronDown size={15} /></button><button className={token.hidden ? "token-hidden-toggle active" : "token-hidden-toggle"} type="button" onClick={() => void onSetTokenHidden(token.id, !token.hidden)} title={token.hidden ? "Revelar para os jogadores" : "Ocultar dos jogadores"} aria-label={(token.hidden ? "Revelar " : "Ocultar ") + token.name}>{token.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button><button type="button" onClick={() => { setExpandedMonsterId((current) => current === token.id ? undefined : current); void onRemoveToken(token.id); }} aria-label={"Remover " + token.name}><Trash2 size={15} /></button></div>
          {expandedMonsterId === token.id ? <MonsterSheetEditor token={token} onSave={(sheet) => onUpdateMonsterSheet(token.id, sheet)} /> : null}
        </article>)}</div>
      </section>
    </aside>
  </div>;
}

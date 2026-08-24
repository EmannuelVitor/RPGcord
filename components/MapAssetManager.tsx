"use client";

import { Boxes, Eye, EyeOff, Layers, LoaderCircle, Lock, Plus, Save, Trash2, Unlock, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toDirectDriveUrl } from "@/lib/drive";
import { uploadCampaignImage } from "@/lib/campaign-image-upload";
import type { MapAsset, MapAssetKind } from "@/lib/types";

const kindLabels: Record<MapAssetKind, string> = {
  scenery: "Cenário",
  loot: "Loot",
  trap: "Armadilha",
  other: "Outro",
};

const blankAsset = (): MapAsset => ({
  id: crypto.randomUUID(),
  name: "",
  imageUrl: "",
  kind: "scenery",
  x: 50,
  y: 50,
  width: 12,
  rotation: 0,
  layer: 1,
  hidden: false,
  fogAffected: true,
  locked: false,
});

function AssetFields({ asset, fileName, onChange, onFileChange }: {
  asset: MapAsset;
  fileName?: string;
  onChange: (asset: MapAsset) => void;
  onFileChange: (file?: File) => void;
}) {
  return <div className="asset-fields">
    <label>Nome<input value={asset.name} maxLength={100} onChange={(event) => onChange({ ...asset, name: event.target.value })} /></label>
    <label>Tipo<select value={asset.kind} onChange={(event) => onChange({ ...asset, kind: event.target.value as MapAssetKind })}>{Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label className="wide">Imagem ou ID do Google Drive<input value={asset.imageUrl} placeholder="Link público da imagem" onChange={(event) => onChange({ ...asset, imageUrl: event.target.value })} /></label>
    <label className="asset-image-upload wide"><Upload size={16} /><span><strong>Enviar imagem</strong><small>{fileName || "JPG, PNG, WebP ou GIF — até 4 MB"}</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => onFileChange(event.target.files?.[0])} /></label>
    <label>Largura (%)<input type="number" min="2" max="60" value={asset.width} onChange={(event) => onChange({ ...asset, width: Number(event.target.value) })} /></label>
    <label>Rotação<input type="number" min="-180" max="180" value={asset.rotation} onChange={(event) => onChange({ ...asset, rotation: Number(event.target.value) })} /></label>
    <label>Posição X (%)<input type="number" min="0" max="100" value={asset.x} onChange={(event) => onChange({ ...asset, x: Number(event.target.value) })} /></label>
    <label>Posição Y (%)<input type="number" min="0" max="100" value={asset.y} onChange={(event) => onChange({ ...asset, y: Number(event.target.value) })} /></label>
    <label>Camada<input type="number" min="0" max="20" value={asset.layer} onChange={(event) => onChange({ ...asset, layer: Number(event.target.value) })} /></label>
    <label className="toggle-field compact-toggle wide"><input type="checkbox" checked={asset.fogAffected} onChange={(event) => onChange({ ...asset, fogAffected: event.target.checked })} /><span><strong>Ocultar sob a névoa</strong><small>O asset só aparece em áreas reveladas aos jogadores.</small></span></label>
  </div>;
}

function AssetRow({ campaignId, asset, deleting, onDeleteIntent, onSave, onDelete }: {
  campaignId: string;
  asset: MapAsset;
  deleting: boolean;
  onDeleteIntent: () => void;
  onSave: (asset: MapAsset) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(asset);
  const [imageFile, setImageFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(asset), [asset]);

  async function save(next = draft) {
    setBusy(true);
    try {
      const imageUrl = imageFile ? await uploadCampaignImage(campaignId, imageFile, "asset") : toDirectDriveUrl(next.imageUrl, campaignId);
      await onSave({ ...next, imageUrl });
      setImageFile(undefined);
    }
    finally { setBusy(false); }
  }

  return <article className={"asset-row" + (asset.hidden ? " hidden" : "")}>
    <header>
      <span className="asset-preview">{asset.imageUrl ? <img src={asset.imageUrl} alt="" /> : <Boxes size={17} />}</span>
      <div><strong>{asset.name}</strong><small>{kindLabels[asset.kind]} · camada {asset.layer}</small></div>
      <button type="button" disabled={busy} onClick={() => void save({ ...asset, hidden: !asset.hidden })} title={asset.hidden ? "Revelar aos jogadores" : "Ocultar dos jogadores"}>{asset.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button>
      <button type="button" disabled={busy} onClick={() => void save({ ...asset, locked: !asset.locked })} title={asset.locked ? "Desbloquear posição" : "Bloquear posição"}>{asset.locked ? <Lock size={15} /> : <Unlock size={15} />}</button>
    </header>
    <details>
      <summary>Editar posicionamento e camada</summary>
      <AssetFields asset={draft} fileName={imageFile?.name} onChange={setDraft} onFileChange={setImageFile} />
      <div className="asset-row-actions">
        {deleting ? <><span>Excluir definitivamente?</span><button className="danger" type="button" onClick={() => void onDelete()}><Trash2 size={14} /> Confirmar</button></> : <button className="danger" type="button" onClick={onDeleteIntent}><Trash2 size={14} /> Excluir</button>}
        <button className="secondary-button" type="button" disabled={busy || !draft.imageUrl.trim()} onClick={() => void save()}><Save size={14} /> Salvar asset</button>
      </div>
    </details>
  </article>;
}

export function MapAssetManager({ campaignId, assets, onSave, onDelete }: {
  campaignId: string;
  assets: MapAsset[];
  onSave: (asset: MapAsset) => Promise<void>;
  onDelete: (assetId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(blankAsset);
  const [imageFile, setImageFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [deleteId, setDeleteId] = useState<string>();

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || (!draft.imageUrl.trim() && !imageFile) || busy) {
      setError("Informe um nome e uma imagem para o asset.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const imageUrl = imageFile ? await uploadCampaignImage(campaignId, imageFile, "asset") : toDirectDriveUrl(draft.imageUrl, campaignId);
      await onSave({ ...draft, imageUrl, createdAt: Date.now() });
      setDraft(blankAsset());
      setImageFile(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o asset.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="asset-manager">
    <p className="field-help">Imagens ficam sobre o mapa, podem ser arrastadas pelo mestre, empilhadas por camada e ocultadas manualmente ou pela névoa.</p>
    <form className="asset-create" onSubmit={create}>
      <AssetFields asset={draft} fileName={imageFile?.name} onChange={setDraft} onFileChange={setImageFile} />
      {error ? <p className="form-error">{error}</p> : null}
      <button className="secondary-button full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} {busy ? "Enviando e adicionando…" : "Adicionar asset ao mapa"}</button>
    </form>
    <div className="asset-list">
      {assets.map((asset) => <AssetRow key={asset.id} campaignId={campaignId} asset={asset} deleting={deleteId === asset.id} onDeleteIntent={() => setDeleteId(asset.id)} onSave={onSave} onDelete={async () => { await onDelete(asset.id); setDeleteId(undefined); }} />)}
      {!assets.length ? <div className="asset-empty"><Layers size={22} /><span>Nenhum asset personalizado nesta cena.</span></div> : null}
    </div>
  </div>;
}

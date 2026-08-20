"use client";

import { CalendarDays, DoorOpen, Shield, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { Campaign } from "@/lib/types";

type Action = "leave" | "delete";

export function CampaignDetailsDialog({ campaign, isGM, onClose, onLeave, onDelete }: {
  campaign: Campaign;
  isGM: boolean;
  onClose: () => void;
  onLeave: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [action, setAction] = useState<Action>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEscapeKey(() => action ? setAction(undefined) : onClose());

  async function confirm() {
    if (!action || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await (action === "delete" ? onDelete() : onLeave());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a ação.");
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop campaign-details-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="invite-dialog campaign-details-dialog" role="dialog" aria-modal="true" aria-labelledby="campaign-details-title">
        <header>
          <div className="dialog-icon"><Shield size={20} /></div>
          <div><p className="eyebrow">Detalhes da campanha</p><h2 id="campaign-details-title">{campaign.name}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </header>

        {action ? (
          <div className="confirm-dialog campaign-details-confirm">
            <h3>{action === "delete" ? "Excluir campanha permanentemente?" : "Sair desta campanha?"}</h3>
            <p>{action === "delete"
              ? <>Todos os mapas, fichas, mensagens e registros de <strong>{campaign.name}</strong> serão removidos. Esta ação não pode ser desfeita.</>
              : <>Você perderá o acesso a <strong>{campaign.name}</strong>. Um novo convite será necessário para entrar novamente.</>}</p>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="confirm-actions">
              <button className="secondary-button" disabled={busy} onClick={() => setAction(undefined)}>Cancelar</button>
              <button className="danger-button" disabled={busy} onClick={() => void confirm()}>{action === "delete" ? <Trash2 size={15} /> : <DoorOpen size={15} />}{busy ? "Aguarde..." : action === "delete" ? "Excluir campanha" : "Sair da campanha"}</button>
            </div>
          </div>
        ) : (
          <>
            <p className="campaign-details-description">{campaign.description || "Esta campanha ainda não possui uma descrição."}</p>
            <dl className="campaign-details-list">
              <div><dt><Shield size={15} /> Mestre</dt><dd>{campaign.ownerName}</dd></div>
              <div><dt><Users size={15} /> Participantes</dt><dd>{campaign.memberIds.length}</dd></div>
              <div><dt><CalendarDays size={15} /> Criada em</dt><dd>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(campaign.createdAt)}</dd></div>
            </dl>
            <div className="campaign-details-actions">
              {isGM
                ? <button className="danger-button" onClick={() => setAction("delete")}><Trash2 size={15} /> Excluir campanha</button>
                : <button className="danger-button" onClick={() => setAction("leave")}><DoorOpen size={15} /> Sair da campanha</button>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

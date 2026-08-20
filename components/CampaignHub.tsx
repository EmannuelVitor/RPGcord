"use client";

import { ArrowRight, BookOpen, Crown, DoorOpen, HelpCircle, LogOut, Plus, Trash2, TriangleAlert, Users, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import type { AppUser, Campaign } from "@/lib/types";

type Props = {
  user: AppUser;
  campaigns: Campaign[];
  loading: boolean;
  error?: string;
  onSelect: (campaignId: string) => void;
  onCreate: (name: string, description: string) => Promise<string>;
  onJoin: (code: string) => Promise<string>;
  onLeave: (campaignId: string) => Promise<void>;
  onDelete: (campaignId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onTutorial: () => void;
};

export function CampaignHub({ user, campaigns, loading, error, onSelect, onCreate, onJoin, onLeave, onDelete, onSignOut, onTutorial }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();
  // Sair e excluir sao irreversiveis, entao passam por uma confirmacao propria.
  const [confirming, setConfirming] = useState<{ campaign: Campaign; action: "leave" | "delete" }>();

  useEffect(() => {
    const invitation = new URLSearchParams(window.location.search).get("invite");
    if (invitation) setCode(invitation.toUpperCase());
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setFormError(undefined);
    try {
      await onCreate(name, description);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Não foi possível criar a campanha.");
    } finally {
      setBusy(false);
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(undefined);
    try {
      await onJoin(code);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Não foi possível aceitar o convite.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction() {
    if (!confirming || busy) return;
    setBusy(true);
    setFormError(undefined);
    try {
      if (confirming.action === "delete") await onDelete(confirming.campaign.id);
      else await onLeave(confirming.campaign.id);
      setConfirming(undefined);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="hub-shell">
      <header className="hub-header">
        <div className="brand hub-brand"><span className="brand-mark"><BrandMark size={38} /></span><div><strong>RPGcord</strong><small>MESA DE RPG AO VIVO</small></div></div>
        <div className="hub-user">
          <button className="icon-button" onClick={onTutorial} title="Como usar o RPGcord"><HelpCircle size={17} /></button>
          <span className="user-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.slice(0, 1)}</span>
          <div><strong>{user.name}</strong><small>{user.email ?? "Conta conectada"}</small></div>
          <button className="icon-button" onClick={onSignOut} title="Sair"><LogOut size={17} /></button>
        </div>
      </header>

      <div className="hub-content">
        <section className="hub-intro">
          <div><p className="eyebrow">Salão de campanhas</p><h1>Escolha sua próxima jornada</h1><p>Continue uma aventura, crie sua própria mesa ou entre com um convite.</p></div>
          <button className="primary-button" onClick={() => setShowCreate((value) => !value)}><Plus size={17} /> Criar campanha</button>
        </section>

        {(error || formError) && <div className="notice"><strong>Atenção.</strong> {formError ?? error}</div>}

        {showCreate && (
          <form className="campaign-create" onSubmit={create}>
            <div><p className="eyebrow">Nova jornada</p><h2>Crie sua campanha</h2></div>
            <label>Nome da campanha<input autoFocus maxLength={70} placeholder="Ex.: Crônicas do Véu" value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <label>Descrição <small>(opcional)</small><textarea maxLength={240} placeholder="Uma breve apresentação para seus jogadores" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? "Criando…" : "Criar e abrir"}</button></div>
          </form>
        )}

        <section className="campaign-section">
          <div className="section-title"><div><p className="eyebrow">Suas mesas</p><h2>Campanhas</h2></div><span>{campaigns.length} {campaigns.length === 1 ? "campanha" : "campanhas"}</span></div>
          {loading ? <div className="empty-campaigns">Carregando suas campanhas…</div> : campaigns.length ? (
            <div className="campaign-grid">
              {campaigns.map((campaign) => (
                <div className="campaign-card-wrap" key={campaign.id}>
                  <button className="campaign-card" onClick={() => onSelect(campaign.id)}>
                    <span className="campaign-icon">{campaign.ownerId === user.id ? <Crown /> : <BookOpen />}</span>
                    <div><small>{campaign.ownerId === user.id ? "Você é o mestre" : `Mestre ${campaign.ownerName}`}</small><strong>{campaign.name}</strong><p>{campaign.description || "Uma nova aventura está esperando por você."}</p><span><Users size={14} /> {campaign.memberIds.length} {campaign.memberIds.length === 1 ? "participante" : "participantes"}</span></div>
                    <ArrowRight size={19} />
                  </button>
                  {campaign.ownerId === user.id
                    ? <button className="campaign-card-action danger" title={`Excluir ${campaign.name}`} aria-label={`Excluir ${campaign.name}`} onClick={() => setConfirming({ campaign, action: "delete" })}><Trash2 size={15} /></button>
                    : <button className="campaign-card-action" title={`Sair de ${campaign.name}`} aria-label={`Sair de ${campaign.name}`} onClick={() => setConfirming({ campaign, action: "leave" })}><DoorOpen size={15} /></button>}
                </div>
              ))}
            </div>
          ) : <div className="empty-campaigns"><BookOpen /><strong>Você ainda não participa de nenhuma campanha.</strong><span>Crie uma mesa ou use o convite enviado pelo seu mestre.</span></div>}
        </section>

        <form className="join-card" onSubmit={join}>
          <div><Users size={20} /><span><strong>Recebeu um convite?</strong><small>Digite o código para participar da campanha.</small></span></div>
          <input aria-label="Código de convite" placeholder="CÓDIGO" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={12} />
          <button className="outline-button" disabled={busy || !code.trim()}>Entrar <ArrowRight size={15} /></button>
        </form>
      </div>

      {confirming ? (
        <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConfirming(undefined)}>
          <section className="invite-dialog confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <button className="icon-button dialog-close" onClick={() => setConfirming(undefined)} aria-label="Fechar"><X size={18} /></button>
            <span className="dialog-icon danger"><TriangleAlert /></span>
            <p className="eyebrow">{confirming.action === "delete" ? "Exclusão definitiva" : "Sair da campanha"}</p>
            <h2 id="confirm-title">{confirming.campaign.name}</h2>
            <p>{confirming.action === "delete"
              ? "Isso apaga a campanha e tudo dentro dela: fichas, mapa, pinos, chat, diário e notas de todos os jogadores. Não há como desfazer."
              : "Você deixa de ver esta campanha e seu pino sai do mapa. Sua ficha fica guardada caso você volte pelo mesmo convite."}</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setConfirming(undefined)} disabled={busy}>Cancelar</button>
              <button className={confirming.action === "delete" ? "danger-button" : "primary-button"} onClick={() => void confirmAction()} disabled={busy}>
                {busy ? "Processando…" : confirming.action === "delete" ? "Excluir para sempre" : "Sair da campanha"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

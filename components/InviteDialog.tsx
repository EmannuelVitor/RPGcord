"use client";

import { Check, Copy, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Campaign } from "@/lib/types";

type Props = { campaign: Campaign; onClose: () => void };

export function InviteDialog({ campaign, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => {
    const origin = typeof window === "undefined" ? "https://rpgcord.vercel.app" : window.location.origin;
    return `${origin}/?invite=${campaign.inviteCode}`;
  }, [campaign.inviteCode]);

  async function copyInvite() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="invite-dialog">
        <button className="icon-button dialog-close" onClick={onClose}><X size={18} /></button>
        <span className="dialog-icon"><Users /></span>
        <p className="eyebrow">Convidar aventureiros</p>
        <h2>Reúna o seu grupo</h2>
        <p>Envie este link. Depois do login, o jogador só precisa confirmar a entrada em <strong>{campaign.name}</strong>.</p>
        <label>Link do convite<div><input readOnly value={link} /><button className="primary-button" onClick={copyInvite}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copiado" : "Copiar"}</button></div></label>
        <div className="invite-code"><span>Código manual</span><strong>{campaign.inviteCode}</strong></div>
      </section>
    </div>
  );
}

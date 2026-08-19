"use client";

import { Crown, Users, X } from "lucide-react";
import type { CampaignMember } from "@/lib/types";

type Props = { members: CampaignMember[]; currentUserId: string; onClose: () => void };

export function ParticipantsPopover({ members, currentUserId, onClose }: Props) {
  const now = Date.now();
  return (
    <section className="participants-popover" aria-label="Jogadores da campanha">
      <header><div><Users size={17} /><strong>Jogadores na campanha</strong></div><button onClick={onClose} aria-label="Fechar"><X size={16} /></button></header>
      <div>
        {members.map((member) => {
          const online = Boolean(member.lastSeenAt && now - member.lastSeenAt < 100000);
          return <article key={member.userId}><span className="participant-avatar">{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : member.name.slice(0, 1).toUpperCase()}<i className={online ? "online" : ""} /></span><div><strong>{member.name}{member.userId === currentUserId ? " (você)" : ""}</strong><small>{member.role === "gm" ? <><Crown size={11} /> Mestre</> : online ? "Na mesa agora" : "Ausente"}</small></div></article>;
        })}
      </div>
    </section>
  );
}

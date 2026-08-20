"use client";

import { Crown, Users, X } from "lucide-react";
import { characterNameOf, composeName } from "@/lib/display-name";
import type { CampaignMember, MapToken } from "@/lib/types";

type Props = { members: CampaignMember[]; tokens?: MapToken[]; currentUserId: string; onClose: () => void };

export function ParticipantsPopover({ members, tokens = [], currentUserId, onClose }: Props) {
  const now = Date.now();
  const nameOf = (member: CampaignMember) => composeName(characterNameOf(member.userId, tokens), member.name) || member.name;
  return (
    <section className="participants-popover" aria-label="Jogadores da campanha">
      <header><div><Users size={17} /><strong>Jogadores na campanha</strong></div><button onClick={onClose} aria-label="Fechar"><X size={16} /></button></header>
      <div>
        {members.map((member) => {
          const online = Boolean(member.lastSeenAt && now - member.lastSeenAt < 100000);
          return <article key={member.userId}><span className="participant-avatar">{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : nameOf(member).slice(0, 1).toUpperCase()}<i className={online ? "online" : ""} /></span><div><strong>{nameOf(member)}{member.userId === currentUserId ? " · você" : ""}</strong><small>{member.role === "gm" ? <><Crown size={11} /> Mestre</> : online ? "Na mesa agora" : "Ausente"}</small></div></article>;
        })}
      </div>
    </section>
  );
}

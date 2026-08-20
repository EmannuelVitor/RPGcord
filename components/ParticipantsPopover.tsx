"use client";

import { Crown, UserMinus, Users, X } from "lucide-react";
import { useState } from "react";
import { characterNameOf, composeName, isOnline } from "@/lib/display-name";
import type { CampaignMember, Character, MapToken } from "@/lib/types";

type Props = {
  members: CampaignMember[];
  characters?: Character[];
  tokens?: MapToken[];
  currentUserId: string;
  ownerId?: string;
  isGM?: boolean;
  onAssignCharacter?: (memberId: string, characterId?: string) => Promise<void>;
  onRemove?: (memberId: string) => Promise<void>;
  onClose: () => void;
};

export function ParticipantsPopover({ members, characters = [], tokens = [], currentUserId, ownerId, isGM = false, onAssignCharacter, onRemove, onClose }: Props) {
  const [busyMemberId, setBusyMemberId] = useState<string>();
  const [error, setError] = useState<string>();
  const now = Date.now();
  const nameOf = (member: CampaignMember) => composeName(characterNameOf(member.userId, tokens), member.name) || member.name;
  const assignedCharacterId = (member: CampaignMember) => member.characterId === undefined
    ? characters.find((character) => character.id === member.userId)?.id ?? ""
    : member.characterId ?? "";

  async function assign(memberId: string, characterId: string) {
    if (!onAssignCharacter || busyMemberId) return;
    setBusyMemberId(memberId);
    setError(undefined);
    try {
      await onAssignCharacter(memberId, characterId || undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível vincular a personagem.");
    } finally {
      setBusyMemberId(undefined);
    }
  }

  async function remove(memberId: string) {
    if (!onRemove || busyMemberId) return;
    setBusyMemberId(memberId);
    setError(undefined);
    try {
      await onRemove(memberId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível remover o participante.");
    } finally {
      setBusyMemberId(undefined);
    }
  }

  return (
    <section className="participants-popover" aria-label="Jogadores da campanha">
      <header><div><Users size={17} /><strong>Jogadores na campanha</strong></div><button onClick={onClose} aria-label="Fechar"><X size={16} /></button></header>
      <div className="participants-list">
        {members.map((member) => {
          const online = isOnline(member, now);
          return <article key={member.userId}>
            <span className="participant-avatar">{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : nameOf(member).slice(0, 1).toUpperCase()}<i className={online ? "online" : ""} /></span>
            <div className="participant-info"><strong>{nameOf(member)}{member.userId === currentUserId ? " · você" : ""}</strong><small>{member.userId === ownerId || member.role === "gm" ? <><Crown size={11} /> Mestre</> : online ? "Na mesa agora" : "Ausente"}</small>
              {isGM && onAssignCharacter ? <label><span>Personagem</span><select aria-label={`Personagem de ${member.name}`} value={assignedCharacterId(member)} disabled={busyMemberId === member.userId} onChange={(event) => void assign(member.userId, event.target.value)}><option value="">Sem personagem</option>{characters.map((character) => <option key={character.id} value={character.id}>{character.name.trim() || "Personagem sem nome"}</option>)}</select></label> : null}
            </div>
            {isGM && onRemove && member.userId !== currentUserId && member.userId !== ownerId ? <button className="participant-remove" disabled={busyMemberId === member.userId} title={"Remover " + nameOf(member) + " da campanha"} aria-label={"Remover " + nameOf(member) + " da campanha"} onClick={() => void remove(member.userId)}><UserMinus size={14} /></button> : null}
          </article>;
        })}
        {error ? <p className="participant-error">{error}</p> : null}
      </div>
    </section>
  );
}

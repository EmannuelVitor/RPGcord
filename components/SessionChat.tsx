"use client";

import { EyeOff, ImagePlus, LoaderCircle, LockKeyhole, MessageCircle, Send, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { characterNameOf, composeName } from "@/lib/display-name";
import type { AppUser, CampaignMember, ChatMessage, MapToken } from "@/lib/types";

type Props = {
  campaignId: string;
  campaignName?: string;
  user: AppUser;
  messages: ChatMessage[];
  whispers?: ChatMessage[];
  participants?: CampaignMember[];
  tokens?: MapToken[];
  privateWith?: CampaignMember;
  isGM: boolean;
  embedded?: boolean;
  onSend: (text: string, image?: { imageUrl: string; driveFileId: string }, spoiler?: boolean, recipient?: CampaignMember) => Promise<void>;
  onOpenWhisper?: (partnerId: string) => void;
  onClear: () => Promise<void>;
  onClose: () => void;
};

export function SessionChat({
  campaignId,
  campaignName = "esta campanha",
  user,
  messages,
  whispers = [],
  participants = [],
  tokens = [],
  privateWith,
  isGM,
  embedded = false,
  onSend,
  onOpenWhisper,
  onClear,
  onClose,
}: Props) {
  /** "Personagem (Jogador)" — o nome da personagem vem do pino ja sincronizado. */
  const nameOf = (userId: string, playerName: string) => composeName(characterNameOf(userId, tokens), playerName) || playerName;
  const initialOf = (userId: string, playerName: string) => nameOf(userId, playerName).slice(0, 1).toUpperCase();

  const [text, setText] = useState("");
  const [file, setFile] = useState<File>();
  const [sending, setSending] = useState(false);
  const [spoiler, setSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string>();
  const [recipientId, setRecipientId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const whisperTargets = useMemo(
    () => privateWith ? [] : participants.filter((member) => member.userId !== user.id && (isGM || member.role === "gm")),
    [isGM, participants, privateWith, user.id],
  );

  const privateConversations = useMemo(() => {
    const byPartner = new Map<string, { member: CampaignMember; latest: ChatMessage }>();
    for (const message of whispers) {
      const partnerId = message.userId === user.id ? message.recipientId : message.userId;
      if (!partnerId || partnerId === user.id) continue;
      const member = participants.find((item) => item.userId === partnerId) ?? {
        userId: partnerId,
        name: message.userId === partnerId ? message.userName : message.recipientName ?? "Conversa privada",
        role: (isGM ? "player" : "gm") as CampaignMember["role"],
      };
      const existing = byPartner.get(partnerId);
      if (!existing || existing.latest.createdAt < message.createdAt) byPartner.set(partnerId, { member, latest: message });
    }
    return [...byPartner.values()].sort((a, b) => b.latest.createdAt - a.latest.createdAt);
  }, [isGM, participants, user.id, whispers]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    setError(undefined);
    try {
      let image: { imageUrl: string; driveFileId: string } | undefined;
      if (file) {
        if (file.size > 4 * 1024 * 1024) throw new Error("A imagem pode ter no máximo 4 MB.");
        const token = await auth?.currentUser?.getIdToken();
        if (!token) throw new Error("Sua sessão expirou. Entre novamente para enviar imagens.");
        const body = new FormData();
        body.set("campaignId", campaignId);
        body.set("file", file);
        const response = await fetch("/api/chat-upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível enviar a imagem.");
        image = result;
      }
      const recipient = privateWith ?? participants.find((member) => member.userId === recipientId);
      await onSend(text, image, spoiler, recipient);
      if (!privateWith && recipient) onOpenWhisper?.(recipient.userId);
      setText("");
      setFile(undefined);
      setSpoiler(false);
      setRecipientId("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  const partnerName = privateWith ? nameOf(privateWith.userId, privateWith.name) : "";
  const chatTitle = privateWith ? `Conversa com ${partnerName}` : "Chat da sessão";
  const chatNote = privateWith
    ? <>Conversa privada entre <strong>você</strong> e <strong>{partnerName}</strong>. Ninguém mais da campanha pode ler.</>
    : <>Chat geral exclusivo de <strong>{campaignName}</strong>. Inicie um sussurro para abrir uma conversa privada.</>;

  return (
    <div className={"drawer-backdrop chat-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer chat-drawer">
        <header>
          <div><p className="eyebrow">{privateWith ? "Sussurro privado" : "Durante a aventura"}</p><h2>{privateWith ? <LockKeyhole size={19} /> : <MessageCircle size={19} />}{chatTitle}</h2></div>
          <div className="chat-header-actions">
            {!privateWith && isGM && messages.length > 0 ? <button className="icon-button" onClick={onClear} title="Limpar o chat geral"><Trash2 size={17} /></button> : null}
            <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
          </div>
        </header>

        <div className={"chat-note" + (privateWith ? " private" : "")}>{chatNote}</div>
        {!privateWith && privateConversations.length > 0 ? (
          <div className="private-conversations">
            <span><LockKeyhole size={12} /> Conversas privadas</span>
            <div>
              {privateConversations.map(({ member, latest }) => (
                <button type="button" key={member.userId} onClick={() => onOpenWhisper?.(member.userId)} title={`Abrir conversa privada com ${nameOf(member.userId, member.name)}`}>
                  <i>{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : initialOf(member.userId, member.name)}</i>
                  <span><strong>{nameOf(member.userId, member.name)}</strong><small>{latest.text || "Imagem enviada"}</small></span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="chat-messages">
          {messages.length === 0 ? <div className="empty-chat">{privateWith ? <LockKeyhole /> : <MessageCircle />}<strong>{privateWith ? "Conversa privada criada" : "A conversa começa aqui"}</strong><span>{privateWith ? `Somente você e ${partnerName} verão as mensagens.` : "Envie texto, pistas ou imagens para o grupo."}</span></div> : null}
          {messages.map((message) => (
            <article className={`chat-message ${message.userId === user.id ? "mine" : ""} ${privateWith ? "whisper" : ""}`} key={message.id}>
              <span className="chat-avatar">{message.userAvatarUrl ? <img src={message.userAvatarUrl} alt="" /> : initialOf(message.userId, message.userName)}</span>
              <div>
                <header><strong>{nameOf(message.userId, message.userName)}</strong>{privateWith ? <span className="whisper-label"><LockKeyhole size={10} /> privado</span> : null}<time>{new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></header>
                {message.text ? <p>{message.text}</p> : null}
                {message.imageUrl && message.spoiler && !revealedSpoilers.has(message.id) ? (
                  <button className="chat-spoiler" onClick={() => setRevealedSpoilers((current) => new Set(current).add(message.id))}>
                    <img className="chat-image" src={message.imageUrl} alt="Imagem ocultada como spoiler" />
                    <span><EyeOff size={18} /><strong>Spoiler de role play</strong><small>Clique para revelar a imagem</small></span>
                  </button>
                ) : message.imageUrl ? <a href={message.imageUrl} target="_blank" rel="noreferrer"><img className="chat-image" src={message.imageUrl} alt={`Imagem enviada por ${nameOf(message.userId, message.userName)}`} /></a> : null}
              </div>
            </article>
          ))}
          <div ref={endRef} />
        </div>

        <form ref={formRef} className="chat-composer" onSubmit={submit}>
          {privateWith ? <div className="private-recipient"><LockKeyhole size={13} /> Enviando somente para <strong>{partnerName}</strong></div> : null}
          {whisperTargets.length > 0 ? <label className="whisper-target"><LockKeyhole size={14} /><span>Enviar para</span><select value={recipientId} onChange={(event) => setRecipientId(event.target.value)}><option value="">Todos da campanha</option>{whisperTargets.map((member) => <option key={member.userId} value={member.userId}>Abrir conversa com {nameOf(member.userId, member.name)}</option>)}</select></label> : null}
          {file ? <><div className="selected-image"><ImagePlus size={15} /><span>{file.name}</span><button type="button" onClick={() => { setFile(undefined); setSpoiler(false); if (fileRef.current) fileRef.current.value = ""; }}><X size={14} /></button></div><label className="spoiler-option"><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} /><EyeOff size={14} /> Ocultar imagem como spoiler de role play</label></> : null}
          {error ? <p className="chat-error">{error}</p> : null}
          <div>
            <label className="chat-file-button" title="Enviar imagem"><ImagePlus size={19} /><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setFile(event.target.files?.[0])} /></label>
            <textarea maxLength={2000} rows={1} placeholder={privateWith ? `Mensagem privada para ${partnerName}` : "Enter envia · Shift+Enter quebra a linha"} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }} />
            <button className="chat-send" disabled={sending || (!text.trim() && !file)} aria-label="Enviar">{sending ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

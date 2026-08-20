"use client";

import { AtSign, Check, EyeOff, ImagePlus, LoaderCircle, LockKeyhole, MessageCircle, Pencil, Send, Trash2, Undo2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { currentMentionQuery, insertMention as insertMentionText, splitMentionText } from "@/lib/chat-mentions";
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
  onSend: (text: string, image?: { imageUrl: string; driveFileId: string }, spoiler?: boolean, recipient?: CampaignMember, mentionIds?: string[]) => Promise<void>;
  onEdit: (message: ChatMessage, text: string) => Promise<void>;
  onDelete: (message: ChatMessage) => Promise<void>;
  onTyping: (conversationId?: string) => Promise<void>;
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
  onEdit,
  onDelete,
  onTyping,
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
  const [mentionIds, setMentionIds] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string>();
  const [editingText, setEditingText] = useState("");
  const [messageBusyId, setMessageBusyId] = useState<string>();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string>();
  const [typingClock, setTypingClock] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | undefined>(undefined);
  const lastTypingRef = useRef<{ conversationId?: string; sentAt: number }>({ sentAt: 0 });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setTypingClock(Date.now()), 2000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(typingTimerRef.current);
    void onTyping(undefined);
  }, [onTyping]);

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

  const activeRecipientId = privateWith?.userId ?? recipientId;
  const conversationId = activeRecipientId ? [user.id, activeRecipientId].sort().join("__") : "general";
  const typingMembers = participants.filter((member) => member.userId !== user.id && member.typingConversationId === conversationId && Boolean(member.typingAt && typingClock - member.typingAt < 5000));
  const mentionQuery = currentMentionQuery(text);
  const mentionSuggestions = mentionQuery !== undefined ? participants
    .filter((member) => member.userId !== user.id)
    .filter((member) => nameOf(member.userId, member.name).toLocaleLowerCase("pt-BR").includes(mentionQuery.toLocaleLowerCase("pt-BR")))
    .slice(0, 5) : [];

  function notifyTyping(nextText: string) {
    window.clearTimeout(typingTimerRef.current);
    if (!nextText.trim()) {
      if (lastTypingRef.current.conversationId) void onTyping(undefined);
      lastTypingRef.current = { sentAt: 0 };
      return;
    }
    const now = Date.now();
    if (lastTypingRef.current.conversationId !== conversationId || now - lastTypingRef.current.sentAt > 1400) {
      lastTypingRef.current = { conversationId, sentAt: now };
      void onTyping(conversationId);
    }
    typingTimerRef.current = window.setTimeout(() => {
      lastTypingRef.current = { sentAt: 0 };
      void onTyping(undefined);
    }, 2600);
  }

  function insertMention(member: CampaignMember) {
    const label = nameOf(member.userId, member.name);
    setText((current) => insertMentionText(current, label));
    setMentionIds((current) => new Set(current).add(member.userId));
  }

  function renderMessageText(message: ChatMessage) {
    const names = (message.mentionIds ?? []).map((id) => {
      const member = participants.find((item) => item.userId === id);
      return member ? nameOf(member.userId, member.name) : undefined;
    }).filter((name): name is string => Boolean(name));
    return splitMentionText(message.text, names).map((part, index) => part.mention ? <mark className="chat-mention" key={`${part.text}-${index}`}>{part.text}</mark> : part.text);
  }

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
      await onSend(text, image, spoiler, recipient, [...mentionIds]);
      if (!privateWith && recipient) onOpenWhisper?.(recipient.userId);
      setText("");
      setFile(undefined);
      setSpoiler(false);
      setRecipientId("");
      setMentionIds(new Set());
      notifyTyping("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function saveEdit(message: ChatMessage) {
    if (messageBusyId) return;
    setMessageBusyId(message.id);
    setError(undefined);
    try {
      await onEdit(message, editingText);
      setEditingId(undefined);
      setEditingText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível editar a mensagem.");
    } finally {
      setMessageBusyId(undefined);
    }
  }

  async function removeMessage(message: ChatMessage) {
    if (confirmingDeleteId !== message.id) {
      setConfirmingDeleteId(message.id);
      window.setTimeout(() => setConfirmingDeleteId((current) => current === message.id ? undefined : current), 3200);
      return;
    }
    setMessageBusyId(message.id);
    setError(undefined);
    try {
      await onDelete(message);
      setConfirmingDeleteId(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir a mensagem.");
    } finally {
      setMessageBusyId(undefined);
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
            <article className={`chat-message ${message.userId === user.id ? "mine" : ""} ${privateWith ? "whisper" : ""} ${message.mentionIds?.includes(user.id) ? "mentions-me" : ""}`} key={message.id}>
              <span className="chat-avatar">{message.userAvatarUrl ? <img src={message.userAvatarUrl} alt="" /> : initialOf(message.userId, message.userName)}</span>
              <div>
                <header><strong>{nameOf(message.userId, message.userName)}</strong>{privateWith ? <span className="whisper-label"><LockKeyhole size={10} /> privado</span> : null}{message.mentionIds?.includes(user.id) ? <span className="mention-label"><AtSign size={10} /> mencionou você</span> : null}<time>{new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{message.editedAt ? " · editada" : ""}</time>
                  <span className="chat-message-actions">{message.userId === user.id ? <button disabled={messageBusyId === message.id} onClick={() => { setEditingId(message.id); setEditingText(message.text); }} title="Editar mensagem" aria-label="Editar mensagem"><Pencil size={12} /></button> : null}{message.userId === user.id || isGM ? <button className={confirmingDeleteId === message.id ? "confirm" : ""} disabled={messageBusyId === message.id} onClick={() => void removeMessage(message)} title={confirmingDeleteId === message.id ? "Clique novamente para confirmar" : "Excluir mensagem"} aria-label={confirmingDeleteId === message.id ? "Confirmar exclusão da mensagem" : "Excluir mensagem"}>{confirmingDeleteId === message.id ? <Check size={12} /> : <Trash2 size={12} />}</button> : null}</span>
                </header>
                {editingId === message.id ? <div className="chat-edit"><textarea maxLength={2000} value={editingText} onChange={(event) => setEditingText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void saveEdit(message); } }} autoFocus /><span><button onClick={() => { setEditingId(undefined); setEditingText(""); }}><Undo2 size={12} /> Cancelar</button><button disabled={messageBusyId === message.id} onClick={() => void saveEdit(message)}><Check size={12} /> Salvar</button></span></div> : message.text ? <p>{renderMessageText(message)}</p> : null}
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

        {typingMembers.length ? <div className="chat-typing"><i /><i /><i /><span>{typingMembers.length === 1 ? `${nameOf(typingMembers[0].userId, typingMembers[0].name)} está digitando` : `${typingMembers.length} pessoas estão digitando`}</span></div> : null}

        <form ref={formRef} className="chat-composer" onSubmit={submit}>
          {privateWith ? <div className="private-recipient"><LockKeyhole size={13} /> Enviando somente para <strong>{partnerName}</strong></div> : null}
          {whisperTargets.length > 0 ? <label className="whisper-target"><LockKeyhole size={14} /><span>Enviar para</span><select value={recipientId} onChange={(event) => setRecipientId(event.target.value)}><option value="">Todos da campanha</option>{whisperTargets.map((member) => <option key={member.userId} value={member.userId}>Abrir conversa com {nameOf(member.userId, member.name)}</option>)}</select></label> : null}
          {file ? <><div className="selected-image"><ImagePlus size={15} /><span>{file.name}</span><button type="button" onClick={() => { setFile(undefined); setSpoiler(false); if (fileRef.current) fileRef.current.value = ""; }}><X size={14} /></button></div><label className="spoiler-option"><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} /><EyeOff size={14} /> Ocultar imagem como spoiler de role play</label></> : null}
          {error ? <p className="chat-error">{error}</p> : null}
          {mentionSuggestions.length ? <div className="mention-suggestions"><span><AtSign size={12} /> Mencionar</span>{mentionSuggestions.map((member) => <button type="button" key={member.userId} onClick={() => insertMention(member)}><i>{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : initialOf(member.userId, member.name)}</i><strong>{nameOf(member.userId, member.name)}</strong></button>)}</div> : null}
          <div>
            <label className="chat-file-button" title="Enviar imagem"><ImagePlus size={19} /><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setFile(event.target.files?.[0])} /></label>
            <textarea maxLength={2000} rows={1} placeholder={privateWith ? `Mensagem privada para ${partnerName}` : "Digite @ para mencionar · Enter envia"} value={text} onChange={(event) => { setText(event.target.value); notifyTyping(event.target.value); }} onKeyDown={(event) => {
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

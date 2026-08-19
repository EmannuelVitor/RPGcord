"use client";

import { EyeOff, ImagePlus, LoaderCircle, LockKeyhole, MessageCircle, Send, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import type { AppUser, CampaignMember, ChatMessage } from "@/lib/types";

type Props = {
  campaignId: string;
  campaignName?: string;
  user: AppUser;
  messages: ChatMessage[];
  participants?: CampaignMember[];
  isGM: boolean;
  embedded?: boolean;
  onSend: (text: string, image?: { imageUrl: string; driveFileId: string }, spoiler?: boolean, recipient?: CampaignMember) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
};

export function SessionChat({ campaignId, campaignName = "esta campanha", user, messages, participants = [], isGM, embedded = false, onSend, onClear, onClose }: Props) {
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
      await onSend(text, image, spoiler, participants.find((member) => member.userId === recipientId));
      setText("");
      setFile(undefined);
      setSpoiler(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }
  const whisperTargets = participants.filter((member) => member.userId !== user.id && (isGM || member.role === "gm"));

  return (
    <div className={"drawer-backdrop chat-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer chat-drawer">
        <header>
          <div><p className="eyebrow">Durante a aventura</p><h2><MessageCircle size={19} /> Chat da sessão</h2></div>
          <div className="chat-header-actions">
            {isGM && messages.length > 0 && <button className="icon-button" onClick={onClear} title="Limpar o chat"><Trash2 size={17} /></button>}
            <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
          </div>
        </header>

        <div className="chat-note">Chat exclusivo de <strong>{campaignName}</strong>. Sussurros só aparecem para remetente e destinatário.</div>
        <div className="chat-messages">
          {messages.length === 0 && <div className="empty-chat"><MessageCircle /><strong>A conversa começa aqui</strong><span>Envie texto, pistas ou imagens para o grupo.</span></div>}
          {messages.map((message) => (
            <article className={`chat-message ${message.userId === user.id ? "mine" : ""} ${message.recipientId ? "whisper" : ""}`} key={message.id}>
              <span className="chat-avatar">{message.userAvatarUrl ? <img src={message.userAvatarUrl} alt="" /> : message.userName.slice(0, 1).toUpperCase()}</span>
              <div>
                <header><strong>{message.userName}</strong>{message.recipientId ? <span className="whisper-label"><LockKeyhole size={10} /> para {message.userId === user.id ? message.recipientName : "você"}</span> : null}<time>{new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></header>
                {message.text && <p>{message.text}</p>}
                {message.imageUrl && message.spoiler && !revealedSpoilers.has(message.id) ? (
                  <button className="chat-spoiler" onClick={() => setRevealedSpoilers((current) => new Set(current).add(message.id))}>
                    <img className="chat-image" src={message.imageUrl} alt="Imagem ocultada como spoiler" />
                    <span><EyeOff size={18} /><strong>Spoiler de role play</strong><small>Clique para revelar a imagem</small></span>
                  </button>
                ) : message.imageUrl ? <a href={message.imageUrl} target="_blank" rel="noreferrer"><img className="chat-image" src={message.imageUrl} alt={`Imagem enviada por ${message.userName}`} /></a> : null}
              </div>
            </article>
          ))}
          <div ref={endRef} />
        </div>

        <form ref={formRef} className="chat-composer" onSubmit={submit}>
          {whisperTargets.length > 0 ? <label className="whisper-target"><LockKeyhole size={14} /><span>Enviar para</span><select value={recipientId} onChange={(event) => setRecipientId(event.target.value)}><option value="">Todos da campanha</option>{whisperTargets.map((member) => <option key={member.userId} value={member.userId}>Sussurro para {member.name}</option>)}</select></label> : null}
          {file && <><div className="selected-image"><ImagePlus size={15} /><span>{file.name}</span><button type="button" onClick={() => { setFile(undefined); setSpoiler(false); if (fileRef.current) fileRef.current.value = ""; }}><X size={14} /></button></div><label className="spoiler-option"><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} /><EyeOff size={14} /> Ocultar imagem como spoiler de role play</label></>}
          {error && <p className="chat-error">{error}</p>}
          <div>
            <label className="chat-file-button" title="Enviar imagem"><ImagePlus size={19} /><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setFile(event.target.files?.[0])} /></label>
            <textarea maxLength={2000} rows={1} placeholder="Enter envia · Shift+Enter quebra a linha" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
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

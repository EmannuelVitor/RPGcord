"use client";

import { Music2, Save, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { CampaignMusic } from "@/lib/types";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

type Props = {
  music: CampaignMusic;
  isGM: boolean;
  embedded?: boolean;
  onSave: (music: CampaignMusic) => Promise<void>;
  onClose: () => void;
};

/**
 * Guia de configuracao da trilha. Fica separada do MusicPlayer porque o orbe
 * flutuante hospeda o iframe do YouTube e nao pode desmontar ao trocar de aba —
 * a reproducao pararia. Aqui nao ha player, so os dados da trilha.
 */
export function MusicPanel({ music, isGM, embedded = false, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(music);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(music), [music]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const nextUrl = draft.youtubeUrl.trim();
    if (nextUrl && !toYouTubeEmbedUrl(nextUrl, draft.loop)) {
      setError("Cole um link válido de vídeo ou playlist do YouTube.");
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      const changedTrack = nextUrl !== music.youtubeUrl;
      await onSave({
        ...draft,
        youtubeUrl: nextUrl,
        title: draft.title.trim(),
        playing: changedTrack ? false : music.playing,
        position: changedTrack ? 0 : music.position,
        startedAt: changedTrack ? undefined : music.startedAt,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } finally {
      setSaving(false);
    }
  }

  const hasMusic = Boolean(music.youtubeUrl.trim());

  return (
    <div className={"drawer-backdrop music-backdrop" + (embedded ? " embedded" : "")} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer music-drawer">
        <header>
          <div><p className="eyebrow">Trilha da mesa</p><h2><Music2 size={19} /> Música da campanha</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>
        <div className="music-content">
          {hasMusic
            ? <div className="music-shared-status"><Music2 /><div><strong>{music.title || "Trilha selecionada"}</strong><span>{music.playing ? "Tocando sincronizada para o grupo" : "Pausada pelo mestre"}</span></div></div>
            : <div className="music-empty"><Music2 /><strong>Nenhuma trilha selecionada</strong><span>O mestre pode adicionar um vídeo ou uma playlist do YouTube.</span></div>}
          <p className="music-note">{isGM
            ? "Somente o mestre controla reprodução, pausa e posição pelo orbe flutuante. Os participantes ativam o áudio e regulam apenas o próprio volume."
            : "A reprodução é controlada exclusivamente pelo mestre. Ative o áudio no orbe flutuante; seu único controle individual é o volume."}</p>
          {isGM ? (
            <form className="music-form" onSubmit={submit}>
              <label>Nome da trilha<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Exploração da floresta" /></label>
              <label>Link do YouTube<input value={draft.youtubeUrl} onChange={(event) => setDraft({ ...draft, youtubeUrl: event.target.value })} placeholder="Vídeo ou playlist do YouTube" /></label>
              <label className="toggle-field"><input type="checkbox" checked={draft.loop} onChange={(event) => setDraft({ ...draft, loop: event.target.checked })} /><span><strong>Repetir a trilha</strong><small>Vídeos individuais e playlists podem tocar em loop.</small></span></label>
              {error ? <p className="music-error">{error}</p> : null}
              <button className="primary-button full" disabled={saving}><Save size={16} /> {saving ? "Salvando…" : saved ? "Trilha salva" : "Salvar para a campanha"}</button>
            </form>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

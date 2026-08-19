"use client";

import { ChevronDown, ChevronUp, Music2, Pause, Play, Save, Volume2, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { CampaignMusic } from "@/lib/types";
import { parseYouTubeUrl, toYouTubeEmbedUrl } from "@/lib/youtube";

type YTPlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
};

type YTApi = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: number };
};

declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YTApi> | undefined;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise<YTApi>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

type Props = {
  open: boolean;
  music: CampaignMusic;
  isGM: boolean;
  onSave: (music: CampaignMusic) => Promise<void>;
  onPlayback: (playing: boolean, position: number) => Promise<void>;
  onClose: () => void;
};

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MusicPlayer({ open, music, isGM, onSave, onPlayback, onClose }: Props) {
  const [draft, setDraft] = useState(music);
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState(music.position);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(65);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const musicRef = useRef(music);
  const audioEnabledRef = useRef(audioEnabled);
  const playbackRef = useRef(onPlayback);
  const target = parseYouTubeUrl(music.youtubeUrl);

  useEffect(() => { musicRef.current = music; }, [music]);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => { playbackRef.current = onPlayback; }, [onPlayback]);
  useEffect(() => { setDraft(music); }, [music]);

  function synchronizedPosition(value = musicRef.current) {
    if (!value.playing || !value.startedAt) return value.position;
    return value.position + Math.max(0, Date.now() - value.startedAt) / 1000;
  }

  function applySharedPlayback(forceSeek = false) {
    const player = playerRef.current;
    if (!player || !audioEnabledRef.current) return;
    const shared = musicRef.current;
    const nextPosition = synchronizedPosition(shared);
    const current = player.getCurrentTime() || 0;
    if (forceSeek || Math.abs(current - nextPosition) > 1.4) player.seekTo(nextPosition, true);
    player.setVolume(volume);
    if (shared.playing) player.playVideo(); else player.pauseVideo();
  }

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container || !target) return;
    let cancelled = false;
    setReady(false);
    container.replaceChildren();
    const mount = document.createElement("div");
    container.appendChild(mount);
    void loadYouTubeApi().then((api) => {
      if (cancelled) return;
      playerRef.current = new api.Player(mount, {
        width: "220",
        height: "200",
        videoId: target.videoId,
        playerVars: {
          controls: 0,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
          ...(target.playlistId ? { listType: "playlist", list: target.playlistId } : {}),
          ...(music.loop ? { loop: 1, playlist: target.playlistId ?? target.videoId } : {}),
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            playerRef.current?.setVolume(volume);
            setDuration(playerRef.current?.getDuration() || 0);
            applySharedPlayback(true);
          },
          onStateChange: (event: { data: number }) => {
            if (isGM && event.data === api.PlayerState.ENDED && !musicRef.current.loop) void playbackRef.current(false, 0);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      container.replaceChildren();
    };
  }, [music.loop, music.youtubeUrl]);

  useEffect(() => {
    setPosition(synchronizedPosition(music));
    applySharedPlayback(true);
  }, [music.playing, music.position, music.startedAt, music.updatedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const current = player.getCurrentTime() || 0;
      setPosition(current);
      setDuration(player.getDuration() || 0);
      if (audioEnabledRef.current && musicRef.current.playing && Math.abs(current - synchronizedPosition()) > 1.5) applySharedPlayback(true);
    }, 800);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextUrl = draft.youtubeUrl.trim();
    if (nextUrl && !toYouTubeEmbedUrl(nextUrl, draft.loop)) {
      setError("Cole um link válido de vídeo ou playlist do YouTube.");
      return;
    }
    const changedTrack = nextUrl !== music.youtubeUrl;
    setError(undefined);
    await onSave({ ...draft, youtubeUrl: nextUrl, title: draft.title.trim(), playing: changedTrack ? false : music.playing, position: changedTrack ? 0 : music.position, startedAt: changedTrack ? undefined : music.startedAt });
  }

  async function togglePlayback() {
    const player = playerRef.current;
    if (!player) return;
    const current = player.getCurrentTime() || synchronizedPosition();
    await onPlayback(!music.playing, current);
  }

  function enableAudio() {
    setAudioEnabled(true);
    audioEnabledRef.current = true;
    applySharedPlayback(true);
  }

  const hasMusic = Boolean(target);

  return (
    <>
      {hasMusic && <section className={`music-sync-dock ${collapsed ? "collapsed" : ""}`} aria-label="Música sincronizada">
        <header><span><Music2 size={15} /><strong>{music.title || "Trilha da campanha"}</strong></span><button onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expandir player" : "Recolher player"}>{collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></header>
        <div className="youtube-player-host" ref={playerContainerRef} />
        <div className="sync-player-controls">
          {!audioEnabled ? <button className="enable-sync-audio" onClick={enableAudio} disabled={!ready}><Volume2 size={15} /> Ativar áudio sincronizado</button> : <>
            <div><span>{formatTime(position)}</span><input type="range" min="0" max={Math.max(1, duration)} step="1" value={Math.min(position, Math.max(1, duration))} disabled={!isGM} onChange={(event) => { const next = Number(event.target.value); setPosition(next); playerRef.current?.seekTo(next, true); }} onPointerUp={() => isGM && void onPlayback(music.playing, position)} onKeyUp={() => isGM && void onPlayback(music.playing, position)} /><span>{formatTime(duration)}</span></div>
            <div><button className="sync-play" onClick={() => isGM ? void togglePlayback() : applySharedPlayback(true)} title={isGM ? (music.playing ? "Pausar para todos" : "Tocar para todos") : "Ressincronizar"}>{music.playing ? <Pause size={16} /> : <Play size={16} />}</button><Volume2 size={14} /><input className="volume-slider" type="range" min="0" max="100" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); playerRef.current?.setVolume(next); }} /><small>{music.playing ? "Sincronizada" : "Pausada"}</small></div>
          </>}
        </div>
      </section>}

      {open && <div className="drawer-backdrop music-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <aside className="drawer music-drawer">
          <header><div><p className="eyebrow">Trilha da mesa</p><h2><Music2 size={19} /> Música da campanha</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
          <div className="music-content">
            {hasMusic ? <div className="music-shared-status"><Music2 /><div><strong>{music.title || "Trilha selecionada"}</strong><span>{music.playing ? "Tocando sincronizada para o grupo" : "Pausada pelo mestre"}</span></div></div> : <div className="music-empty"><Music2 /><strong>Nenhuma trilha selecionada</strong><span>O mestre pode adicionar um vídeo ou uma playlist do YouTube.</span></div>}
            <p className="music-note">Cada participante precisa clicar uma vez em “Ativar áudio sincronizado”. Depois, tocar, pausar e buscar são comandados pelo mestre para o grupo inteiro.</p>
            {isGM && <form className="music-form" onSubmit={submit}>
              <label>Nome da trilha<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Exploração da floresta" /></label>
              <label>Link do YouTube<input value={draft.youtubeUrl} onChange={(event) => setDraft({ ...draft, youtubeUrl: event.target.value })} placeholder="Vídeo ou playlist do YouTube" /></label>
              <label className="toggle-field"><input type="checkbox" checked={draft.loop} onChange={(event) => setDraft({ ...draft, loop: event.target.checked })} /><span><strong>Repetir a trilha</strong><small>Vídeos individuais e playlists podem tocar em loop.</small></span></label>
              {error && <p className="music-error">{error}</p>}
              <button className="primary-button full"><Save size={16} /> Salvar para a campanha</button>
            </form>}
          </div>
        </aside>
      </div>}
    </>
  );
}

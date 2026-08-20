"use client";

import { Music2, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CampaignMusic } from "@/lib/types";
import { parseYouTubeUrl } from "@/lib/youtube";

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
  music: CampaignMusic;
  isGM: boolean;
  onPlayback: (playing: boolean, position: number) => Promise<void>;
  /** Abre a guia de configuracao da trilha. */
  onOpen: () => void;
};

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MusicPlayer({ music, isGM, onPlayback, onOpen }: Props) {
  const [ready, setReady] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState(music.position);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(65);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const musicRef = useRef(music);
  const audioEnabledRef = useRef(audioEnabled);
  const playbackRef = useRef(onPlayback);
  const appliedPlayingRef = useRef<boolean | undefined>(undefined);
  const target = parseYouTubeUrl(music.youtubeUrl);

  useEffect(() => { musicRef.current = music; }, [music]);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => { playbackRef.current = onPlayback; }, [onPlayback]);

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
    const drift = Math.abs(current - nextPosition);
    if ((forceSeek && drift > 2.5) || (!forceSeek && drift > 6)) player.seekTo(nextPosition, true);
    player.setVolume(volume);
    if (appliedPlayingRef.current !== shared.playing) {
      appliedPlayingRef.current = shared.playing;
      if (shared.playing) player.playVideo(); else player.pauseVideo();
    }
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
      appliedPlayingRef.current = undefined;
      container.replaceChildren();
    };
    // Recria o player so quando a faixa ou o loop mudam: incluir as demais
    // dependencias reiniciaria a reproducao a cada ajuste de volume ou posicao.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.loop, music.youtubeUrl]);

  useEffect(() => {
    setPosition(synchronizedPosition(music));
    applySharedPlayback(true);
    // Reage apenas ao estado compartilhado pelo mestre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.playing, music.position, music.startedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const current = player.getCurrentTime() || 0;
      setPosition(current);
      setDuration(player.getDuration() || 0);
      if (audioEnabledRef.current && musicRef.current.playing && Math.abs(current - synchronizedPosition()) > 6) applySharedPlayback(false);
    }, 800);
    return () => window.clearInterval(timer);
    // O intervalo le tudo por referencia; recriar a cada render zeraria o relogio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <section className={"music-floating " + (expanded ? "expanded" : "")} aria-label="Música sincronizada" onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
        <button className={"music-orb " + (music.playing ? "is-playing" : "")} onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Recolher player" : "Abrir player"}>
          {music.playing ? <Pause size={20} /> : <Music2 size={20} />}<i />
        </button>
        <div className="music-mini-panel">
          <header><span><Music2 size={15} /><strong>{music.title || "Trilha da campanha"}</strong></span><small>{music.playing ? "Tocando para a mesa" : "Pausada"}</small></header>
          {hasMusic ? <><div className="youtube-player-host hidden-youtube-player" ref={playerContainerRef} />
          {!audioEnabled ? <button className="enable-sync-audio" onClick={enableAudio} disabled={!ready}><Volume2 size={15} /> Ativar áudio</button> : <div className="mini-player-controls">
            <div className="mini-track"><span>{formatTime(position)}</span><input type="range" min="0" max={Math.max(1, duration)} step="1" value={Math.min(position, Math.max(1, duration))} disabled={!isGM} onChange={(event) => { const nextPosition = Number(event.target.value); setPosition(nextPosition); playerRef.current?.seekTo(nextPosition, true); }} onPointerUp={() => isGM && void onPlayback(music.playing, position)} /><span>{formatTime(duration)}</span></div>
            <div className="mini-actions"><button className="sync-play" onClick={() => isGM ? void togglePlayback() : applySharedPlayback(true)}>{music.playing ? <Pause size={16} /> : <Play size={16} />}</button><Volume2 size={14} /><input className="volume-slider" type="range" min="0" max="100" value={volume} onChange={(event) => { const nextVolume = Number(event.target.value); setVolume(nextVolume); playerRef.current?.setVolume(nextVolume); }} />
            </div>
          </div>}</> : <button className="enable-sync-audio" onClick={onOpen}><Music2 size={15} /> {isGM ? "Escolher uma trilha" : "Nenhuma trilha selecionada"}</button>}
        </div>
      </section>

    </>
  );
}

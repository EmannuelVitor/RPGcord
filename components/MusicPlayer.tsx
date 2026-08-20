"use client";

import { LockKeyhole, Music2, Pause, Play, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CampaignMusic } from "@/lib/types";
import { musicDrift, synchronizedMusicPosition } from "@/lib/music-sync";
import { parseYouTubeUrl } from "@/lib/youtube";

type YTPlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
};

type YTApi = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
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
  youtubeApiPromise = new Promise<YTApi>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      youtubeApiPromise = undefined;
      reject(new Error("O YouTube demorou demais para responder."));
    }, 15000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (window.YT) resolve(window.YT);
      else reject(new Error("A API do YouTube não foi carregada."));
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        youtubeApiPromise = undefined;
        reject(new Error("Não foi possível conectar ao YouTube."));
      };
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

type Props = {
  music: CampaignMusic;
  isGM: boolean;
  onPlayback: (playing: boolean, position: number) => Promise<void>;
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
  const [playerError, setPlayerError] = useState<string>();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const apiRef = useRef<YTApi | undefined>(undefined);
  const musicRef = useRef(music);
  const audioEnabledRef = useRef(audioEnabled);
  const volumeRef = useRef(volume);
  const playbackRef = useRef(onPlayback);
  const recoveryTimerRef = useRef<number | undefined>(undefined);
  const target = parseYouTubeUrl(music.youtubeUrl);

  useEffect(() => { musicRef.current = music; }, [music]);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { playbackRef.current = onPlayback; }, [onPlayback]);

  function applySharedPlayback(forceSeek = false) {
    const player = playerRef.current;
    const api = apiRef.current;
    if (!player || !api || !audioEnabledRef.current) return;
    const shared = musicRef.current;
    const nextPosition = synchronizedMusicPosition(shared);
    const current = player.getCurrentTime() || 0;
    const drift = musicDrift(current, shared);
    if ((forceSeek && drift > 2) || (!forceSeek && drift > 5)) player.seekTo(nextPosition, true);
    player.setVolume(volumeRef.current);
    const state = player.getPlayerState();
    if (shared.playing) {
      if (state !== api.PlayerState.PLAYING && state !== api.PlayerState.BUFFERING) player.playVideo();
    } else if (state === api.PlayerState.PLAYING || state === api.PlayerState.BUFFERING) {
      player.pauseVideo();
    }
  }

  function scheduleRecovery() {
    window.clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current = window.setTimeout(() => applySharedPlayback(true), 450);
  }

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container || !target) return;
    let cancelled = false;
    setReady(false);
    setPlayerError(undefined);
    container.replaceChildren();
    const mount = document.createElement("div");
    container.appendChild(mount);
    void loadYouTubeApi().then((api) => {
      if (cancelled) return;
      apiRef.current = api;
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
            playerRef.current?.setVolume(volumeRef.current);
            setDuration(playerRef.current?.getDuration() || 0);
            applySharedPlayback(true);
          },
          onStateChange: (event: { data: number }) => {
            if (cancelled) return;
            const shared = musicRef.current;
            if (event.data === api.PlayerState.ENDED) {
              if (isGM && !shared.loop) void playbackRef.current(false, 0);
              else if (shared.playing) scheduleRecovery();
              return;
            }
            if (audioEnabledRef.current && shared.playing && (event.data === api.PlayerState.PAUSED || event.data === api.PlayerState.CUED)) scheduleRecovery();
          },
          onError: () => setPlayerError("O YouTube não conseguiu reproduzir esta trilha."),
        },
      });
    }).catch((cause) => {
      if (!cancelled) setPlayerError(cause instanceof Error ? cause.message : "Não foi possível carregar o player.");
    });
    return () => {
      cancelled = true;
      window.clearTimeout(recoveryTimerRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
      apiRef.current = undefined;
      container.replaceChildren();
    };
    // O player só deve ser recriado quando a faixa ou o loop mudarem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.loop, music.youtubeUrl]);

  useEffect(() => {
    setPosition(synchronizedMusicPosition(music));
    applySharedPlayback(true);
    // Reage somente ao relógio compartilhado pelo mestre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.playing, music.position, music.startedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      const api = apiRef.current;
      if (!player || !api) return;
      const current = player.getCurrentTime() || 0;
      setPosition(current);
      setDuration(player.getDuration() || 0);
      if (!audioEnabledRef.current) return;
      const shared = musicRef.current;
      const state = player.getPlayerState();
      if (shared.playing && (musicDrift(current, shared) > 5 || (state !== api.PlayerState.PLAYING && state !== api.PlayerState.BUFFERING))) applySharedPlayback(false);
      if (!shared.playing && (state === api.PlayerState.PLAYING || state === api.PlayerState.BUFFERING)) applySharedPlayback(false);
    }, 900);
    return () => window.clearInterval(timer);
    // O intervalo lê o estado mais recente pelas referências.
  }, []);

  async function togglePlayback() {
    const player = playerRef.current;
    if (!player || !isGM) return;
    const current = player.getCurrentTime() || synchronizedMusicPosition(musicRef.current);
    await onPlayback(!musicRef.current.playing, current);
  }

  function enableAudio() {
    const player = playerRef.current;
    if (!player) return;
    setAudioEnabled(true);
    audioEnabledRef.current = true;
    if (!musicRef.current.playing) {
      player.setVolume(0);
      player.playVideo();
      window.setTimeout(() => {
        if (!musicRef.current.playing) player.pauseVideo();
        player.setVolume(volumeRef.current);
      }, 120);
    } else {
      applySharedPlayback(true);
    }
  }

  const hasMusic = Boolean(target);

  return (
    <section className={"music-floating " + (expanded ? "expanded" : "")} aria-label="Música sincronizada">
      <button className={"music-orb " + (music.playing ? "is-playing" : "")} onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Recolher player" : "Abrir player"}>
        {music.playing ? <Pause size={20} /> : <Music2 size={20} />}<i />
      </button>
      <div className="music-mini-panel" aria-hidden={!expanded}>
        <header><span><Music2 size={15} /><strong>{music.title || "Trilha da campanha"}</strong></span><button onClick={() => setExpanded(false)} aria-label="Recolher player"><X size={14} /></button><small>{music.playing ? "Tocando para a mesa" : "Pausada"}</small></header>
        {hasMusic ? <><div className="youtube-player-host hidden-youtube-player" ref={playerContainerRef} />
          {playerError ? <div className="music-player-error"><span>{playerError}</span><button onClick={onOpen}>Revisar trilha</button></div> : !audioEnabled ? <button className="enable-sync-audio" onClick={enableAudio} disabled={!ready}><Volume2 size={15} /> {ready ? "Ativar áudio sincronizado" : "Carregando áudio…"}</button> : <div className="mini-player-controls">
            <div className="mini-track"><span>{formatTime(position)}</span><input aria-label="Posição da trilha" type="range" min="0" max={Math.max(1, duration)} step="1" value={Math.min(position, Math.max(1, duration))} disabled={!isGM} onChange={(event) => { const nextPosition = Number(event.target.value); setPosition(nextPosition); playerRef.current?.seekTo(nextPosition, true); }} onPointerUp={() => isGM && void onPlayback(musicRef.current.playing, position)} /><span>{formatTime(duration)}</span></div>
            <div className="mini-actions">{isGM ? <button className="sync-play" onClick={() => void togglePlayback()} aria-label={music.playing ? "Pausar para a mesa" : "Tocar para a mesa"}>{music.playing ? <Pause size={16} /> : <Play size={16} />}</button> : <span className="music-readonly"><LockKeyhole size={13} /> Controlado pelo mestre</span>}<Volume2 size={14} /><input aria-label="Volume local" className="volume-slider" type="range" min="0" max="100" value={volume} onChange={(event) => { const nextVolume = Number(event.target.value); setVolume(nextVolume); volumeRef.current = nextVolume; playerRef.current?.setVolume(nextVolume); }} /></div>
          </div>}</> : <button className="enable-sync-audio" onClick={onOpen} disabled={!isGM}><Music2 size={15} /> {isGM ? "Escolher uma trilha" : "Aguardando o mestre escolher a trilha"}</button>}
      </div>
    </section>
  );
}

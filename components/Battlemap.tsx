"use client";

import { Eraser, Eye, Grid3X3, Lightbulb, Minus, Plus, RotateCcw, SlidersHorizontal, Sun, Users, X } from "lucide-react";
import { PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import type { MapToken, Scene } from "@/lib/types";

type Props = {
  scene: Scene;
  tokens: MapToken[];
  userId: string;
  isGM: boolean;
  onMove: (tokenId: string, x: number, y: number) => void;
  onRevealArea: (x: number, y: number) => void;
  onClearRevealed: () => void;
  onMoveLight: (lightId: string, x: number, y: number) => void;
  onSetGlobalVision: (radius: number) => void;
  onSetTokenVision: (tokenId: string, radius?: number) => void;
};

export function Battlemap({ scene, tokens, userId, isGM, onMove, onRevealArea, onClearRevealed, onMoveLight, onSetGlobalVision, onSetTokenVision }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const fogMaskId = `fog-${useId().replace(/:/g, "")}`;
  const fogTextureId = `fog-texture-${useId().replace(/:/g, "")}`;
  const visionGradientId = `vision-${useId().replace(/:/g, "")}`;
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [revealMode, setRevealMode] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number }>();
  const [lightDrag, setLightDrag] = useState<{ id: string; x: number; y: number }>();
  const [visionControlsOpen, setVisionControlsOpen] = useState(false);
  const [selectedVisionTokenId, setSelectedVisionTokenId] = useState<string>();
  const [globalVisionDraft, setGlobalVisionDraft] = useState(scene.visionRadius ?? 14);
  const [individualVisionDraft, setIndividualVisionDraft] = useState(scene.visionRadius ?? 14);
  const [viewportSize, setViewportSize] = useState({ width: 900, height: 520 });
  const [imageSize, setImageSize] = useState({ width: 16, height: 9 });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setViewportSize({ width: Math.max(1, viewport.clientWidth), height: Math.max(1, viewport.clientHeight) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [scene.mapUrl, scene.mapFit]);

  useEffect(() => {
    setGlobalVisionDraft(scene.visionRadius ?? 14);
  }, [scene.visionRadius]);

  useEffect(() => {
    const selected = tokens.find((token) => token.id === selectedVisionTokenId);
    setIndividualVisionDraft(selected?.visionRadius ?? scene.visionRadius ?? 14);
  }, [scene.visionRadius, selectedVisionTokenId, tokens]);

  function positionFromEvent(event: PointerEvent) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(3, Math.min(97, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(5, Math.min(95, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, token: MapToken) {
    if (!isGM && token.ownerId !== userId) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id: token.id, ...positionFromEvent(event) });
  }

  function updateDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    setDrag({ id: drag.id, ...positionFromEvent(event) });
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    event.stopPropagation();
    const next = positionFromEvent(event);
    onMove(drag.id, next.x, next.y);
    setDrag(undefined);
  }

  function startLightDrag(event: PointerEvent<HTMLButtonElement>, lightId: string) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setLightDrag({ id: lightId, ...positionFromEvent(event) });
  }

  function updateLightDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!lightDrag) return;
    setLightDrag({ id: lightDrag.id, ...positionFromEvent(event) });
  }

  function endLightDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!lightDrag) return;
    event.stopPropagation();
    const next = positionFromEvent(event);
    onMoveLight(lightDrag.id, next.x, next.y);
    setLightDrag(undefined);
  }

  function revealFromEvent(event: PointerEvent<HTMLDivElement>) {
    if (!isGM || !scene.fogEnabled || !revealMode) return;
    const point = positionFromEvent(event);
    onRevealArea(point.x, point.y);
  }

  const visionRadius = scene.visionRadius ?? 14;
  const revealedAreas = scene.revealedAreas ?? [];
  const dynamicLights = scene.dynamicLights ?? [];
  const mapSize = useMemo(() => {
    if (!scene.mapUrl || scene.mapFit === "stretch") {
      return { width: viewportSize.width * zoom, height: viewportSize.height * zoom };
    }
    const fitScale = scene.mapFit === "cover"
      ? Math.max(viewportSize.width / imageSize.width, viewportSize.height / imageSize.height)
      : Math.min(viewportSize.width / imageSize.width, viewportSize.height / imageSize.height);
    return {
      width: Math.max(1, imageSize.width * fitScale * zoom),
      height: Math.max(1, imageSize.height * fitScale * zoom),
    };
  }, [imageSize.height, imageSize.width, scene.mapFit, scene.mapUrl, viewportSize.height, viewportSize.width, zoom]);
  const stageSize = {
    width: Math.max(viewportSize.width, mapSize.width),
    height: Math.max(viewportSize.height, mapSize.height),
  };

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const frame = window.requestAnimationFrame(() => {
      scroller.scrollTo({
        left: Math.max(0, (stageSize.width - scroller.clientWidth) / 2),
        top: Math.max(0, (stageSize.height - scroller.clientHeight) / 2),
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stageSize.height, stageSize.width]);

  return (
    <section className="map-card panel">
      <header className="panel-header map-header">
        <div>
          <p className="eyebrow">Cena ativa</p>
          <h2>{scene.name}</h2>
        </div>
        <div className="map-meta">
          <span><Users size={15} /> {tokens.filter((token) => token.kind === "hero").length} aventureiros</span>
          <span className="live-dot"><i /> sincronizado</span>
        </div>
      </header>

      <div className="map-viewport" ref={viewportRef}>
        <div className="map-scroll" ref={scrollRef}>
          <div className="map-stage" style={{ width: stageSize.width, height: stageSize.height }}>
          <div
            ref={mapRef}
            className={`battle-map ${showGrid ? "has-grid" : ""} ${scene.mapUrl ? "has-image" : ""} ${revealMode ? "reveal-mode" : ""}`}
            onPointerUp={revealFromEvent}
            style={{
              width: mapSize.width,
              height: mapSize.height,
              "--grid-size": `${Math.max(8, scene.gridSize * zoom)}px`,
            } as React.CSSProperties}
          >
          {scene.mapUrl && <img
            className="map-image"
            src={scene.mapUrl}
            alt="Mapa da cena"
            draggable={false}
            onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth || 16, height: event.currentTarget.naturalHeight || 9 })}
          />}
          {!scene.mapUrl && (
            <div className="demo-terrain" aria-hidden="true">
              <span className="ruin ruin-one" /><span className="ruin ruin-two" />
              <span className="pool" /><span className="trail" />
              <span className="tree-cluster trees-one">♠ ♠ ♠</span>
              <span className="tree-cluster trees-two">♠ ♠</span>
              <span className="compass">N<span>✦</span></span>
            </div>
          )}
          {dynamicLights.some((light) => light.enabled) && <svg className="light-glows" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>{dynamicLights.filter((light) => light.enabled).map((light) => <radialGradient id={`glow-${light.id}`} key={light.id}><stop offset="0%" stopColor={light.color} stopOpacity={Math.min(.7, light.intensity * .65)} /><stop offset="55%" stopColor={light.color} stopOpacity={light.intensity * .22} /><stop offset="100%" stopColor={light.color} stopOpacity="0" /></radialGradient>)}</defs>
            {dynamicLights.filter((light) => light.enabled).map((light) => {
              const position = lightDrag?.id === light.id ? lightDrag : light;
              return <circle key={light.id} cx={position.x} cy={position.y} r={light.radius} fill={`url(#glow-${light.id})`} />;
            })}
          </svg>}
          {tokens.map((token) => {
            const display = drag?.id === token.id ? drag : token;
            const canMove = isGM || token.ownerId === userId;
            return (
              <button
                className={`map-token ${token.kind} ${drag?.id === token.id ? "dragging" : ""}`}
                key={token.id}
                style={{ left: `${display.x}%`, top: `${display.y}%`, "--token-color": token.color } as React.CSSProperties}
                onPointerDown={(event) => startDrag(event, token)}
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
                onClick={(event) => {
                  if (isGM && token.kind === "hero") {
                    event.stopPropagation();
                    setSelectedVisionTokenId(token.id);
                    setVisionControlsOpen(true);
                  }
                }}
                title={`${token.name}${canMove ? " — arraste para mover" : ""}`}
                aria-label={token.name}
              >
                {token.imageUrl ? <img src={token.imageUrl} alt="" draggable={false} /> : token.initials}
                <span>{token.name}</span>
              </button>
            );
          })}
          {scene.fogEnabled && (
            <svg className={`fog-of-war ${isGM ? "gm-fog" : ""}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <radialGradient id={visionGradientId}><stop offset="0%" stopColor="#000" /><stop offset="58%" stopColor="#000" /><stop offset="82%" stopColor="#777" /><stop offset="100%" stopColor="#fff" /></radialGradient>
                {dynamicLights.filter((light) => light.enabled).map((light) => {
                  const centerShade = Math.round(255 * (1 - light.intensity));
                  return <radialGradient id={`light-mask-${light.id}`} key={light.id}><stop offset="0%" stopColor={`rgb(${centerShade},${centerShade},${centerShade})`} /><stop offset="55%" stopColor={`rgb(${centerShade},${centerShade},${centerShade})`} /><stop offset="82%" stopColor="#777" /><stop offset="100%" stopColor="#fff" /></radialGradient>;
                })}
                <mask id={fogMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100" style={{ maskType: "luminance" }}>
                  <rect className="fog-mask-base" width="100" height="100" fill="#fff" />
                  {tokens.filter((token) => token.kind === "hero").map((token) => {
                    const display = drag?.id === token.id ? drag : token;
                    return <circle key={`hero-${token.id}`} cx={display.x} cy={display.y} r={token.visionRadius ?? visionRadius} fill={`url(#${visionGradientId})`} />;
                  })}
                  {revealedAreas.map((area) => <circle key={area.id} cx={area.x} cy={area.y} r={area.radius} fill={`url(#${visionGradientId})`} />)}
                  {dynamicLights.filter((light) => light.enabled).map((light) => {
                    const position = lightDrag?.id === light.id ? lightDrag : light;
                    return <circle key={`light-${light.id}`} cx={position.x} cy={position.y} r={light.radius} fill={`url(#light-mask-${light.id})`} />;
                  })}
                </mask>
                <filter id={fogTextureId} x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="17" />
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .32 0" />
                </filter>
              </defs>
              <rect className="fog-overlay" width="100" height="100" mask={`url(#${fogMaskId})`} />
              <rect className="fog-texture" width="100" height="100" mask={`url(#${fogMaskId})`} filter={`url(#${fogTextureId})`} />
            </svg>
          )}
          {isGM && dynamicLights.map((light) => {
            const position = lightDrag?.id === light.id ? lightDrag : light;
            return <button
              className={`map-light-marker ${light.enabled ? "enabled" : "disabled"}`}
              key={`marker-${light.id}`}
              style={{ left: `${position.x}%`, top: `${position.y}%`, "--light-color": light.color } as React.CSSProperties}
              onPointerDown={(event) => startLightDrag(event, light.id)}
              onPointerMove={updateLightDrag}
              onPointerUp={endLightDrag}
              title={`${light.name} — arraste para mover`}
              aria-label={light.name}
            ><Lightbulb size={14} /><span>{light.name}</span></button>;
          })}
          </div>
          </div>
        </div>

        <div className="map-tools" aria-label="Controles do mapa">
          <button onClick={() => setZoom((value) => Math.max(.5, Number((value - .1).toFixed(1))))} aria-label="Diminuir zoom"><Minus size={17} /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(3, Number((value + .1).toFixed(1))))} aria-label="Aumentar zoom"><Plus size={17} /></button>
          <i />
          <button className={showGrid ? "active" : ""} onClick={() => setShowGrid((value) => !value)} aria-label="Alternar grade"><Grid3X3 size={17} /></button>
          <button onClick={() => setZoom(1)} aria-label="Restaurar visualização"><RotateCcw size={16} /></button>
          {isGM && scene.fogEnabled && <><i /><button className={revealMode ? "active reveal-active" : ""} onClick={() => setRevealMode((value) => !value)} aria-label="Revelar uma área" title="Revelar uma área"><Sun size={17} /></button><button onClick={onClearRevealed} aria-label="Apagar áreas reveladas" title="Apagar áreas reveladas"><Eraser size={16} /></button></>}
          {isGM && scene.fogEnabled && <button className={visionControlsOpen ? "active" : ""} onClick={() => setVisionControlsOpen((value) => !value)} aria-label="Controlar visão dos jogadores" title="Controlar visão dos jogadores"><SlidersHorizontal size={16} /></button>}
        </div>
        {isGM && scene.fogEnabled && visionControlsOpen && <div className="fog-live-controls">
          <header><div><SlidersHorizontal size={15} /><strong>Visão em tempo real</strong></div><button onClick={() => setVisionControlsOpen(false)} aria-label="Fechar controles"><X size={15} /></button></header>
          <label><span>Todos os jogadores <b>{globalVisionDraft}%</b></span><input type="range" min="3" max="45" value={globalVisionDraft} onChange={(event) => setGlobalVisionDraft(Number(event.target.value))} onPointerUp={() => onSetGlobalVision(globalVisionDraft)} onKeyUp={() => onSetGlobalVision(globalVisionDraft)} /></label>
          {selectedVisionTokenId ? (() => {
            const selected = tokens.find((token) => token.id === selectedVisionTokenId && token.kind === "hero");
            if (!selected) return null;
            return <div className="individual-vision"><p><span className="mini-token" style={{ background: selected.color }}>{selected.initials}</span><strong>{selected.name}</strong><button onClick={() => { setIndividualVisionDraft(globalVisionDraft); onSetTokenVision(selected.id, undefined); }}>Usar global</button></p><label><span>Visão individual <b>{individualVisionDraft}%</b></span><input type="range" min="3" max="45" value={individualVisionDraft} onChange={(event) => setIndividualVisionDraft(Number(event.target.value))} onPointerUp={() => onSetTokenVision(selected.id, individualVisionDraft)} onKeyUp={() => onSetTokenVision(selected.id, individualVisionDraft)} /></label></div>;
          })() : <p className="select-token-hint">Clique no pino de um jogador para ajustar apenas a visão dele.</p>}
        </div>}
        <div className="map-hint">{revealMode ? <><Sun size={14} /> Clique no mapa para revelar uma área</> : <><Eye size={14} /> Arraste seu pino para se mover</>}</div>
      </div>
    </section>
  );
}

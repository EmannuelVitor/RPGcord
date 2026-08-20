"use client";

import { Eraser, Eye, Lightbulb, Lock, Minus, Plus, RotateCcw, ScrollText, Shield, SlidersHorizontal, Sun, Swords, Tag, Trash2, Unlock, Users, X } from "lucide-react";
import { FormEvent, MouseEvent as ReactMouseEvent, PointerEvent, WheelEvent, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { NAME_DISPLAY_MODES, NAME_DISPLAY_STORAGE_KEY, composeName, isNameDisplayMode, type NameDisplayMode } from "@/lib/display-name";
import type { CampaignMember, LightSource, MapToken, Scene } from "@/lib/types";

type Props = {
  scene: Scene; tokens: MapToken[]; participants?: CampaignMember[]; userId: string; isGM: boolean; hasCharacter?: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onToggleTokenLock?: (id: string) => void;
  onRequestCharacter?: () => void;
  onRevealArea: (x: number, y: number) => void; onClearRevealed: () => void;
  onMoveLight: (id: string, x: number, y: number) => void;
  onCreateLight: (light: LightSource) => void; onUpdateLight: (light: LightSource) => void; onDeleteLight: (id: string) => void;
  onSetGlobalVision: (radius: number) => void; onSetTokenVision: (id: string, radius?: number) => void;
};
type LightEditor = { mode: "create" | "edit"; light: LightSource; left: number; top: number };
const dim = (light: LightSource) => Math.max(3, light.dimRadius ?? light.radius ?? 16);
const bright = (light: LightSource) => Math.max(1, Math.min(dim(light), light.brightRadius ?? dim(light) * .5));

export function Battlemap(props: Props) {
  const { scene, tokens, participants = [], userId, isGM, hasCharacter = true, onMove, onToggleTokenLock = () => undefined, onRequestCharacter = () => undefined, onRevealArea, onClearRevealed, onMoveLight, onCreateLight, onUpdateLight, onDeleteLight, onSetGlobalVision, onSetTokenVision } = props;
  const viewportRef = useRef<HTMLDivElement>(null), scrollRef = useRef<HTMLDivElement>(null), mapRef = useRef<HTMLDivElement>(null);
  const fogId = "fog-" + useId().replace(/:/g, ""), visionId = "vision-" + useId().replace(/:/g, "");
  const [zoom, setZoom] = useState(1), zoomRef = useRef(1), zoomTarget = useRef(1), zoomFrame = useRef<number | undefined>(undefined);
  const [revealMode, setRevealMode] = useState(false), [lightMode, setLightMode] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number }>(), [lightDrag, setLightDrag] = useState<{ id: string; x: number; y: number }>();
  const [editor, setEditor] = useState<LightEditor>(), [panning, setPanning] = useState(false);
  const pan = useRef<{ id: number; x: number; y: number; left: number; top: number } | undefined>(undefined), panMoved = useRef(false), lightMoved = useRef(false);
  const [visionOpen, setVisionOpen] = useState(false), [selectedToken, setSelectedToken] = useState<string>();
  const [gateHelp, setGateHelp] = useState(false);
  const [nameMode, setNameMode] = useState<NameDisplayMode>("both");
  const [tokenCard, setTokenCard] = useState<{ id: string; left: number; top: number }>();
  const tokenMoved = useRef(false), tokenOrigin = useRef<{ x: number; y: number } | undefined>(undefined);
  const [globalVision, setGlobalVision] = useState(scene.visionRadius ?? 14), [individualVision, setIndividualVision] = useState(scene.visionRadius ?? 14);
  const [viewport, setViewport] = useState({ width: 900, height: 520 }), [image, setImage] = useState({ width: 16, height: 9 });
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>();
  const zoomAnchor = useRef<{ x: number; y: number; mapX: number; mapY: number } | undefined>(undefined);

  useEffect(() => {
    const node = viewportRef.current; if (!node) return;
    const measure = () => setViewport({ width: Math.max(1, node.clientWidth), height: Math.max(1, node.clientHeight) });
    measure(); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect();
  }, []);
  /** Tamanho do mapa a 100% de zoom. Le a janela direto do DOM para nao depender do estado. */
  const refit = useCallback(() => {
    const node = viewportRef.current;
    const width = Math.max(1, node?.clientWidth ?? 900), height = Math.max(1, node?.clientHeight ?? 520);
    if (!scene.mapUrl || scene.mapFit === "stretch") { setBaseSize({ width, height }); return; }
    const fit = scene.mapFit === "cover"
      ? Math.max(width / image.width, height / image.height)
      : Math.min(width / image.width, height / image.height);
    setBaseSize({ width: image.width * fit, height: image.height * fit });
  }, [image, scene.mapFit, scene.mapUrl]);
  useEffect(() => refit(), [refit]);
  useEffect(() => {
    if (zoomFrame.current) cancelAnimationFrame(zoomFrame.current);
    zoomRef.current = zoomTarget.current = 1; setZoom(1);
    requestAnimationFrame(() => { const s = scrollRef.current; if (s) s.scrollTo((s.scrollWidth - s.clientWidth) / 2, (s.scrollHeight - s.clientHeight) / 2); });
  }, [scene.mapUrl, scene.mapFit]);
  useEffect(() => () => { if (zoomFrame.current) cancelAnimationFrame(zoomFrame.current); }, []);
  useEffect(() => {
    const stored = window.localStorage.getItem(NAME_DISPLAY_STORAGE_KEY);
    if (isNameDisplayMode(stored)) setNameMode(stored);
  }, []);
  useEffect(() => setGlobalVision(scene.visionRadius ?? 14), [scene.visionRadius]);
  useEffect(() => { const token = tokens.find((item) => item.id === selectedToken); setIndividualVision(token?.visionRadius ?? scene.visionRadius ?? 14); }, [tokens, selectedToken, scene.visionRadius]);

  function point(event: { clientX: number; clientY: number }) {
    const rect = mapRef.current?.getBoundingClientRect(); if (!rect) return { x: 50, y: 50 };
    return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
  }
  function constrainTokenPoint(value: { x: number; y: number }) {
    const bounds = scene.movementBounds;
    if (isGM || !bounds?.enabled) return value;
    return {
      x: Math.max(bounds.left, Math.min(bounds.right, value.x)),
      y: Math.max(bounds.top, Math.min(bounds.bottom, value.y)),
    };
  }
  function changeZoom(target: number, x?: number, y?: number) {
    const scroller = scrollRef.current, map = mapRef.current; if (!scroller || !map) return;
    const end = Math.max(.5, Math.min(3, target)); zoomTarget.current = end;
    if (zoomFrame.current) cancelAnimationFrame(zoomFrame.current);
    const start = zoomRef.current, time = performance.now(), before = map.getBoundingClientRect();
    void scroller;
    const focusX = x ?? before.left + before.width / 2, focusY = y ?? before.top + before.height / 2;
    const mapX = Math.max(0, Math.min(1, (focusX - before.left) / before.width)), mapY = Math.max(0, Math.min(1, (focusY - before.top) / before.height));
    zoomAnchor.current = { x: focusX, y: focusY, mapX, mapY };
    const tick = (now: number) => {
      const progress = Math.min(1, (now - time) / 190), ease = 1 - Math.pow(1 - progress, 3), value = start + (end - start) * ease;
      zoomRef.current = value; setZoom(value);
      if (progress < 1) zoomFrame.current = requestAnimationFrame(tick);
      else zoomAnchor.current = undefined;
    };
    zoomFrame.current = requestAnimationFrame(tick);
  }
  // Mantem sob o cursor o mesmo ponto do mapa enquanto o zoom anima.
  useLayoutEffect(() => {
    const anchor = zoomAnchor.current, scroller = scrollRef.current, map = mapRef.current;
    if (!anchor || !scroller || !map) return;
    const rect = map.getBoundingClientRect();
    scroller.scrollLeft += rect.left + rect.width * anchor.mapX - anchor.x;
    scroller.scrollTop += rect.top + rect.height * anchor.mapY - anchor.y;
  }, [zoom]);

  function wheel(event: WheelEvent<HTMLDivElement>) { event.preventDefault(); changeZoom(zoomTarget.current * Math.exp(-event.deltaY * .0015), event.clientX, event.clientY); }
  function panStart(event: PointerEvent<HTMLDivElement>) {
    if (revealMode || lightMode || (event.target as HTMLElement).closest("button,input,textarea,select")) return;
    const s = scrollRef.current; if (!s || ![0, 1, 2].includes(event.button)) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); panMoved.current = false;
    pan.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: s.scrollLeft, top: s.scrollTop }; setPanning(true);
  }
  function panMove(event: PointerEvent<HTMLDivElement>) {
    const start = pan.current, s = scrollRef.current; if (!start || !s || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y; if (Math.abs(dx) + Math.abs(dy) > 3) panMoved.current = true;
    s.scrollLeft = start.left - dx; s.scrollTop = start.top - dy;
  }
  function panEnd(event: PointerEvent<HTMLDivElement>) { if (pan.current?.id !== event.pointerId) return; pan.current = undefined; setPanning(false); setTimeout(() => { panMoved.current = false; }, 0); }

  function tokenStart(event: PointerEvent<HTMLButtonElement>, token: MapToken) {
    if (token.locked || (!isGM && token.ownerId !== userId)) return;
    event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    tokenMoved.current = false; tokenOrigin.current = { x: event.clientX, y: event.clientY }; setTokenCard(undefined);
    setDrag({ id: token.id, ...constrainTokenPoint(point(event)) });
  }
  function tokenEnd(event: PointerEvent<HTMLButtonElement>) { if (!drag) return; event.stopPropagation(); const p = constrainTokenPoint(point(event)); onMove(drag.id, p.x, p.y); setDrag(undefined); }
  function lightStart(event: PointerEvent<HTMLButtonElement>, id: string) { event.stopPropagation(); lightMoved.current = false; event.currentTarget.setPointerCapture(event.pointerId); setLightDrag({ id, ...point(event) }); }
  function lightEnd(event: PointerEvent<HTMLButtonElement>) { if (!lightDrag) return; event.stopPropagation(); const p = point(event); if (lightMoved.current) onMoveLight(lightDrag.id, p.x, p.y); setLightDrag(undefined); }
  function popover(x: number, y: number) {
    const rect = viewportRef.current?.getBoundingClientRect(); if (!rect) return { left: 8, top: 55 };
    return { left: Math.max(8, Math.min(rect.width - 328, x - rect.left + 12)), top: Math.max(54, Math.min(rect.height - 335, y - rect.top + 12)) };
  }
  function editLight(event: ReactMouseEvent<HTMLButtonElement>, light: LightSource) {
    if (lightMoved.current) return; event.stopPropagation(); setEditor({ mode: "edit", light: { ...light, brightRadius: bright(light), dimRadius: dim(light) }, ...popover(event.clientX, event.clientY) });
  }
  function mapClick(event: PointerEvent<HTMLDivElement>) {
    if (panMoved.current) return; setTokenCard(undefined); const p = point(event);
    if (isGM && lightMode) setEditor({ mode: "create", light: { id: crypto.randomUUID(), name: "Nova luz", ...p, brightRadius: 8, dimRadius: 16, intensity: .85, color: "#ffd27a", enabled: true }, ...popover(event.clientX, event.clientY) });
    else if (isGM && scene.fogEnabled && revealMode) onRevealArea(p.x, p.y);
  }
  function saveLight(event: FormEvent) {
    event.preventDefault(); if (!editor) return;
    const light = { ...editor.light, dimRadius: dim(editor.light), brightRadius: bright(editor.light) };
    editor.mode === "create" ? onCreateLight(light) : onUpdateLight(light); setEditor(undefined); setLightMode(false);
  }

  function playerNameOf(token: MapToken) {
    if (token.kind !== "hero") return undefined;
    return participants.find((member) => member.userId === token.ownerId)?.name;
  }
  function labelOf(token: MapToken) {
    return composeName(token.name, playerNameOf(token), nameMode);
  }
  function fullNameOf(token: MapToken) {
    return composeName(token.name, playerNameOf(token), "both") || token.name;
  }

  const storedLights = scene.dynamicLights ?? [], vision = scene.visionRadius ?? 14;
  // Esc desfaz a camada aberta mais recente antes de sair dos modos de edicao.
  useEscapeKey(useCallback(() => {
    if (editor) { setEditor(undefined); return; }
    if (tokenCard) { setTokenCard(undefined); return; }
    if (visionOpen) { setVisionOpen(false); return; }
    if (lightMode || revealMode) { setLightMode(false); setRevealMode(false); }
  }, [editor, lightMode, revealMode, tokenCard, visionOpen]), isGM || Boolean(tokenCard));

  const lights = useMemo(() => {
    if (!editor) return storedLights;
    const preview = { ...editor.light, dimRadius: dim(editor.light), brightRadius: bright(editor.light) };
    return editor.mode === "create" ? [...storedLights, preview] : storedLights.map((light) => light.id === preview.id ? preview : light);
  }, [editor, storedLights]);
  const visibleHeroTokens = tokens.filter((token) => token.kind === "hero" && (isGM || scene.visionMode !== "individual" || token.ownerId === userId));
  const glowDefs = useMemo(() => lights.filter((light) => light.enabled).map((light) =>
    <radialGradient id={"glow-" + light.id} key={light.id}><stop offset="0%" stopColor={light.color} stopOpacity={light.intensity * .75} /><stop offset={bright(light) / dim(light) * 100 + "%"} stopColor={light.color} stopOpacity={light.intensity * .45} /><stop offset="100%" stopColor={light.color} stopOpacity="0" /></radialGradient>), [lights]);
  const fogDefs = useMemo(() => <><radialGradient id={visionId}><stop offset="0%" stopColor="#000" /><stop offset="58%" stopColor="#000" /><stop offset="82%" stopColor="#777" /><stop offset="100%" stopColor="#fff" /></radialGradient>{lights.filter((light) => light.enabled).map((light) => { const shade = Math.round(255 * (1 - light.intensity)); return <radialGradient id={"mask-" + light.id} key={light.id}><stop offset="0%" stopColor={"rgb(" + shade + "," + shade + "," + shade + ")"} /><stop offset={bright(light) / dim(light) * 100 + "%"} stopColor={"rgb(" + shade + "," + shade + "," + shade + ")"} /><stop offset="100%" stopColor="#fff" /></radialGradient>; })}</>, [lights, visionId]);

  const mapSize = useMemo(() => ({
    width: (baseSize?.width ?? viewport.width) * zoom,
    height: (baseSize?.height ?? viewport.height) * zoom,
  }), [baseSize, viewport.height, viewport.width, zoom]);
  const stage = { width: Math.max(viewport.width, mapSize.width), height: Math.max(viewport.height, mapSize.height) };
  // A nevoa e os brilhos usam um viewBox proporcional ao mapa: sem isso, raios iguais
  // viram elipses em mapas que nao sao quadrados.
  const aspect = Math.max(.2, Math.min(5, mapSize.height / Math.max(1, mapSize.width)));
  const overlayHeight = 100 * aspect;

  return <section className="map-card panel">
    <header className="panel-header map-header"><div><p className="eyebrow">Cena ativa</p><h2>{scene.name}</h2></div><div className="map-meta"><span><Users size={15} /> {tokens.filter((token) => token.kind === "hero").length} aventureiros</span><span className="live-dot"><i /> sincronizado</span></div></header>
    <div className="map-viewport" ref={viewportRef}>
      <div className={"map-scroll " + (panning ? "is-panning" : "")} ref={scrollRef} onWheel={wheel} onPointerDown={panStart} onPointerMove={panMove} onPointerUp={panEnd} onPointerCancel={panEnd} onContextMenu={(event) => event.preventDefault()}>
        <div className="map-stage" style={stage}><div ref={mapRef} className={"battle-map " + (scene.gridEnabled ? "has-grid " : "") + (revealMode ? "reveal-mode " : "") + (lightMode ? "light-placement-mode" : "")} onPointerUp={mapClick} style={{ ...mapSize, "--grid-size": Math.max(4, (scene.gridSize || 48) * zoom) + "px" } as React.CSSProperties}>
          {scene.mapUrl ? <img className="map-image" src={scene.mapUrl} alt="Mapa da cena" draggable={false} onLoad={(event) => setImage({ width: event.currentTarget.naturalWidth || 16, height: event.currentTarget.naturalHeight || 9 })} /> : <div className="demo-terrain" />}
          {lights.some((light) => light.enabled) && <svg className="light-glows" viewBox={"0 0 100 " + overlayHeight} preserveAspectRatio="none"><defs>{glowDefs}</defs>{lights.filter((light) => light.enabled).map((light) => { const p = lightDrag?.id === light.id ? lightDrag : light; return <circle key={light.id} cx={p.x} cy={p.y * aspect} r={dim(light)} fill={"url(#glow-" + light.id + ")"} />; })}</svg>}
          {tokens.map((token) => { const p = drag?.id === token.id ? drag : token; const canControl = isGM || token.ownerId === userId; const label = labelOf(token); return <button className={"map-token " + token.kind + (token.locked ? " locked" : "") + (drag?.id === token.id ? " dragging" : "")} key={token.id} style={{ left: p.x + "%", top: p.y + "%", "--token-color": token.color } as React.CSSProperties} onPointerDown={(event) => tokenStart(event, token)} onPointerMove={(event) => { if (!drag) return; const origin = tokenOrigin.current; if (origin && Math.abs(event.clientX - origin.x) + Math.abs(event.clientY - origin.y) > 3) tokenMoved.current = true; setDrag({ id: drag.id, ...constrainTokenPoint(point(event)) }); }} onPointerUp={tokenEnd} onDoubleClick={(event) => { if (canControl) { event.stopPropagation(); onToggleTokenLock(token.id); } }} onClick={(event) => { if (tokenMoved.current) return; event.stopPropagation(); if (token.kind === "hero") setSelectedToken(token.id); setTokenCard({ id: token.id, ...popover(event.clientX, event.clientY) }); }} title={fullNameOf(token) + (canControl ? " · duplo clique para " + (token.locked ? "desbloquear" : "bloquear") : "")}>{token.imageUrl ? <img src={token.imageUrl} alt="" draggable={false} /> : token.initials}{token.locked ? <Lock className="token-lock-icon" size={12} /> : null}{label ? <span>{label}</span> : null}</button>; })}
          {scene.fogEnabled && <svg className={"fog-of-war " + (isGM ? "gm-fog" : "")} viewBox={"0 0 100 " + overlayHeight} preserveAspectRatio="none"><defs>{fogDefs}<mask id={fogId}><rect width="100" height={overlayHeight} fill="#fff" /><g style={{ isolation: "isolate" }}>{visibleHeroTokens.map((token) => { const p = drag?.id === token.id ? drag : token; return <circle key={token.id} cx={p.x} cy={p.y * aspect} r={token.visionRadius ?? vision} fill={"url(#" + visionId + ")"} style={{ mixBlendMode: "multiply" }} />; })}{(scene.revealedAreas ?? []).map((area) => <circle key={area.id} cx={area.x} cy={area.y * aspect} r={area.radius} fill={"url(#" + visionId + ")"} style={{ mixBlendMode: "multiply" }} />)}{lights.filter((light) => light.enabled).map((light) => { const p = lightDrag?.id === light.id ? lightDrag : light; return <circle key={light.id} cx={p.x} cy={p.y * aspect} r={dim(light)} fill={"url(#mask-" + light.id + ")"} style={{ mixBlendMode: "multiply" }} />; })}</g></mask></defs><rect className="fog-overlay" width="100" height={overlayHeight} mask={"url(#" + fogId + ")"} style={{ opacity: Math.max(.15, 1 - (scene.ambientLight ?? 0) * .8) }} /></svg>}
          {isGM && storedLights.map((light) => { const p = lightDrag?.id === light.id ? lightDrag : light; return <button className={"map-light-marker " + (light.enabled ? "enabled" : "disabled")} key={light.id} style={{ left: p.x + "%", top: p.y + "%", "--light-color": light.color } as React.CSSProperties} onPointerDown={(event) => lightStart(event, light.id)} onPointerMove={(event) => { if (lightDrag) { lightMoved.current = true; setLightDrag({ id: lightDrag.id, ...point(event) }); } }} onPointerUp={lightEnd} onClick={(event) => editLight(event, light)}><Lightbulb size={14} /><span>{light.name}</span></button>; })}
          {isGM && editor?.mode === "create" ? <span className={"map-light-marker preview " + (editor.light.enabled ? "enabled" : "disabled")} style={{ left: editor.light.x + "%", top: editor.light.y + "%", "--light-color": editor.light.color } as React.CSSProperties}><Lightbulb size={14} /><span>{editor.light.name}</span></span> : null}
          {isGM && scene.movementBounds?.enabled ? <div className="movement-boundary" style={{ left: scene.movementBounds.left + "%", top: scene.movementBounds.top + "%", right: (100 - scene.movementBounds.right) + "%", bottom: (100 - scene.movementBounds.bottom) + "%" }}><span>Limite de movimento</span></div> : null}
        </div></div>
      </div>

      <div className="map-tools"><button onClick={() => changeZoom(zoomTarget.current - .2)} aria-label="Reduzir zoom"><Minus size={17} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => changeZoom(zoomTarget.current + .2)} aria-label="Aumentar zoom"><Plus size={17} /></button><button onClick={() => { refit(); changeZoom(1); }} title="Reenquadrar o mapa na janela"><RotateCcw size={16} /></button><i /><label className="map-name-mode" title="Exibição de nomes nos pinos"><Tag size={15} /><select value={nameMode} aria-label="Exibição de nomes nos pinos" onChange={(event) => { const value = event.target.value as NameDisplayMode; setNameMode(value); window.localStorage.setItem(NAME_DISPLAY_STORAGE_KEY, value); }}>{NAME_DISPLAY_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{isGM && <><i /><button className={lightMode ? "active light-tool-active" : ""} onClick={() => { setLightMode(!lightMode); setRevealMode(false); setEditor(undefined); }} title="Criar ponto de luz"><Lightbulb size={16} /></button></>}{isGM && scene.fogEnabled && <><button className={revealMode ? "active reveal-active" : ""} onClick={() => { setRevealMode(!revealMode); setLightMode(false); }}><Sun size={17} /></button><button onClick={onClearRevealed}><Eraser size={16} /></button><button className={visionOpen ? "active" : ""} onClick={() => setVisionOpen(!visionOpen)}><SlidersHorizontal size={16} /></button></>}</div>
      {!hasCharacter ? <div className="character-map-gate"><div><ScrollText size={28} /><h3>Crie sua ficha para entrar no mapa</h3><p>{gateHelp ? "Ainda não encontramos uma ficha nesta campanha. Abra a ficha, informe o nome da personagem e salve; o pino será criado automaticamente." : "Seu pino só aparece e pode se mover depois que uma ficha for salva nesta campanha."}</p><button className="primary-button" onClick={onRequestCharacter}>Criar minha ficha</button><button className="text-button" onClick={() => setGateHelp(true)}>Minha personagem já foi criada</button></div></div> : null}

      {editor && <form className="light-config-popover" style={{ left: editor.left, top: editor.top }} onSubmit={saveLight} onPointerDown={(event) => event.stopPropagation()}><header><div><Lightbulb size={16} /><strong>{editor.mode === "create" ? "Confirmar nova luz" : "Editar fonte de luz"}</strong><em className="light-preview-tag">pré-visualização ao vivo</em></div><button type="button" onClick={() => setEditor(undefined)}><X size={15} /></button></header><label>Nome<input value={editor.light.name} onChange={(event) => setEditor({ ...editor, light: { ...editor.light, name: event.target.value } })} /></label><div className="light-popover-grid"><label>Luz intensa <b>{Math.round(bright(editor.light))}%</b><input type="range" min="1" max={dim(editor.light)} value={bright(editor.light)} onChange={(event) => setEditor({ ...editor, light: { ...editor.light, brightRadius: Number(event.target.value) } })} /></label><label>Luz difusa <b>{Math.round(dim(editor.light))}%</b><input type="range" min="3" max="45" value={dim(editor.light)} onChange={(event) => setEditor({ ...editor, light: { ...editor.light, dimRadius: Number(event.target.value), brightRadius: Math.min(bright(editor.light), Number(event.target.value)) } })} /></label></div><div className="light-popover-row"><label>Cor<input type="color" value={editor.light.color} onChange={(event) => setEditor({ ...editor, light: { ...editor.light, color: event.target.value } })} /></label><label>Intensidade <b>{Math.round(editor.light.intensity * 100)}%</b><input type="range" min=".1" max="1" step=".05" value={editor.light.intensity} onChange={(event) => setEditor({ ...editor, light: { ...editor.light, intensity: Number(event.target.value) } })} /></label></div><label className="light-popover-enabled"><input type="checkbox" checked={editor.light.enabled} onChange={(event) => setEditor({ ...editor, light: { ...editor.light, enabled: event.target.checked } })} /> Fonte de luz ativa</label><footer>{editor.mode === "edit" && <button className="delete-light" type="button" onClick={() => { onDeleteLight(editor.light.id); setEditor(undefined); }}><Trash2 size={14} /> Excluir</button>}<button className="primary-button">{editor.mode === "create" ? "Fixar no mapa" : "Salvar alterações"}</button></footer></form>}

      {tokenCard ? (() => {
        const token = tokens.find((item) => item.id === tokenCard.id);
        if (!token) return null;
        const player = playerNameOf(token);
        const canControl = isGM || token.ownerId === userId;
        return <div className="token-info-popover" style={{ left: tokenCard.left, top: tokenCard.top }} onPointerDown={(event) => event.stopPropagation()}>
          <header>
            <span className="token-info-avatar" style={{ "--token-color": token.color } as React.CSSProperties}>{token.imageUrl ? <img src={token.imageUrl} alt="" /> : token.initials}</span>
            <div><strong>{token.name}</strong>{token.kind === "hero" ? <small>{player ? "(" + player + ")" : "Jogador não identificado"}</small> : <small>Criatura do mestre</small>}</div>
            <button type="button" onClick={() => setTokenCard(undefined)} aria-label="Fechar"><X size={15} /></button>
          </header>
          <footer>
            <span className={"token-info-kind " + token.kind}>{token.kind === "hero" ? <><Shield size={12} /> Herói</> : <><Swords size={12} /> Criatura</>}</span>
            {token.locked ? <span className="token-info-locked"><Lock size={12} /> Fixado no mapa</span> : null}
            {canControl ? <button type="button" onClick={() => onToggleTokenLock(token.id)}>{token.locked ? <><Unlock size={13} /> Liberar</> : <><Lock size={13} /> Fixar</>}</button> : null}
            {isGM && scene.fogEnabled && token.kind === "hero" ? <button type="button" onClick={() => { setSelectedToken(token.id); setVisionOpen(true); setTokenCard(undefined); }}><Eye size={13} /> Visão</button> : null}
          </footer>
        </div>;
      })() : null}

      {isGM && scene.fogEnabled && visionOpen && <div className="fog-live-controls"><header><div><SlidersHorizontal size={15} /><strong>Visão em tempo real</strong></div><button onClick={() => setVisionOpen(false)}><X size={15} /></button></header><label><span>Todos os jogadores <b>{globalVision}%</b></span><input type="range" min="3" max="45" value={globalVision} onChange={(event) => setGlobalVision(Number(event.target.value))} onPointerUp={() => onSetGlobalVision(globalVision)} /></label>{selectedToken && (() => { const token = tokens.find((item) => item.id === selectedToken); return token ? <div className="individual-vision"><p><strong>{token.name}</strong><button onClick={() => onSetTokenVision(token.id, undefined)}>Usar global</button></p><label><span>Visão individual <b>{individualVision}%</b></span><input type="range" min="3" max="45" value={individualVision} onChange={(event) => setIndividualVision(Number(event.target.value))} onPointerUp={() => onSetTokenVision(token.id, individualVision)} /></label></div> : null; })()}</div>}
      <div className="map-hint">{!hasCharacter ? <><ScrollText size={14} /> Crie e salve sua ficha para gerar o pino</> : lightMode ? <><Lightbulb size={14} /> Clique no mapa para configurar uma luz</> : revealMode ? <><Sun size={14} /> Clique no mapa para revelar</> : <><Eye size={14} /> Arraste o fundo para mover · roda para ampliar · duplo clique no pino para bloquear</>}</div>
    </div>
  </section>;
}

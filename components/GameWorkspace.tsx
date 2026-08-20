"use client";

import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Crown,
  Dices,
  HelpCircle,
  LogOut,
  LockKeyhole,
  Menu,
  MessageCircle,
  Music2,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  ScrollText,
  Settings,
  Sparkles,
  UserPlus,
  Users,
  Wifi,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { useTheme } from "@/hooks/useTheme";
import { Battlemap } from "@/components/Battlemap";
import { BrandMark } from "@/components/BrandMark";
import { CampaignJournal } from "@/components/CampaignJournal";
import { CampaignDetailsDialog } from "@/components/CampaignDetailsDialog";
import { CharacterSheet } from "@/components/CharacterSheet";
import { DiceHistoryPanel } from "@/components/DiceHistoryPanel";
import { DiceRoller } from "@/components/DiceRoller";
import { GameMasterPanel } from "@/components/GameMasterPanel";
import { InviteDialog } from "@/components/InviteDialog";
import { MusicPanel } from "@/components/MusicPanel";
import { MusicPlayer } from "@/components/MusicPlayer";
import { ParticipantsPopover } from "@/components/ParticipantsPopover";
import { PlayerNotes } from "@/components/PlayerNotes";
import { SessionChat } from "@/components/SessionChat";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useGameSession } from "@/hooks/useGameSession";
import { useResizablePanels } from "@/hooks/useResizablePanels";
import { characterNameOf, composeName, isOnline } from "@/lib/display-name";
import type { AppUser, Campaign, CampaignMember } from "@/lib/types";

type PanelKey = "sheet" | "history" | "chat" | "journal" | "notes" | "settings" | "gm";
type WhisperTabKey = `whisper:${string}`;
type WorkspaceTabKey = PanelKey | WhisperTabKey;

function isWhisperTab(tab: WorkspaceTabKey): tab is WhisperTabKey {
  return tab.startsWith("whisper:");
}

function whisperPartnerId(tab: WhisperTabKey) {
  return tab.slice("whisper:".length);
}

const panelLabels: Record<PanelKey, string> = {
  sheet: "Ficha",
  history: "Dados",
  chat: "Chat",
  journal: "Diário",
  notes: "Notas",
  settings: "Configurações",
  gm: "Mestre",
};

const panelIcons: Record<PanelKey, typeof ScrollText> = {
  sheet: ScrollText,
  history: Dices,
  chat: MessageCircle,
  journal: BookOpen,
  notes: NotebookPen,
  settings: Settings,
  gm: Crown,
};

function playChatNotification() {
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(620, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(820, context.currentTime + .09);
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.08, context.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .17);
    oscillator.addEventListener("ended", () => void context.close(), { once: true });
  } catch {
    // Navegadores podem bloquear áudio antes da primeira interação.
  }
}

export function GameWorkspace({ user, campaign, onCampaigns, onLeaveCampaign, onDeleteCampaign, onRemoveMember, appearance, onSignOut, onTutorial }: {
  user: AppUser;
  campaign: Campaign;
  onCampaigns: () => void;
  onLeaveCampaign: (campaignId: string) => Promise<void>;
  onDeleteCampaign: (campaignId: string) => Promise<void>;
  onRemoveMember: (campaignId: string, memberId: string) => Promise<void>;
  appearance: ReturnType<typeof useTheme>;
  onSignOut: () => Promise<void>;
  onTutorial: () => void;
}) {
  const game = useGameSession(campaign.id, user);
  const [openTabs, setOpenTabs] = useState<WorkspaceTabKey[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>();
  const [panelPinned, setPanelPinned] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadWhispers, setUnreadWhispers] = useState<Record<string, number>>({});
  const lastMessageRef = useRef<string | undefined>(undefined);
  const lastWhisperRef = useRef<string | undefined>(undefined);
  const knownWhisperPartnersRef = useRef<Set<string>>(new Set());
  const { sidebarWidth, panelWidth, startResize } = useResizablePanels();

  const openPanel = useCallback((panel: PanelKey) => {
    setOpenTabs((current) => current.includes(panel) ? current : [...current, panel]);
    setActiveTab(panel);
    if (panel === "chat") setUnreadChat(0);
    setSidebarOpen(false);
  }, []);

  const openWhisper = useCallback((partnerId: string) => {
    const tab = `whisper:${partnerId}` as WhisperTabKey;
    setOpenTabs((current) => current.includes(tab) ? current : [...current, tab]);
    setActiveTab(tab);
    setUnreadWhispers((current) => ({ ...current, [partnerId]: 0 }));
    knownWhisperPartnersRef.current.add(partnerId);
    setSidebarOpen(false);
  }, []);

  const openMusic = useCallback(() => {
    setMusicOpen(true);
    setSidebarOpen(false);
  }, []);

  const closePanel = useCallback((panel: WorkspaceTabKey) => {
    setOpenTabs((current) => {
      const next = current.filter((item) => item !== panel);
      setActiveTab((active) => active === panel ? next.at(-1) : active);
      if (next.length === 0) setPanelPinned(false);
      return next;
    });
  }, []);

  useEffect(() => {
    setOpenTabs([]);
    setActiveTab(undefined);
    setUnreadChat(0);
    setUnreadWhispers({});
    lastMessageRef.current = undefined;
    lastWhisperRef.current = undefined;
    knownWhisperPartnersRef.current = new Set();
  }, [campaign.id]);

  useEffect(() => {
    const latest = game.chatMessages.at(-1);
    if (!latest) return;
    if (!lastMessageRef.current) {
      lastMessageRef.current = latest.id;
      return;
    }
    if (latest.id !== lastMessageRef.current) {
      lastMessageRef.current = latest.id;
      if (latest.userId !== user.id && activeTab !== "chat") {
        setUnreadChat((current) => current + 1);
        playChatNotification();
      }
    }
  }, [activeTab, game.chatMessages, user.id]);

  useEffect(() => {
    const latest = game.whisperMessages.at(-1);
    if (!latest) return;
    const partnerId = latest.userId === user.id ? latest.recipientId : latest.userId;
    if (!partnerId) return;

    if (!lastWhisperRef.current) {
      for (const message of game.whisperMessages) {
        const existingPartnerId = message.userId === user.id ? message.recipientId : message.userId;
        if (existingPartnerId) knownWhisperPartnersRef.current.add(existingPartnerId);
      }
      lastWhisperRef.current = latest.id;
      if (latest.userId !== user.id && Date.now() - latest.createdAt < 15000) {
        const tab = `whisper:${partnerId}` as WhisperTabKey;
        setOpenTabs((current) => current.includes(tab) ? current : [...current, tab]);
        setActiveTab(tab);
        playChatNotification();
      }
      return;
    }

    if (latest.id === lastWhisperRef.current) return;
    lastWhisperRef.current = latest.id;
    const tab = `whisper:${partnerId}` as WhisperTabKey;
    const isNewConversation = !knownWhisperPartnersRef.current.has(partnerId);
    knownWhisperPartnersRef.current.add(partnerId);
    setOpenTabs((current) => current.includes(tab) ? current : [...current, tab]);

    if (latest.userId !== user.id) {
      playChatNotification();
      if (isNewConversation) {
        setActiveTab(tab);
        setUnreadWhispers((current) => ({ ...current, [partnerId]: 0 }));
      } else if (activeTab !== tab) {
        setUnreadWhispers((current) => ({ ...current, [partnerId]: (current[partnerId] ?? 0) + 1 }));
      }
    }
  }, [activeTab, game.whisperMessages, user.id]);

  const panelOpen = Boolean(activeTab && openTabs.includes(activeTab));
  useEscapeKey(useCallback(() => {
    if (revealOpen) { setRevealOpen(false); return; }
    if (detailsOpen) { setDetailsOpen(false); return; }
    if (inviteOpen) { setInviteOpen(false); return; }
    if (musicOpen) { setMusicOpen(false); return; }
    if (participantsOpen) { setParticipantsOpen(false); return; }
    if (sidebarOpen) { setSidebarOpen(false); return; }
    if (activeTab) closePanel(activeTab);
  }, [activeTab, closePanel, detailsOpen, inviteOpen, musicOpen, participantsOpen, revealOpen, sidebarOpen]));
  const onlineCount = game.participants.filter((member) => isOnline(member)).length;
  const totalUnread = unreadChat + Object.values(unreadWhispers).reduce((total, count) => total + count, 0);

  function getWhisperPartner(partnerId: string): CampaignMember | undefined {
    const participant = game.participants.find((member) => member.userId === partnerId);
    if (participant) return participant;
    const relatedMessage = [...game.whisperMessages].reverse().find((message) => message.userId === partnerId || message.recipientId === partnerId);
    if (!relatedMessage) return undefined;
    return {
      userId: partnerId,
      name: relatedMessage.userId === partnerId ? relatedMessage.userName : relatedMessage.recipientName ?? "Conversa privada",
      role: game.isGM ? "player" : "gm",
    };
  }

  function getTabLabel(tab: WorkspaceTabKey) {
    if (!isWhisperTab(tab)) return panelLabels[tab];
    const partner = getWhisperPartner(whisperPartnerId(tab));
    if (!partner) return "Privado";
    return composeName(characterNameOf(partner.userId, game.tokens), partner.name) || partner.name;
  }

  function renderPanel(panel: WorkspaceTabKey) {
    if (isWhisperTab(panel)) {
      const partnerId = whisperPartnerId(panel);
      const partner = getWhisperPartner(partnerId);
      if (!partner) return null;
      const privateMessages = game.whisperMessages.filter((message) => message.participantIds?.includes(partnerId) || message.userId === partnerId || message.recipientId === partnerId);
      return <SessionChat embedded campaignId={campaign.id} campaignName={campaign.name} user={user} messages={privateMessages} participants={game.participants} tokens={game.tokens} privateWith={partner} isGM={game.isGM} onSend={game.sendChatMessage} onClear={game.clearChat} onClose={() => closePanel(panel)} />;
    }
    if (panel === "sheet") return <CharacterSheet embedded campaignId={campaign.id} character={game.character} template={game.sheetTemplate} onSave={game.saveCharacter} onClose={() => closePanel("sheet")} />;
    if (panel === "history") return <DiceHistoryPanel embedded rolls={game.rolls} tokens={game.tokens} onClose={() => closePanel("history")} />;
    if (panel === "chat") return <SessionChat embedded campaignId={campaign.id} campaignName={campaign.name} user={user} messages={game.chatMessages} whispers={game.whisperMessages} participants={game.participants} tokens={game.tokens} isGM={game.isGM} onSend={game.sendChatMessage} onOpenWhisper={openWhisper} onClear={game.clearChat} onClose={() => closePanel("chat")} />;
    if (panel === "journal") return <CampaignJournal embedded journal={game.journal} isGM={game.isGM} onSave={game.saveJournal} onClose={() => closePanel("journal")} />;
    if (panel === "notes") return <PlayerNotes embedded notes={game.notes} participants={game.participants} userId={user.id} onSave={game.saveNotes} onClose={() => closePanel("notes")} />;
    if (panel === "settings") return <SettingsPanel embedded appearance={appearance} onClose={() => closePanel("settings")} />;
    if (panel === "gm" && game.isGM) return <GameMasterPanel embedded scene={game.scene} tokens={game.tokens} sheetTemplate={game.sheetTemplate} ownerId={user.id} onSaveScene={game.saveScene} onSaveSheetTemplate={game.saveSheetTemplate} onAddToken={game.addToken} onRemoveToken={game.removeToken} onSetTokenHidden={game.setTokenHidden} onClose={() => closePanel("gm")} />;
    return null;
  }

  return (
    <main className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${panelPinned && panelOpen ? "panel-pinned" : ""}`} style={{ "--sidebar-width": `${sidebarWidth}px`, "--panel-width": `${panelWidth}px` } as CSSProperties}>
      <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu /></button>
      <button className="sidebar-toggle" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Exibir menu lateral" : "Ocultar menu lateral"}>{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand"><span className="brand-mark"><BrandMark size={38} /></span><div><strong>RPGcord</strong><small>MESA DE RPG AO VIVO</small></div></div>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        <nav>
          <p>Jornada</p>
          <button onClick={() => openPanel("sheet")}><ScrollText /> {game.hasCharacter ? "Minha ficha" : "Criar ficha"}</button>
          <button onClick={() => openPanel("journal")}><BookOpen /> Diário da campanha</button>
          <button disabled={!game.hasCharacter} onClick={() => openPanel("notes")}><NotebookPen /> Notas da personagem</button>
          <button onClick={() => openPanel("chat")}><MessageCircle /> Chat da sessão {totalUnread > 0 ? <span>{totalUnread}</span> : null}</button>
          <button onClick={openMusic}><Music2 /> Música da campanha</button>
          {game.isGM ? <><p className="nav-group">Mestre</p><button onClick={() => openPanel("gm")}><Crown /> Preparar cena</button><button onClick={() => { setInviteOpen(true); setSidebarOpen(false); }}><UserPlus /> Convidar jogadores</button></> : null}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={onTutorial}><HelpCircle /> Ajuda</button><button onClick={() => openPanel("settings")}><Settings /> Configurações</button>
          <button className="user-card" onClick={onSignOut} title="Sair da conta">
            <span className="user-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.slice(0, 1)}</span>
            <span><strong>{user.name}</strong><small>{game.isGM ? "Mestre da mesa" : "Aventureiro"}</small></span>
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      {!sidebarCollapsed ? <button className="panel-resizer sidebar-resizer" aria-label="Redimensionar menu lateral" onPointerDown={(event) => startResize("left", event)} /> : null}

      <div className="workspace">
        <header className="topbar">
          <button className="campaign-heading" onClick={() => setDetailsOpen(true)} title="Ver detalhes da campanha"><span><p className="eyebrow">Campanha</p><h1>{campaign.name} <ChevronDown size={16} /></h1></span></button>
          <div className="session-status">
            <span className="online"><Wifi size={14} /> Mesa sincronizada</span>
            <button className="party-stack party-button" onClick={() => setParticipantsOpen((value) => !value)} title="Ver jogadores"><i><Users size={12} /></i><i>{onlineCount}/{Math.max(campaign.memberIds.length, game.participants.length)}</i></button>
            {game.isGM ? <button className="topbar-icon-button invite-circle" onClick={() => setInviteOpen(true)} aria-label="Convidar jogadores" title="Convidar jogadores"><UserPlus size={17} /></button> : null}
            {game.scene.revealUrl ? <button className="outline-button reveal-top" onClick={() => setRevealOpen(true)} title="Ver a imagem revelada pelo mestre"><Sparkles size={16} /> Revelação</button> : null}
            <button className="outline-button back-home-button" onClick={onCampaigns}><ArrowLeft size={16} /> Voltar ao início</button>
          </div>
          {participantsOpen ? <ParticipantsPopover members={game.participants} tokens={game.tokens} currentUserId={user.id} ownerId={campaign.ownerId} isGM={game.isGM} onRemove={(memberId) => void onRemoveMember(campaign.id, memberId)} onClose={() => setParticipantsOpen(false)} /> : null}
        </header>

        {(game.syncError || (!game.hasCharacter && !game.isGM)) ? (
          <div className={`notice ${!game.hasCharacter && !game.syncError ? "action-notice" : ""}`}>
            {game.syncError ? <><strong>Problema de sincronização.</strong> {game.syncError}</> : <><strong>Sua aventura começa com uma ficha.</strong> <button onClick={() => openPanel("sheet")}>Criar personagem agora →</button></>}
          </div>
        ) : null}

        <div className="content-grid">
          <Battlemap scene={game.scene} tokens={game.tokens} participants={game.participants} userId={user.id} isGM={game.isGM} hasCharacter={game.hasCharacter} onMove={game.moveToken} onToggleTokenLock={game.toggleTokenLock} onRequestCharacter={() => openPanel("sheet")} onClearRevealed={game.clearRevealed} onCommitRevealed={game.commitRevealed} onMoveLight={game.moveLight} onCreateLight={game.createLight} onUpdateLight={game.updateLight} onDeleteLight={game.deleteLight} onSetGlobalVision={game.setGlobalVision} onSetTokenVision={game.setTokenVision} />
          <DiceRoller rolls={game.rolls} tokens={game.tokens} character={game.character} template={game.sheetTemplate} hasCharacter={game.hasCharacter} playerName={user.name} onOpenSheet={() => openPanel("sheet")} onRoll={game.rollDie} />
        </div>

      </div>

      <button className={`chat-floating-button ${totalUnread ? "has-unread" : ""}`} onClick={() => openPanel("chat")} aria-label="Abrir chat da sessão"><MessageCircle />{totalUnread > 0 ? <span>{totalUnread > 99 ? "99+" : totalUnread}</span> : null}</button>

      {panelOpen && activeTab ? <div className={`workspace-panel-layer ${panelPinned ? "pinned" : "overlay"}`} onMouseDown={(event) => { if (!panelPinned && event.target === event.currentTarget) closePanel(activeTab); }}>
        {panelPinned ? <button className="panel-resizer workspace-panel-resizer" aria-label="Redimensionar painel lateral" onPointerDown={(event) => startResize("right", event)} /> : null}
        <aside className="workspace-tabs-panel">
          <header className="workspace-tabs-header">
            <div className="workspace-tabs">{openTabs.map((tab) => {
              const privateTab = isWhisperTab(tab);
              const partnerId = privateTab ? whisperPartnerId(tab) : undefined;
              const Icon = privateTab ? LockKeyhole : panelIcons[tab];
              const label = getTabLabel(tab);
              const unread = partnerId ? unreadWhispers[partnerId] ?? 0 : 0;
              return <div className={"workspace-tab" + (tab === activeTab ? " active" : "")} key={tab}>
                <button className="workspace-tab-select" aria-current={tab === activeTab} onClick={() => {
                  setActiveTab(tab);
                  if (tab === "chat") setUnreadChat(0);
                  if (partnerId) setUnreadWhispers((current) => ({ ...current, [partnerId]: 0 }));
                }}><Icon size={14} /><span>{label}</span>{unread > 0 ? <b className="tab-unread">{unread}</b> : null}</button>
                <button className="workspace-tab-close" aria-label={`Fechar ${label}`} onClick={() => closePanel(tab)}><X size={12} /></button>
              </div>;
            })}</div>
            <button className={panelPinned ? "active" : ""} onClick={() => setPanelPinned((value) => !value)} title={panelPinned ? "Desafixar painel" : "Fixar painel"}>{panelPinned ? <PinOff size={16} /> : <Pin size={16} />}</button>
          </header>
          <div className="workspace-tab-content">{renderPanel(activeTab)}</div>
        </aside>
      </div> : null}

      {inviteOpen && game.isGM ? <InviteDialog campaign={campaign} onClose={() => setInviteOpen(false)} /> : null}
      {musicOpen ? <MusicPanel music={game.music} isGM={game.isGM} onSave={game.saveMusic} onClose={() => setMusicOpen(false)} /> : null}
      {detailsOpen ? <CampaignDetailsDialog campaign={campaign} isGM={game.isGM} onClose={() => setDetailsOpen(false)} onLeave={() => onLeaveCampaign(campaign.id)} onDelete={() => onDeleteCampaign(campaign.id)} /> : null}
      <MusicPlayer music={game.music} isGM={game.isGM} onPlayback={game.updateMusicPlayback} onOpen={openMusic} />
      {revealOpen && game.scene.revealUrl ? <div className="reveal-backdrop" role="dialog" aria-modal="true" aria-label="Imagem revelada pelo mestre" onClick={() => setRevealOpen(false)}><button><X /></button><img src={game.scene.revealUrl} alt="Imagem revelada pelo mestre" /></div> : null}
    </main>
  );
}

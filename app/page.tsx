"use client";

import {
  BookOpen,
  ChevronDown,
  Crown,
  Dices,
  HelpCircle,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageCircle,
  Music2,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Battlemap } from "@/components/Battlemap";
import { CampaignJournal } from "@/components/CampaignJournal";
import { CampaignHub } from "@/components/CampaignHub";
import { CharacterSheet } from "@/components/CharacterSheet";
import { DiceRoller } from "@/components/DiceRoller";
import { GameMasterPanel } from "@/components/GameMasterPanel";
import { InviteDialog } from "@/components/InviteDialog";
import { LoginScreen } from "@/components/LoginScreen";
import { MusicPlayer } from "@/components/MusicPlayer";
import { SessionChat } from "@/components/SessionChat";
import { TutorialModal } from "@/components/TutorialModal";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useGameSession } from "@/hooks/useGameSession";
import type { AppUser, Campaign } from "@/lib/types";

export default function Home() {
  const authentication = useAuth();
  const [loginTutorialOpen, setLoginTutorialOpen] = useState(false);
  if (!authentication.user) {
    return (
      <>
        <LoginScreen context={authentication.context} loading={authentication.loading} error={authentication.error} onGoogleLogin={authentication.signInGoogle} onTutorial={() => setLoginTutorialOpen(true)} />
        {loginTutorialOpen && <TutorialModal onClose={() => setLoginTutorialOpen(false)} />}
      </>
    );
  }
  return <CampaignController user={authentication.user} onSignOut={authentication.signOutUser} />;
}

function CampaignController({ user, onSignOut }: { user: AppUser; onSignOut: () => Promise<void> }) {
  const campaignState = useCampaigns(user);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem("rpgcord.tutorial.v1.seen")) setTutorialOpen(true);
  }, []);

  function closeTutorial() {
    window.localStorage.setItem("rpgcord.tutorial.v1.seen", "true");
    setTutorialOpen(false);
  }

  if (!campaignState.activeCampaign) {
    return (
      <>
        <CampaignHub
          user={user}
          campaigns={campaignState.campaigns}
          loading={campaignState.loading}
          error={campaignState.error}
          onSelect={campaignState.selectCampaign}
          onCreate={campaignState.createCampaign}
          onJoin={campaignState.joinCampaign}
          onSignOut={onSignOut}
          onTutorial={() => setTutorialOpen(true)}
        />
        {tutorialOpen && <TutorialModal onClose={closeTutorial} />}
      </>
    );
  }
  return (
    <>
      <GameWorkspace user={user} campaign={campaignState.activeCampaign} onCampaigns={() => campaignState.selectCampaign(undefined)} onSignOut={onSignOut} onTutorial={() => setTutorialOpen(true)} />
      {tutorialOpen && <TutorialModal onClose={closeTutorial} />}
    </>
  );
}

function GameWorkspace({ user, campaign, onCampaigns, onSignOut, onTutorial }: {
  user: AppUser;
  campaign: Campaign;
  onCampaigns: () => void;
  onSignOut: () => Promise<void>;
  onTutorial: () => void;
}) {
  const game = useGameSession(campaign.id, user);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gmOpen, setGmOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const characterName = game.character.name.trim() || "Crie sua personagem";
  const hpPercent = game.character.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((game.character.hp / game.character.maxHp) * 100))) : 0;

  return (
    <main className="app-shell">
      <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu /></button>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand"><span className="brand-mark"><Sparkles /></span><div><strong>RPGcord</strong><small>RPG COMPANION</small></div></div>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        <nav>
          <p>Jornada</p>
          <button className="active" onClick={() => setSidebarOpen(false)}><MapIcon /> Mapa da mesa <span>AO VIVO</span></button>
          <button onClick={() => { setSheetOpen(true); setSidebarOpen(false); }}><ScrollText /> Minha ficha</button>
          <button onClick={() => setSidebarOpen(false)}><Dices /> Histórico de dados</button>
          <button onClick={() => { setChatOpen(true); setSidebarOpen(false); }}><MessageCircle /> Chat da sessão {game.chatMessages.length > 0 && <span>{game.chatMessages.length}</span>}</button>
          <button onClick={() => { setJournalOpen(true); setSidebarOpen(false); }}><BookOpen /> Diário da campanha</button>
          <button onClick={() => { setMusicOpen(true); setSidebarOpen(false); }}><Music2 /> Música da campanha</button>
          {game.isGM && <><p className="nav-group">Mestre</p><button onClick={() => { setGmOpen(true); setSidebarOpen(false); }}><Crown /> Preparar cena</button><button onClick={() => { setInviteOpen(true); setSidebarOpen(false); }}><UserPlus /> Convidar jogadores</button></>}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={onTutorial}><HelpCircle /> Ajuda</button><button><Settings /> Configurações</button>
          <button className="user-card" onClick={onSignOut} title="Sair da conta">
            <span className="user-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.slice(0, 1)}</span>
            <span><strong>{user.name}</strong><small>{game.isGM ? "Mestre da mesa" : "Aventureiro"}</small></span>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="campaign-heading" onClick={onCampaigns} title="Ver campanhas"><span><p className="eyebrow">Campanha</p><h1>{campaign.name} <ChevronDown size={16} /></h1></span></button>
          <div className="session-status">
            <span className="online"><Wifi size={14} /> Mesa sincronizada</span>
            <div className="party-stack"><i><Users size={12} /></i><i>+{Math.max(0, campaign.memberIds.length - 1)}</i></div>
            <button className="outline-button chat-top" onClick={() => setChatOpen(true)}><MessageCircle size={16} /> Chat</button>
            <button className="outline-button music-top" onClick={() => setMusicOpen(true)}><Music2 size={16} /> Música</button>
            {game.isGM && <button className="outline-button invite-top" onClick={() => setInviteOpen(true)}><UserPlus size={16} /> Convidar</button>}
            <button className="outline-button" onClick={() => setSheetOpen(true)}><Shield size={16} /> {game.hasCharacter ? "Abrir ficha" : "Criar ficha"}</button>
          </div>
        </header>

        {(campaign.description || game.syncError || !game.hasCharacter) && (
          <div className={`notice ${!game.hasCharacter && !game.syncError ? "action-notice" : ""}`}>
            {game.syncError ? <><strong>Problema de sincronização.</strong> {game.syncError}</> : !game.hasCharacter ? <><strong>Sua aventura começa com uma ficha.</strong> <button onClick={() => setSheetOpen(true)}>Criar personagem agora →</button></> : campaign.description}
          </div>
        )}

        <div className="content-grid">
          <Battlemap scene={game.scene} tokens={game.tokens} userId={user.id} isGM={game.isGM} onMove={game.moveToken} onRevealArea={game.revealArea} onClearRevealed={game.clearRevealed} onMoveLight={game.moveLight} onSetGlobalVision={game.setGlobalVision} onSetTokenVision={game.setTokenVision} />
          <DiceRoller rolls={game.rolls} onRoll={game.rollDie} />
        </div>

        <section className="bottom-strip">
          <div className="quest-card"><span><BookOpen size={18} /></span><div><p className="eyebrow">Campanha atual</p><strong>{campaign.description || "A história será escrita pelo seu grupo."}</strong></div><small>{game.isGM ? "MESTRE" : "JOGADOR"}</small></div>
          <div className="character-summary">
            <div className="portrait">{game.character.imageUrl ? <img src={game.character.imageUrl} alt="" /> : characterName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
            <div><p className="eyebrow">Seu personagem</p><strong>{characterName}</strong><span>{game.hasCharacter ? `${game.character.ancestry || "Sem ancestralidade"} · ${game.character.characterClass || "Sem classe"} ${game.character.level}` : "Preencha os atributos, vida e inventário"}</span></div>
            {game.hasCharacter && <div className="hp"><span><i style={{ width: `${hpPercent}%` }} /></span><strong>{game.character.hp}/{game.character.maxHp} PV</strong></div>}
            <button className="text-button" onClick={() => setSheetOpen(true)}>{game.hasCharacter ? "Ver ficha" : "Criar ficha"} →</button>
          </div>
          {game.scene.revealUrl && <button className="reveal-card" onClick={() => setRevealOpen(true)}><Sparkles size={17} /><span><small>O mestre revelou</small><strong>Ver imagem</strong></span></button>}
        </section>
      </div>

      {sheetOpen && <CharacterSheet campaignId={campaign.id} character={game.character} onSave={game.saveCharacter} onClose={() => setSheetOpen(false)} />}
      {gmOpen && game.isGM && <GameMasterPanel scene={game.scene} tokens={game.tokens} ownerId={user.id} onSaveScene={game.saveScene} onAddToken={game.addToken} onRemoveToken={game.removeToken} onClose={() => setGmOpen(false)} />}
      {inviteOpen && game.isGM && <InviteDialog campaign={campaign} onClose={() => setInviteOpen(false)} />}
      {chatOpen && <SessionChat campaignId={campaign.id} user={user} messages={game.chatMessages} isGM={game.isGM} onSend={game.sendChatMessage} onClear={game.clearChat} onClose={() => setChatOpen(false)} />}
      {journalOpen && <CampaignJournal journal={game.journal} isGM={game.isGM} onSave={game.saveJournal} onClose={() => setJournalOpen(false)} />}
      <MusicPlayer open={musicOpen} music={game.music} isGM={game.isGM} onSave={game.saveMusic} onPlayback={game.updateMusicPlayback} onClose={() => setMusicOpen(false)} />
      {revealOpen && game.scene.revealUrl && <div className="reveal-backdrop" onClick={() => setRevealOpen(false)}><button><X /></button><img src={game.scene.revealUrl} alt="Imagem revelada pelo mestre" /></div>}
    </main>
  );
}

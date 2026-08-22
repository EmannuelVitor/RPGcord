"use client";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveRoll, rollOne } from "@/lib/dice";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { normalizeMapAsset, orderMapAssets } from "@/lib/map-assets";
import { normalizeMonsterSheet, publicMonsterSheet } from "@/lib/monster-sheet";
import { DEFAULT_SHEET_TEMPLATE, normalizeSheetTemplate } from "@/lib/sheet-template";
import type { AppUser, CampaignJournal, CampaignMember, CampaignMusic, Character, CharacterNotes, ChatMessage, DiceRoll, DiceValidationMode, FogArea, InitiativeState, LightSource, MapAsset, MapToken, MonsterSheet, NpcRecord, Scene, SheetTemplate } from "@/lib/types";

function blankCharacter(user: AppUser): Character {
  return {
    id: user.id,
    ownerId: user.id,
    name: "",
    ancestry: "",
    characterClass: "",
    level: 1,
    hp: 10,
    maxHp: 10,
    armorClass: 10,
    attributes: { forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10 },
    skills: [],
    inventory: "",
  };
}

const initialScene: Scene = {
  id: "active",
  name: "Nova cena",
  mapUrl: "",
  revealUrl: "",
  gridSize: 48,
  gridEnabled: false,
  mapFit: "contain",
  fogEnabled: false,
  visionRadius: 14,
  visionMode: "shared",
  ambientLight: 0,
  movementBounds: { enabled: false, left: 3, top: 5, right: 97, bottom: 95 },
  revealedAreas: [],
  dynamicLights: [],
  excludedUserIds: [],
};

/** Teto de areas reveladas guardadas na cena. */
const MAX_REVEALED_AREAS = 240;

/**
 * Descarta revelacoes praticamente sobrepostas antes de aplicar o teto. Pintar
 * a nevoa por arraste gera muitos circulos proximos, e um corte cego apagaria
 * areas antigas sem o mestre perceber.
 */
function dedupeRevealed(areas: FogArea[]) {
  const kept: FogArea[] = [];
  for (const area of areas) {
    const covered = kept.some((other) =>
      other.radius >= area.radius &&
      Math.hypot(other.x - area.x, other.y - area.y) < Math.min(other.radius, area.radius) * .45);
    if (!covered) kept.push(area);
  }
  return kept.slice(-MAX_REVEALED_AREAS);
}

const initialJournal: CampaignJournal = { content: "" };
const initialMusic: CampaignMusic = { youtubeUrl: "", title: "", loop: false, playing: false, position: 0 };
const initialNotes: CharacterNotes = { content: "", shareWithGM: false, sharedWithPlayerIds: [] };
const initialInitiative: InitiativeState = { entries: [], activeIndex: -1, round: 0, running: false };

function normalizeLight(light: LightSource): LightSource {
  const dimRadius = Math.max(3, Math.min(45, light.dimRadius ?? light.radius ?? 16));
  return {
    ...light,
    brightRadius: Math.max(1, Math.min(dimRadius, light.brightRadius ?? dimRadius * .55)),
    dimRadius,
  };
}

export function useGameSession(campaignId: string, user: AppUser) {
  const [character, setCharacter] = useState<Character>(() => blankCharacter(user));
  const [characters, setCharacters] = useState<Character[]>([]);
  const [hasCharacter, setHasCharacter] = useState(false);
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const [tokens, setTokens] = useState<MapToken[]>([]);
  const [privateMonsterSheets, setPrivateMonsterSheets] = useState<Record<string, MonsterSheet>>({});
  const [assets, setAssets] = useState<MapAsset[]>([]);
  const [npcs, setNpcs] = useState<NpcRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [whisperMessages, setWhisperMessages] = useState<ChatMessage[]>([]);
  const [scene, setScene] = useState<Scene>(initialScene);
  const [journal, setJournal] = useState<CampaignJournal>(initialJournal);
  const [music, setMusic] = useState<CampaignMusic>(initialMusic);
  const [sheetTemplate, setSheetTemplate] = useState<SheetTemplate>(DEFAULT_SHEET_TEMPLATE);
  const [notes, setNotes] = useState<CharacterNotes>(initialNotes);
  const [participants, setParticipants] = useState<CampaignMember[]>([]);
  const [initiative, setInitiative] = useState<InitiativeState>(initialInitiative);
  const [gmId, setGmId] = useState("");
  const isGM = gmId === user.id;
  // Espelha a cena para que as acoes rapidas do mapa nao leiam um valor velho
  // capturado no fechamento do callback.
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const musicRef = useRef(music);
  musicRef.current = music;
  const [syncError, setSyncError] = useState<string>();
  const online = isFirebaseConfigured && Boolean(db);

  useEffect(() => {
    setCharacter(blankCharacter(user));
    setCharacters([]);
    setHasCharacter(false);
    setRolls([]);
    setTokens([]);
    setPrivateMonsterSheets({});
    setAssets([]);
    setNpcs([]);
    setChatMessages([]);
    setWhisperMessages([]);
    setScene(initialScene);
    setJournal(initialJournal);
    setMusic(initialMusic);
    setSheetTemplate(DEFAULT_SHEET_TEMPLATE);
    setNotes(initialNotes);
    setParticipants([]);
    setInitiative(initialInitiative);
    setGmId("");
    setSyncError(undefined);
    if (!online || !db || !campaignId || !user.id) return;

    const unsubscribeCampaign = onSnapshot(
      doc(db, "campaigns", campaignId),
      (snapshot) => {
        if (!snapshot.exists()) { setSyncError("Esta campanha não existe mais."); return; }
        const campaignData = snapshot.data();
        setGmId(String(campaignData.ownerId ?? ""));
        const templateData = campaignData.sheetTemplate as SheetTemplate | undefined;
        setSheetTemplate(templateData ? normalizeSheetTemplate(templateData) : DEFAULT_SHEET_TEMPLATE);
      },
      () => setSyncError("Sem permissão para acessar esta campanha."),
    );
    const unsubscribeCharacters = onSnapshot(
      collection(db, "campaigns", campaignId, "characters"),
      (snapshot) => setCharacters(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Character)),
      () => setSyncError("As fichas não puderam ser carregadas."),
    );
    const unsubscribeRolls = onSnapshot(
      query(collection(db, "campaigns", campaignId, "dicerolls"), orderBy("createdAt", "desc"), limit(30)),
      (snapshot) => setRolls(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        createdAt: item.data().createdAt?.toMillis?.() ?? Date.now(),
      }) as DiceRoll)),
      () => setSyncError("O histórico de dados não pôde ser sincronizado."),
    );
    const unsubscribeTokens = onSnapshot(
      collection(db, "campaigns", campaignId, "tokens"),
      (snapshot) => setTokens(snapshot.docs.map((item) => {
        const value = { id: item.id, ...item.data() } as MapToken;
        return value.kind === "monster" ? { ...value, monsterSheet: normalizeMonsterSheet(value.monsterSheet) } : value;
      })),
      () => setSyncError("Os pinos do mapa não puderam ser sincronizados."),
    );
    const unsubscribeScene = onSnapshot(
      doc(db, "campaigns", campaignId, "scenes", "active"),
      (snapshot) => setScene(snapshot.exists() ? {
        ...initialScene,
        id: snapshot.id,
        ...snapshot.data(),
        revealedAreas: snapshot.data().revealedAreas ?? [],
        dynamicLights: (snapshot.data().dynamicLights ?? []).map((light: LightSource) => normalizeLight(light)),
        excludedUserIds: Array.isArray(snapshot.data().excludedUserIds) ? snapshot.data().excludedUserIds.map(String) : [],
      } as Scene : initialScene),
      () => setSyncError("A cena atual não pôde ser sincronizada."),
    );
    const unsubscribeJournal = onSnapshot(
      doc(db, "campaigns", campaignId, "journal", "main"),
      (snapshot) => setJournal(snapshot.exists() ? {
        content: String(snapshot.data().content ?? ""),
        updatedBy: snapshot.data().updatedBy,
        updatedByName: snapshot.data().updatedByName,
        updatedAt: snapshot.data().updatedAt?.toMillis?.() ?? undefined,
      } : initialJournal),
      () => setSyncError("O diário da campanha não pôde ser sincronizado."),
    );
    const unsubscribeMusic = onSnapshot(
      doc(db, "campaigns", campaignId, "music", "current"),
      (snapshot) => {
        const value = snapshot.data({ serverTimestamps: "estimate" });
        const next = snapshot.exists() ? {
          youtubeUrl: String(value?.youtubeUrl ?? ""),
          title: String(value?.title ?? ""),
          loop: Boolean(value?.loop),
          playing: Boolean(value?.playing),
          position: Number(value?.position ?? 0),
          startedAt: value?.startedAt?.toMillis?.() ?? undefined,
          updatedAt: value?.updatedAt?.toMillis?.() ?? undefined,
        } : initialMusic;
        musicRef.current = next;
        setMusic(next);
      },
      () => setSyncError("A trilha da campanha não pôde ser sincronizada."),
    );
    const unsubscribeChat = onSnapshot(
      query(collection(db, "campaigns", campaignId, "chatMessages"), orderBy("createdAt", "desc"), limit(100)),
      (snapshot) => setChatMessages(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        createdAt: item.data().createdAt?.toMillis?.() ?? Date.now(),
        editedAt: item.data().editedAt?.toMillis?.() ?? undefined,
      }) as ChatMessage).reverse()),
      () => setSyncError("O chat da sessão não pôde ser sincronizado."),
    );
    const unsubscribeWhispers = onSnapshot(
      query(collection(db, "campaigns", campaignId, "whispers"), where("participantIds", "array-contains", user.id), orderBy("createdAt", "desc"), limit(100)),
      (snapshot) => setWhisperMessages(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        createdAt: item.data().createdAt?.toMillis?.() ?? Date.now(),
        editedAt: item.data().editedAt?.toMillis?.() ?? undefined,
      }) as ChatMessage).sort((a, b) => a.createdAt - b.createdAt)),
      () => setSyncError("Os sussurros da sessão não puderam ser sincronizados."),
    );
    const unsubscribeMembers = onSnapshot(
      collection(db, "campaigns", campaignId, "members"),
      (snapshot) => setParticipants(snapshot.docs.map((item) => ({
        ...item.data(),
        userId: item.id,
        present: item.data().present !== false,
        lastSeenAt: item.data().lastSeenAt?.toMillis?.() ?? undefined,
        joinedAt: item.data().joinedAt?.toMillis?.() ?? undefined,
        typingAt: item.data().typingAt?.toMillis?.() ?? undefined,
      }) as CampaignMember)),
      () => setSyncError("Os participantes não puderam ser sincronizados."),
    );
    const unsubscribeInitiative = onSnapshot(
      doc(db, "campaigns", campaignId, "initiative", "current"),
      (snapshot) => {
        const value = snapshot.data({ serverTimestamps: "estimate" });
        setInitiative(snapshot.exists() ? {
          entries: Array.isArray(value?.entries) ? value.entries : [],
          activeIndex: Number(value?.activeIndex ?? -1),
          round: Number(value?.round ?? 0),
          running: Boolean(value?.running),
          updatedAt: value?.updatedAt?.toMillis?.() ?? undefined,
        } as InitiativeState : initialInitiative);
      },
      () => setSyncError("A iniciativa não pôde ser sincronizada."),
    );
    const unsubscribeNotes = onSnapshot(
      doc(db, "campaigns", campaignId, "notes", user.id),
      (snapshot) => setNotes(snapshot.exists() ? {
        content: String(snapshot.data().content ?? ""),
        shareWithGM: Boolean(snapshot.data().shareWithGM),
        sharedWithPlayerIds: Array.isArray(snapshot.data().sharedWithPlayerIds) ? snapshot.data().sharedWithPlayerIds : [],
        updatedAt: snapshot.data().updatedAt?.toMillis?.() ?? undefined,
      } : initialNotes),
      () => setSyncError("Seu bloco de notas não pôde ser sincronizado."),
    );
    const memberRef = doc(db, "campaigns", campaignId, "members", user.id);
    const refreshPresence = () => setDoc(memberRef, {
      name: user.name,
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      present: true,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });
    // Marcar a saida evita que o jogador continue "na mesa" ate o batimento
    // expirar. O pagehide e melhor esforco: pode nao completar se a aba morrer.
    const markAway = () => void setDoc(memberRef, { present: false, typingConversationId: "", typingAt: null }, { merge: true });
    void refreshPresence();
    const presenceTimer = window.setInterval(() => void refreshPresence(), 25000);
    window.addEventListener("pagehide", markAway);

    return () => {
      unsubscribeCampaign();
      unsubscribeCharacters();
      unsubscribeRolls();
      unsubscribeTokens();
      unsubscribeScene();
      unsubscribeJournal();
      unsubscribeMusic();
      unsubscribeChat();
      unsubscribeWhispers();
      unsubscribeMembers();
      unsubscribeInitiative();
      unsubscribeNotes();
      window.clearInterval(presenceTimer);
      window.removeEventListener("pagehide", markAway);
      markAway();
    };
  }, [campaignId, online, user]);

  useEffect(() => {
    setAssets([]);
    if (!online || !db || !campaignId) return;
    const assetCollection = collection(db, "campaigns", campaignId, "assets");
    const assetSource = isGM ? assetCollection : query(assetCollection, where("hidden", "==", false));
    return onSnapshot(
      assetSource,
      (snapshot) => setAssets(orderMapAssets(snapshot.docs.map((item) => normalizeMapAsset({ id: item.id, ...item.data() } as MapAsset)))),
      () => setSyncError("Os assets do mapa não puderam ser sincronizados."),
    );
  }, [campaignId, isGM, online]);

  useEffect(() => {
    setPrivateMonsterSheets({});
    if (!isGM || !online || !db || !campaignId) return;
    return onSnapshot(
      collection(db, "campaigns", campaignId, "monsterSheets"),
      (snapshot) => setPrivateMonsterSheets(Object.fromEntries(snapshot.docs.map((item) => [item.id, normalizeMonsterSheet(item.data() as MonsterSheet)]))),
      () => setSyncError("As fichas privadas das criaturas não puderam ser sincronizadas."),
    );
  }, [campaignId, isGM, online]);

  useEffect(() => {
    setNpcs([]);
    if (!isGM || !online || !db || !campaignId) return;
    return onSnapshot(
      query(collection(db, "campaigns", campaignId, "npcs"), orderBy("name")),
      (snapshot) => setNpcs(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        tags: Array.isArray(item.data().tags) ? item.data().tags.map(String) : [],
        createdAt: item.data().createdAt?.toMillis?.() ?? undefined,
        updatedAt: item.data().updatedAt?.toMillis?.() ?? undefined,
      }) as NpcRecord)),
      () => setSyncError("O catálogo de NPCs não pôde ser sincronizado."),
    );
  }, [campaignId, isGM, online]);

  useEffect(() => {
    const member = participants.find((item) => item.userId === user.id);
    const legacyCharacter = characters.find((item) => item.id === user.id);
    const assignedId = member?.characterId === undefined ? legacyCharacter?.id : member.characterId ?? undefined;
    const assigned = assignedId ? characters.find((item) => item.id === assignedId) : undefined;
    if (assigned) {
      setCharacter(assigned);
      setHasCharacter(true);
    } else {
      setCharacter(blankCharacter(user));
      setHasCharacter(false);
    }
  }, [characters, participants, user]);

  const saveCharacter = useCallback(async (next: Character) => {
    const member = participants.find((item) => item.userId === user.id);
    const legacyCharacter = characters.find((item) => item.id === user.id);
    const assignedId = member?.characterId === undefined ? legacyCharacter?.id : member.characterId ?? undefined;
    const characterId = assignedId || user.id;
    const existing = characters.find((item) => item.id === characterId);
    const controllerIds = Array.from(new Set([...(existing?.controllerIds ?? (existing ? [existing.ownerId] : [])), user.id]));
    const saved: Character = { ...next, id: characterId, ownerId: existing?.ownerId ?? next.ownerId ?? user.id, controllerIds };
    setCharacter(saved);
    setCharacters((current) => [...current.filter((item) => item.id !== saved.id), saved]);
    setParticipants((current) => current.map((item) => item.userId === user.id ? { ...item, characterId } : item));
    setHasCharacter(true);
    if (!online || !db) return;

    const cleanName = saved.name.trim() || user.name;
    const initials = cleanName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const batch = writeBatch(db);
    batch.set(doc(db, "campaigns", campaignId, "characters", characterId), saved);
    batch.set(doc(db, "campaigns", campaignId, "tokens", characterId), {
        id: characterId,
        ownerId: saved.ownerId,
        controllerIds,
        name: cleanName,
        initials,
        x: 50,
        y: 60,
        color: "#8b73d8",
        imageUrl: saved.imageUrl ?? "",
        kind: "hero",
      }, { merge: true });
    batch.set(doc(db, "campaigns", campaignId, "members", user.id), { characterId }, { merge: true });
    await batch.commit();
  }, [campaignId, characters, online, participants, user.id, user.name]);

  const assignCharacter = useCallback(async (memberId: string, nextCharacterId?: string) => {
    const member = participants.find((item) => item.userId === memberId);
    if (!member) throw new Error("Participante não encontrado.");
    if (gmId !== user.id && memberId !== user.id) throw new Error("Somente o mestre pode vincular personagens de outros jogadores.");
    const legacyCharacter = characters.find((item) => item.id === memberId);
    const previousCharacterId = member.characterId === undefined ? legacyCharacter?.id : member.characterId ?? undefined;
    if (nextCharacterId && !characters.some((item) => item.id === nextCharacterId)) throw new Error("Personagem não encontrada.");

    const updateControllers = (ids: string[] | undefined, add: boolean) => {
      const current = ids ?? [];
      return add ? Array.from(new Set([...current, memberId])) : current.filter((id) => id !== memberId);
    };
    setParticipants((current) => current.map((item) => item.userId === memberId ? { ...item, characterId: nextCharacterId ?? null } : item));
    setCharacters((current) => current.map((item) => item.id === previousCharacterId && previousCharacterId !== nextCharacterId
      ? { ...item, controllerIds: updateControllers(item.controllerIds ?? [item.ownerId], false) }
      : item.id === nextCharacterId && previousCharacterId !== nextCharacterId
        ? { ...item, controllerIds: updateControllers(item.controllerIds ?? [item.ownerId], true) }
        : item));
    setTokens((current) => current
      .map((item) => item.id === previousCharacterId && previousCharacterId !== nextCharacterId ? { ...item, controllerIds: updateControllers(item.controllerIds ?? [item.ownerId], false) } : item)
      .filter((item) => item.id !== previousCharacterId || Boolean(item.controllerIds?.length)));
    if (!online || !db) return;

    const batch = writeBatch(db);
    batch.set(doc(db, "campaigns", campaignId, "members", memberId), { characterId: nextCharacterId ?? null }, { merge: true });
    if (previousCharacterId && previousCharacterId !== nextCharacterId) {
      const previous = characters.find((item) => item.id === previousCharacterId);
      const previousControllers = updateControllers(previous?.controllerIds ?? (previous ? [previous.ownerId] : [memberId]), false);
      batch.update(doc(db, "campaigns", campaignId, "characters", previousCharacterId), { controllerIds: arrayRemove(memberId) });
      if (tokens.some((item) => item.id === previousCharacterId)) {
        if (previousControllers.length) batch.update(doc(db, "campaigns", campaignId, "tokens", previousCharacterId), { controllerIds: arrayRemove(memberId) });
        else batch.delete(doc(db, "campaigns", campaignId, "tokens", previousCharacterId));
      }
    }
    if (nextCharacterId && previousCharacterId !== nextCharacterId) {
      const nextCharacter = characters.find((item) => item.id === nextCharacterId)!;
      const nextControllers = updateControllers(nextCharacter.controllerIds ?? [nextCharacter.ownerId], true);
      batch.update(doc(db, "campaigns", campaignId, "characters", nextCharacterId), { controllerIds: arrayUnion(memberId) });
      const cleanName = nextCharacter.name.trim() || member.name;
      batch.set(doc(db, "campaigns", campaignId, "tokens", nextCharacterId), {
        id: nextCharacterId,
        ownerId: nextCharacter.ownerId,
        controllerIds: nextControllers,
        name: cleanName,
        initials: cleanName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        x: 50,
        y: 60,
        color: "#8b73d8",
        imageUrl: nextCharacter.imageUrl ?? "",
        kind: "hero",
      }, { merge: true });
    }
    await batch.commit();
  }, [campaignId, characters, gmId, online, participants, tokens, user.id]);

  const rollDie = useCallback(async (sides: number, modifier: number, quantity = 1, validationMode: DiceValidationMode = "sum") => {
    const safeQuantity = Math.max(1, Math.min(20, Math.round(quantity)));
    const results = Array.from({ length: safeQuantity }, () => rollOne(sides));
    const value = resolveRoll(results, validationMode);
    const next: DiceRoll = {
      id: crypto.randomUUID(), userId: user.id, userName: user.name, sides, value,
      modifier, total: value + modifier, quantity: safeQuantity, results, validationMode, createdAt: Date.now(),
    };
    setRolls((current) => [next, ...current].slice(0, 30));
    if (online && db) {
      const { id: _id, ...payload } = next;
      await addDoc(collection(db, "campaigns", campaignId, "dicerolls"), { ...payload, createdAt: serverTimestamp() });
    }
    return next;
  }, [campaignId, online, user.id, user.name]);

  const moveToken = useCallback(async (tokenId: string, x: number, y: number) => {
    setTokens((current) => current.map((token) => token.id === tokenId ? { ...token, x, y } : token));
    if (online && db) await updateDoc(doc(db, "campaigns", campaignId, "tokens", tokenId), { x, y });
  }, [campaignId, online]);
  const toggleTokenLock = useCallback(async (tokenId: string) => {
    const token = tokens.find((item) => item.id === tokenId);
    if (!token) return;
    const isGM = gmId === user.id;
    if (!isGM && token.ownerId !== user.id && !token.controllerIds?.includes(user.id)) return;
    if (token.locked && token.lockedBy && token.lockedBy !== user.id && !isGM) return;
    const lockPatch = token.locked ? { locked: false, lockedBy: "" } : { locked: true, lockedBy: user.id };
    setTokens((current) => current.map((item) => item.id === tokenId ? { ...item, ...lockPatch } : item));
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "tokens", tokenId), lockPatch, { merge: true });
  }, [campaignId, gmId, online, tokens, user.id]);

  const addToken = useCallback(async (token: MapToken) => {
    const monsterSheet = token.kind === "monster" ? normalizeMonsterSheet(token.monsterSheet) : undefined;
    const saved = monsterSheet ? { ...token, monsterSheet: publicMonsterSheet(monsterSheet) } : token;
    setTokens((current) => [...current.filter((item) => item.id !== saved.id), saved]);
    if (monsterSheet) setPrivateMonsterSheets((current) => ({ ...current, [saved.id]: monsterSheet }));
    if (online && db) {
      const batch = writeBatch(db);
      batch.set(doc(db, "campaigns", campaignId, "tokens", saved.id), saved);
      if (monsterSheet) batch.set(doc(db, "campaigns", campaignId, "monsterSheets", saved.id), { ...monsterSheet, updatedAt: serverTimestamp() });
      await batch.commit();
    }
  }, [campaignId, online]);

  const updateMonsterSheet = useCallback(async (tokenId: string, sheet: MonsterSheet) => {
    if (gmId !== user.id) throw new Error("Somente o mestre pode editar fichas de criaturas.");
    const monsterSheet = normalizeMonsterSheet(sheet);
    const publicSheet = publicMonsterSheet(monsterSheet);
    setPrivateMonsterSheets((current) => ({ ...current, [tokenId]: monsterSheet }));
    setTokens((current) => current.map((token) => token.id === tokenId ? { ...token, monsterSheet: publicSheet } : token));
    if (online && db) {
      const batch = writeBatch(db);
      batch.set(doc(db, "campaigns", campaignId, "monsterSheets", tokenId), { ...monsterSheet, updatedAt: serverTimestamp() });
      batch.set(doc(db, "campaigns", campaignId, "tokens", tokenId), { monsterSheet: publicSheet }, { merge: true });
      await batch.commit();
    }
  }, [campaignId, gmId, online, user.id]);

  const setTokenHidden = useCallback(async (tokenId: string, hidden: boolean) => {
    setTokens((current) => current.map((token) => token.id === tokenId ? { ...token, hidden } : token));
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "tokens", tokenId), { hidden }, { merge: true });
  }, [campaignId, online]);

  const removeToken = useCallback(async (tokenId: string) => {
    setTokens((current) => current.filter((token) => token.id !== tokenId));
    setPrivateMonsterSheets((current) => {
      const next = { ...current };
      delete next[tokenId];
      return next;
    });
    if (online && db) {
      const batch = writeBatch(db);
      batch.delete(doc(db, "campaigns", campaignId, "tokens", tokenId));
      batch.delete(doc(db, "campaigns", campaignId, "monsterSheets", tokenId));
      await batch.commit();
    }
  }, [campaignId, online]);

  const saveAsset = useCallback(async (asset: MapAsset) => {
    if (gmId !== user.id) throw new Error("Somente o mestre pode alterar assets da cena.");
    const saved = normalizeMapAsset({ ...asset, updatedAt: Date.now() });
    setAssets((current) => orderMapAssets([...current.filter((item) => item.id !== saved.id), saved]));
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "assets", saved.id), { ...saved, updatedAt: serverTimestamp() }, { merge: true });
  }, [campaignId, gmId, online, user.id]);

  const moveAsset = useCallback(async (assetId: string, x: number, y: number) => {
    if (gmId !== user.id) return;
    const asset = assets.find((item) => item.id === assetId);
    if (!asset || asset.locked) return;
    const saved = normalizeMapAsset({ ...asset, x, y, updatedAt: Date.now() });
    setAssets((current) => orderMapAssets(current.map((item) => item.id === assetId ? saved : item)));
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "assets", assetId), { x: saved.x, y: saved.y, updatedAt: serverTimestamp() }, { merge: true });
  }, [assets, campaignId, gmId, online, user.id]);

  const deleteAsset = useCallback(async (assetId: string) => {
    if (gmId !== user.id) throw new Error("Somente o mestre pode remover assets da cena.");
    setAssets((current) => current.filter((asset) => asset.id !== assetId));
    if (online && db) await deleteDoc(doc(db, "campaigns", campaignId, "assets", assetId));
  }, [campaignId, gmId, online, user.id]);

  const saveScene = useCallback(async (next: Scene) => {
    setScene(next);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "scenes", "active"), next);
  }, [campaignId, online]);

  /**
   * Grava so os campos alterados da cena. Revelar nevoa e arrastar luzes
   * reescreviam o documento inteiro a cada clique, inclusive todas as luzes.
   */
  const patchScene = useCallback(async (patch: Partial<Scene>) => {
    setScene((current) => ({ ...current, ...patch }));
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "scenes", "active"), patch, { merge: true });
  }, [campaignId, online]);

  const clearRevealed = useCallback(async () => {
    await patchScene({ revealedAreas: [] });
  }, [patchScene]);

  /**
   * Grava o traco inteiro do pincel de nevoa de uma vez. Pintar por arraste
   * emitindo uma escrita por circulo geraria dezenas de gravacoes por gesto.
   */
  const commitRevealed = useCallback(async (areas: FogArea[]) => {
    await patchScene({ revealedAreas: dedupeRevealed(areas) });
  }, [patchScene]);

  const moveLight = useCallback(async (lightId: string, x: number, y: number) => {
    await patchScene({
      dynamicLights: (sceneRef.current.dynamicLights ?? []).map((light) => light.id === lightId ? { ...light, x, y } : light),
    });
  }, [patchScene]);

  const createLight = useCallback(async (light: LightSource) => {
    await patchScene({ dynamicLights: [...(sceneRef.current.dynamicLights ?? []), normalizeLight(light)] });
  }, [patchScene]);

  const updateLight = useCallback(async (light: LightSource) => {
    await patchScene({
      dynamicLights: (sceneRef.current.dynamicLights ?? []).map((item) => item.id === light.id ? normalizeLight(light) : item),
    });
  }, [patchScene]);

  const deleteLight = useCallback(async (lightId: string) => {
    await patchScene({ dynamicLights: (sceneRef.current.dynamicLights ?? []).filter((light) => light.id !== lightId) });
  }, [patchScene]);

  const setGlobalVision = useCallback(async (radius: number) => {
    await patchScene({ visionRadius: Math.max(3, Math.min(45, radius)) });
  }, [patchScene]);

  const setTokenVision = useCallback(async (tokenId: string, radius?: number) => {
    const normalized = radius == null ? null : Math.max(3, Math.min(45, radius));
    setTokens((current) => current.map((token) => token.id === tokenId ? { ...token, visionRadius: normalized ?? undefined } : token));
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "tokens", tokenId), { visionRadius: normalized }, { merge: true });
  }, [campaignId, online]);

  const setPlayerScenePresence = useCallback(async (memberId: string, present: boolean) => {
    if (gmId !== user.id) throw new Error("Somente o mestre pode controlar a presença na cena.");
    const excluded = new Set(sceneRef.current.excludedUserIds ?? []);
    if (present) excluded.delete(memberId); else excluded.add(memberId);
    await patchScene({ excludedUserIds: Array.from(excluded).slice(0, 100) });
  }, [gmId, patchScene, user.id]);

  const saveNpc = useCallback(async (npc: NpcRecord) => {
    if (gmId !== user.id) throw new Error("Somente o mestre pode editar NPCs.");
    const existing = npcs.find((item) => item.id === npc.id);
    const imageUrl = npc.imageUrl?.trim();
    const saved: NpcRecord = {
      id: npc.id,
      name: npc.name.trim().slice(0, 100) || "NPC sem nome",
      role: npc.role.trim().slice(0, 120),
      location: npc.location.trim().slice(0, 120),
      description: npc.description.trim().slice(0, 4000),
      appearance: npc.appearance.trim().slice(0, 2000),
      personality: npc.personality.trim().slice(0, 2000),
      goals: npc.goals.trim().slice(0, 2000),
      notes: npc.notes.trim().slice(0, 10000),
      ...(imageUrl ? { imageUrl } : {}),
      tags: Array.from(new Set(npc.tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 20),
      createdAt: existing?.createdAt ?? npc.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    setNpcs((current) => [...current.filter((item) => item.id !== saved.id), saved].sort((left, right) => left.name.localeCompare(right.name, "pt-BR")));
    if (online && db) {
      const { createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = saved;
      await setDoc(doc(db, "campaigns", campaignId, "npcs", saved.id), {
        ...payload,
        ...(existing ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }, [campaignId, gmId, npcs, online, user.id]);

  const deleteNpc = useCallback(async (npcId: string) => {
    if (gmId !== user.id) throw new Error("Somente o mestre pode remover NPCs.");
    setNpcs((current) => current.filter((npc) => npc.id !== npcId));
    if (online && db) await deleteDoc(doc(db, "campaigns", campaignId, "npcs", npcId));
  }, [campaignId, gmId, online, user.id]);

  const sendChatMessage = useCallback(async (text: string, image?: { imageUrl: string; driveFileId: string }, spoiler = false, recipient?: CampaignMember, mentionIds: string[] = []) => {
    const cleanText = text.trim().slice(0, 2000);
    if (!cleanText && !image) return;
    const whisperParticipantIds = recipient ? [user.id, recipient.userId].sort() : undefined;
    const next: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      text: cleanText,
      createdAt: Date.now(),
      mentionIds: Array.from(new Set(mentionIds)).filter((id) => participants.some((member) => member.userId === id)).slice(0, 20),
      ...(user.avatarUrl ? { userAvatarUrl: user.avatarUrl } : {}),
      ...(image ? image : {}),
      ...(image && spoiler ? { spoiler: true } : {}),
      ...(recipient ? { recipientId: recipient.userId, recipientName: recipient.name, participantIds: whisperParticipantIds, conversationId: whisperParticipantIds?.join("__") } : {}),
    };
    if (!online || !db) {
      if (recipient) setWhisperMessages((current) => [...current, next].slice(-100));
      else setChatMessages((current) => [...current, next].slice(-100));
      return;
    }
    const { id: _id, createdAt: _createdAt, ...payload } = next;
    const collectionName = recipient ? "whispers" : "chatMessages";
    await addDoc(collection(db, "campaigns", campaignId, collectionName), { ...payload, createdAt: serverTimestamp() });
  }, [campaignId, online, participants, user.avatarUrl, user.id, user.name]);

  const editChatMessage = useCallback(async (message: ChatMessage, text: string) => {
    if (message.userId !== user.id) throw new Error("Você só pode editar suas próprias mensagens.");
    const cleanText = text.trim().slice(0, 2000);
    if (!cleanText && !message.imageUrl) throw new Error("A mensagem não pode ficar vazia.");
    const editedAt = Date.now();
    const update = (current: ChatMessage[]) => current.map((item) => item.id === message.id ? { ...item, text: cleanText, editedAt } : item);
    if (message.recipientId) setWhisperMessages(update); else setChatMessages(update);
    if (online && db) await updateDoc(doc(db, "campaigns", campaignId, message.recipientId ? "whispers" : "chatMessages", message.id), { text: cleanText, editedAt: serverTimestamp() });
  }, [campaignId, online, user.id]);

  const deleteChatMessage = useCallback(async (message: ChatMessage) => {
    if (message.userId !== user.id && gmId !== user.id) throw new Error("Você não pode excluir esta mensagem.");
    const remove = (current: ChatMessage[]) => current.filter((item) => item.id !== message.id);
    if (message.recipientId) setWhisperMessages(remove); else setChatMessages(remove);
    if (online && db) await deleteDoc(doc(db, "campaigns", campaignId, message.recipientId ? "whispers" : "chatMessages", message.id));
  }, [campaignId, gmId, online, user.id]);

  const setTyping = useCallback(async (conversationId?: string) => {
    setParticipants((current) => current.map((member) => member.userId === user.id ? { ...member, typingConversationId: conversationId ?? "", typingAt: conversationId ? Date.now() : undefined } : member));
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "members", user.id), {
      typingConversationId: conversationId ?? "",
      typingAt: conversationId ? serverTimestamp() : null,
    }, { merge: true });
  }, [campaignId, online, user.id]);

  const saveJournal = useCallback(async (content: string) => {
    const next: CampaignJournal = { content: content.slice(0, 20000), updatedBy: user.id, updatedByName: user.name, updatedAt: Date.now() };
    setJournal(next);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "journal", "main"), { ...next, updatedAt: serverTimestamp() });
  }, [campaignId, online, user.id, user.name]);
  const saveNotes = useCallback(async (nextNotes: CharacterNotes) => {
    const saved = { ...nextNotes, content: nextNotes.content.slice(0, 20000), updatedAt: Date.now() };
    setNotes(saved);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "notes", user.id), { ...saved, ownerId: user.id, updatedAt: serverTimestamp() });
  }, [campaignId, online, user.id]);

  const saveSheetTemplate = useCallback(async (nextTemplate: SheetTemplate) => {
    const saved = { ...normalizeSheetTemplate(nextTemplate), id: "current", updatedAt: Date.now() };
    setSheetTemplate(saved);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId), { sheetTemplate: { ...saved, updatedAt: serverTimestamp() } }, { merge: true });
  }, [campaignId, online]);

  const saveMusic = useCallback(async (next: CampaignMusic) => {
    const current = musicRef.current;
    const youtubeUrl = next.youtubeUrl.trim();
    const trackChanged = youtubeUrl !== current.youtubeUrl;
    const saved: CampaignMusic = {
      ...current,
      youtubeUrl,
      title: next.title.trim(),
      loop: next.loop,
      ...(trackChanged ? { playing: false, position: 0, startedAt: undefined } : {}),
      updatedAt: Date.now(),
    };
    musicRef.current = saved;
    setMusic(saved);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "music", "current"), {
      youtubeUrl: saved.youtubeUrl,
      title: saved.title,
      loop: saved.loop,
      ...(trackChanged ? { playing: false, position: 0, startedAt: null } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [campaignId, online]);

  const saveInitiative = useCallback(async (nextInitiative: InitiativeState) => {
    const entries = nextInitiative.entries.slice(0, 100).map((entry) => ({ ...entry, name: entry.name.trim().slice(0, 80), initiative: Math.round(entry.initiative) }));
    const saved = {
      ...nextInitiative,
      entries,
      activeIndex: Math.max(-1, Math.min(nextInitiative.activeIndex, entries.length - 1)),
      round: Math.max(0, Math.round(nextInitiative.round)),
      updatedAt: Date.now(),
    };
    setInitiative(saved);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "initiative", "current"), { ...saved, updatedAt: serverTimestamp() });
  }, [campaignId, online]);

  const updateMusicPlayback = useCallback(async (playing: boolean, position: number) => {
    const safePosition = Math.max(0, position);
    const next = { ...musicRef.current, playing, position: safePosition, startedAt: playing ? Date.now() : undefined, updatedAt: Date.now() };
    musicRef.current = next;
    setMusic(next);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "music", "current"), {
      playing,
      position: safePosition,
      startedAt: playing ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [campaignId, online]);

  const clearChat = useCallback(async () => {
    setChatMessages([]);
    const firestore = db;
    if (!online || !firestore) return;
    // Percorre a colecao inteira: apagar apenas as mensagens carregadas deixava
    // o resto no banco, e elas reapareciam na proxima consulta.
    const messages = collection(firestore, "campaigns", campaignId, "chatMessages");
    for (;;) {
      const page = await getDocs(query(messages, limit(400)));
      if (page.empty) return;
      const batch = writeBatch(firestore);
      page.docs.forEach((item) => batch.delete(item.ref));
      await batch.commit();
      if (page.size < 400) return;
    }
  }, [campaignId, online]);

  const sessionTokens = useMemo(() => isGM
    ? tokens.map((token) => token.kind === "monster" && privateMonsterSheets[token.id] ? { ...token, monsterSheet: privateMonsterSheets[token.id] } : token)
    : tokens,
  [isGM, privateMonsterSheets, tokens]);

  return useMemo(() => ({
    character, characters, hasCharacter, rolls, tokens: sessionTokens, assets, npcs, scene, journal, music, initiative, sheetTemplate, chatMessages, whisperMessages, notes, participants, isGM, online, syncError,
    saveCharacter, assignCharacter, rollDie, moveToken, toggleTokenLock, addToken, updateMonsterSheet, removeToken, setTokenHidden, saveAsset, moveAsset, deleteAsset, saveScene, setPlayerScenePresence, clearRevealed, commitRevealed, moveLight, createLight, updateLight, deleteLight, setGlobalVision, setTokenVision, sendChatMessage, editChatMessage, deleteChatMessage, setTyping, clearChat, saveNotes, saveJournal, saveSheetTemplate, saveInitiative, saveNpc, deleteNpc, saveMusic, updateMusicPlayback,
  }), [addToken, assets, assignCharacter, character, characters, chatMessages, clearChat, clearRevealed, commitRevealed, createLight, deleteAsset, deleteChatMessage, deleteLight, deleteNpc, editChatMessage, hasCharacter, initiative, isGM, journal, moveAsset, moveLight, moveToken, music, npcs, notes, online, participants, removeToken, rollDie, rolls, saveAsset, saveCharacter, saveInitiative, saveJournal, saveMusic, saveNotes, saveNpc, saveScene, saveSheetTemplate, scene, sendChatMessage, sessionTokens, setGlobalVision, setPlayerScenePresence, setTokenHidden, setTokenVision, setTyping, sheetTemplate, syncError, toggleTokenLock, updateLight, updateMonsterSheet, updateMusicPlayback, whisperMessages]);
}

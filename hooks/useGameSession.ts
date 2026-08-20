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
import { DEFAULT_SHEET_TEMPLATE, normalizeSheetTemplate } from "@/lib/sheet-template";
import type { AppUser, CampaignJournal, CampaignMember, CampaignMusic, Character, CharacterNotes, ChatMessage, DiceRoll, DiceValidationMode, FogArea, LightSource, MapToken, Scene, SheetTemplate } from "@/lib/types";

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [whisperMessages, setWhisperMessages] = useState<ChatMessage[]>([]);
  const [scene, setScene] = useState<Scene>(initialScene);
  const [journal, setJournal] = useState<CampaignJournal>(initialJournal);
  const [music, setMusic] = useState<CampaignMusic>(initialMusic);
  const [sheetTemplate, setSheetTemplate] = useState<SheetTemplate>(DEFAULT_SHEET_TEMPLATE);
  const [notes, setNotes] = useState<CharacterNotes>(initialNotes);
  const [participants, setParticipants] = useState<CampaignMember[]>([]);
  const [gmId, setGmId] = useState("");
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
    setChatMessages([]);
    setWhisperMessages([]);
    setScene(initialScene);
    setJournal(initialJournal);
    setMusic(initialMusic);
    setSheetTemplate(DEFAULT_SHEET_TEMPLATE);
    setNotes(initialNotes);
    setParticipants([]);
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
      (snapshot) => setTokens(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as MapToken)),
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
      }) as ChatMessage).reverse()),
      () => setSyncError("O chat da sessão não pôde ser sincronizado."),
    );
    const unsubscribeWhispers = onSnapshot(
      query(collection(db, "campaigns", campaignId, "whispers"), where("participantIds", "array-contains", user.id), orderBy("createdAt", "desc"), limit(100)),
      (snapshot) => setWhisperMessages(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        createdAt: item.data().createdAt?.toMillis?.() ?? Date.now(),
      }) as ChatMessage).sort((a, b) => a.createdAt - b.createdAt)),
      () => setSyncError("Os sussurros da sessão não puderam ser sincronizados."),
    );
    const unsubscribeMembers = onSnapshot(
      collection(db, "campaigns", campaignId, "members"),
      (snapshot) => setParticipants(snapshot.docs.map((item) => ({
        userId: item.id,
        ...item.data(),
        present: item.data().present !== false,
        lastSeenAt: item.data().lastSeenAt?.toMillis?.() ?? undefined,
        joinedAt: item.data().joinedAt?.toMillis?.() ?? undefined,
      }) as CampaignMember)),
      () => setSyncError("Os participantes não puderam ser sincronizados."),
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
    const markAway = () => void setDoc(memberRef, { present: false }, { merge: true });
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
      unsubscribeNotes();
      window.clearInterval(presenceTimer);
      window.removeEventListener("pagehide", markAway);
      markAway();
    };
  }, [campaignId, online, user]);

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
    setTokens((current) => [...current.filter((item) => item.id !== token.id), token]);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "tokens", token.id), token);
  }, [campaignId, online]);

  const setTokenHidden = useCallback(async (tokenId: string, hidden: boolean) => {
    setTokens((current) => current.map((token) => token.id === tokenId ? { ...token, hidden } : token));
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "tokens", tokenId), { hidden }, { merge: true });
  }, [campaignId, online]);

  const removeToken = useCallback(async (tokenId: string) => {
    setTokens((current) => current.filter((token) => token.id !== tokenId));
    if (online && db) await deleteDoc(doc(db, "campaigns", campaignId, "tokens", tokenId));
  }, [campaignId, online]);

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

  const sendChatMessage = useCallback(async (text: string, image?: { imageUrl: string; driveFileId: string }, spoiler = false, recipient?: CampaignMember) => {
    const cleanText = text.trim().slice(0, 2000);
    if (!cleanText && !image) return;
    const whisperParticipantIds = recipient ? [user.id, recipient.userId].sort() : undefined;
    const next: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      text: cleanText,
      createdAt: Date.now(),
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
  }, [campaignId, online, user.avatarUrl, user.id, user.name]);

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
    const saved = { ...nextTemplate, id: "current", updatedAt: Date.now() };
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

  return useMemo(() => ({
    character, characters, hasCharacter, rolls, tokens, scene, journal, music, sheetTemplate, chatMessages, whisperMessages, notes, participants, isGM: gmId === user.id, online, syncError,
    saveCharacter, assignCharacter, rollDie, moveToken, toggleTokenLock, addToken, removeToken, setTokenHidden, saveScene, clearRevealed, commitRevealed, moveLight, createLight, updateLight, deleteLight, setGlobalVision, setTokenVision, sendChatMessage, clearChat, saveNotes, saveJournal, saveSheetTemplate, saveMusic, updateMusicPlayback,
  }), [addToken, assignCharacter, character, characters, chatMessages, clearChat, clearRevealed, commitRevealed, setTokenHidden, createLight, deleteLight, gmId, hasCharacter, journal, moveLight, moveToken, music, notes, online, participants, removeToken, rollDie, rolls, saveCharacter, saveJournal, saveMusic, saveNotes, saveScene, saveSheetTemplate, scene, sendChatMessage, setGlobalVision, setTokenVision, sheetTemplate, syncError, toggleTokenLock, tokens, updateLight, updateMusicPlayback, user.id, whisperMessages]);
}

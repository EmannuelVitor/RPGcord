"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { DEFAULT_SHEET_TEMPLATE, normalizeSheetTemplate } from "@/lib/sheet-template";
import type { AppUser, CampaignJournal, CampaignMusic, Character, ChatMessage, DiceRoll, DiceValidationMode, LightSource, MapToken, Scene, SheetTemplate } from "@/lib/types";

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
  mapFit: "contain",
  fogEnabled: false,
  visionRadius: 14,
  revealedAreas: [],
  dynamicLights: [],
};

const initialJournal: CampaignJournal = { content: "" };
const initialMusic: CampaignMusic = { youtubeUrl: "", title: "", loop: false, playing: false, position: 0 };

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
  const [hasCharacter, setHasCharacter] = useState(false);
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const [tokens, setTokens] = useState<MapToken[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [scene, setScene] = useState<Scene>(initialScene);
  const [journal, setJournal] = useState<CampaignJournal>(initialJournal);
  const [music, setMusic] = useState<CampaignMusic>(initialMusic);
  const [sheetTemplate, setSheetTemplate] = useState<SheetTemplate>(DEFAULT_SHEET_TEMPLATE);
  const [gmId, setGmId] = useState("");
  const [syncError, setSyncError] = useState<string>();
  const online = isFirebaseConfigured && Boolean(db);

  useEffect(() => {
    setCharacter(blankCharacter(user));
    setHasCharacter(false);
    setRolls([]);
    setTokens([]);
    setChatMessages([]);
    setScene(initialScene);
    setJournal(initialJournal);
    setMusic(initialMusic);
    setSheetTemplate(DEFAULT_SHEET_TEMPLATE);
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
    const unsubscribeCharacter = onSnapshot(
      doc(db, "campaigns", campaignId, "characters", user.id),
      (snapshot) => {
        if (snapshot.exists()) {
          setCharacter({ id: snapshot.id, ...snapshot.data() } as Character);
          setHasCharacter(true);
        } else {
          setCharacter(blankCharacter(user));
          setHasCharacter(false);
        }
      },
      () => setSyncError("Sua ficha não pôde ser carregada."),
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
      (snapshot) => setMusic(snapshot.exists() ? {
        youtubeUrl: String(snapshot.data().youtubeUrl ?? ""),
        title: String(snapshot.data().title ?? ""),
        loop: Boolean(snapshot.data().loop),
        playing: Boolean(snapshot.data().playing),
        position: Number(snapshot.data().position ?? 0),
        startedAt: snapshot.data().startedAt?.toMillis?.() ?? undefined,
        updatedAt: snapshot.data().updatedAt?.toMillis?.() ?? undefined,
      } : initialMusic),
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

    return () => {
      unsubscribeCampaign();
      unsubscribeCharacter();
      unsubscribeRolls();
      unsubscribeTokens();
      unsubscribeScene();
      unsubscribeJournal();
      unsubscribeMusic();
      unsubscribeChat();
    };
  }, [campaignId, online, user]);

  const saveCharacter = useCallback(async (next: Character) => {
    const saved = { ...next, id: user.id, ownerId: user.id };
    setCharacter(saved);
    setHasCharacter(true);
    if (!online || !db) return;

    const cleanName = saved.name.trim() || user.name;
    const initials = cleanName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    await Promise.all([
      setDoc(doc(db, "campaigns", campaignId, "characters", user.id), saved),
      setDoc(doc(db, "campaigns", campaignId, "tokens", user.id), {
        id: user.id,
        ownerId: user.id,
        name: cleanName,
        initials,
        x: 50,
        y: 60,
        color: "#8b73d8",
        imageUrl: saved.imageUrl ?? "",
        kind: "hero",
      }, { merge: true }),
    ]);
  }, [campaignId, online, user.id, user.name]);

  const rollDie = useCallback(async (sides: number, modifier: number, quantity = 1, validationMode: DiceValidationMode = "sum") => {
    const safeQuantity = Math.max(1, Math.min(20, Math.round(quantity)));
    const results = Array.from({ length: safeQuantity }, () => Math.floor(Math.random() * sides) + 1);
    const value = validationMode === "highest"
      ? Math.max(...results)
      : validationMode === "lowest"
        ? Math.min(...results)
        : results.reduce((total, result) => total + result, 0);
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

  const addToken = useCallback(async (token: MapToken) => {
    setTokens((current) => [...current.filter((item) => item.id !== token.id), token]);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "tokens", token.id), token);
  }, [campaignId, online]);

  const removeToken = useCallback(async (tokenId: string) => {
    setTokens((current) => current.filter((token) => token.id !== tokenId));
    if (online && db) await deleteDoc(doc(db, "campaigns", campaignId, "tokens", tokenId));
  }, [campaignId, online]);

  const saveScene = useCallback(async (next: Scene) => {
    setScene(next);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "scenes", "active"), next);
  }, [campaignId, online]);

  const revealArea = useCallback(async (x: number, y: number) => {
    const next: Scene = {
      ...scene,
      revealedAreas: [...(scene.revealedAreas ?? []), {
        id: crypto.randomUUID(),
        x,
        y,
        radius: scene.visionRadius ?? 14,
      }].slice(-60),
    };
    await saveScene(next);
  }, [saveScene, scene]);

  const clearRevealed = useCallback(async () => {
    await saveScene({ ...scene, revealedAreas: [] });
  }, [saveScene, scene]);

  const moveLight = useCallback(async (lightId: string, x: number, y: number) => {
    await saveScene({
      ...scene,
      dynamicLights: (scene.dynamicLights ?? []).map((light) => light.id === lightId ? { ...light, x, y } : light),
    });
  }, [saveScene, scene]);

  const createLight = useCallback(async (light: LightSource) => {
    await saveScene({ ...scene, dynamicLights: [...(scene.dynamicLights ?? []), normalizeLight(light)] });
  }, [saveScene, scene]);

  const updateLight = useCallback(async (light: LightSource) => {
    await saveScene({
      ...scene,
      dynamicLights: (scene.dynamicLights ?? []).map((item) => item.id === light.id ? normalizeLight(light) : item),
    });
  }, [saveScene, scene]);

  const deleteLight = useCallback(async (lightId: string) => {
    await saveScene({ ...scene, dynamicLights: (scene.dynamicLights ?? []).filter((light) => light.id !== lightId) });
  }, [saveScene, scene]);

  const setGlobalVision = useCallback(async (radius: number) => {
    await saveScene({ ...scene, visionRadius: Math.max(3, Math.min(45, radius)) });
  }, [saveScene, scene]);

  const setTokenVision = useCallback(async (tokenId: string, radius?: number) => {
    const normalized = radius == null ? null : Math.max(3, Math.min(45, radius));
    setTokens((current) => current.map((token) => token.id === tokenId ? { ...token, visionRadius: normalized ?? undefined } : token));
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "tokens", tokenId), { visionRadius: normalized }, { merge: true });
  }, [campaignId, online]);

  const sendChatMessage = useCallback(async (text: string, image?: { imageUrl: string; driveFileId: string }, spoiler = false) => {
    const cleanText = text.trim().slice(0, 2000);
    if (!cleanText && !image) return;
    const next: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      text: cleanText,
      createdAt: Date.now(),
      ...(user.avatarUrl ? { userAvatarUrl: user.avatarUrl } : {}),
      ...(image ? image : {}),
      ...(image && spoiler ? { spoiler: true } : {}),
    };
    if (!online || !db) {
      setChatMessages((current) => [...current, next].slice(-100));
      return;
    }
    const { id: _id, createdAt: _createdAt, ...payload } = next;
    await addDoc(collection(db, "campaigns", campaignId, "chatMessages"), { ...payload, createdAt: serverTimestamp() });
  }, [campaignId, online, user.avatarUrl, user.id, user.name]);

  const saveJournal = useCallback(async (content: string) => {
    const next: CampaignJournal = { content: content.slice(0, 20000), updatedBy: user.id, updatedByName: user.name, updatedAt: Date.now() };
    setJournal(next);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "journal", "main"), { ...next, updatedAt: serverTimestamp() });
  }, [campaignId, online, user.id, user.name]);

  const saveSheetTemplate = useCallback(async (nextTemplate: SheetTemplate) => {
    const saved = { ...nextTemplate, id: "current", updatedAt: Date.now() };
    setSheetTemplate(saved);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId), { sheetTemplate: { ...saved, updatedAt: serverTimestamp() } }, { merge: true });
  }, [campaignId, online]);

  const saveMusic = useCallback(async (next: CampaignMusic) => {
    const saved = { ...next, position: Math.max(0, next.position || 0), updatedAt: Date.now() };
    setMusic(saved);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "music", "current"), { ...saved, startedAt: saved.playing ? serverTimestamp() : null, updatedAt: serverTimestamp() });
  }, [campaignId, online]);

  const updateMusicPlayback = useCallback(async (playing: boolean, position: number) => {
    const safePosition = Math.max(0, position);
    const next = { ...music, playing, position: safePosition, startedAt: playing ? Date.now() : undefined, updatedAt: Date.now() };
    setMusic(next);
    if (online && db) await setDoc(doc(db, "campaigns", campaignId, "music", "current"), {
      playing,
      position: safePosition,
      startedAt: playing ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [campaignId, music, online]);

  const clearChat = useCallback(async () => {
    const current = chatMessages;
    setChatMessages([]);
    const firestore = db;
    if (online && firestore) await Promise.all(current.map((message) => deleteDoc(doc(firestore, "campaigns", campaignId, "chatMessages", message.id))));
  }, [campaignId, chatMessages, online]);

  return useMemo(() => ({
    character, hasCharacter, rolls, tokens, scene, journal, music, sheetTemplate, chatMessages, isGM: gmId === user.id, online, syncError,
    saveCharacter, rollDie, moveToken, addToken, removeToken, saveScene, revealArea, clearRevealed, moveLight, createLight, updateLight, deleteLight, setGlobalVision, setTokenVision, sendChatMessage, clearChat, saveJournal, saveSheetTemplate, saveMusic, updateMusicPlayback,
  }), [addToken, character, chatMessages, clearChat, clearRevealed, createLight, deleteLight, gmId, hasCharacter, journal, moveLight, moveToken, music, online, removeToken, revealArea, rollDie, rolls, saveCharacter, saveJournal, saveMusic, saveScene, saveSheetTemplate, scene, sendChatMessage, setGlobalVision, setTokenVision, sheetTemplate, syncError, tokens, updateLight, updateMusicPlayback, user.id]);
}

"use client";

import {
  arrayRemove,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  writeBatch,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import type { AppUser, Campaign } from "@/lib/types";

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function toCampaign(id: string, value: Record<string, unknown>): Campaign {
  const timestamp = (field: unknown) =>
    typeof field === "object" && field && "toMillis" in field
      ? (field as { toMillis: () => number }).toMillis()
      : typeof field === "number"
        ? field
        : Date.now();
  return {
    id,
    name: String(value.name ?? "Campanha sem nome"),
    description: String(value.description ?? ""),
    ownerId: String(value.ownerId ?? ""),
    ownerName: String(value.ownerName ?? "Mestre"),
    memberIds: Array.isArray(value.memberIds) ? value.memberIds.map(String) : [],
    inviteCode: String(value.inviteCode ?? ""),
    createdAt: timestamp(value.createdAt),
    updatedAt: timestamp(value.updatedAt),
  };
}

export function useCampaigns(user: AppUser) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!db) {
      setError("O Firestore não está disponível.");
      setLoading(false);
      return;
    }
    const campaignsQuery = query(
      collection(db, "campaigns"),
      where("memberIds", "array-contains", user.id),
    );
    return onSnapshot(
      campaignsQuery,
      (snapshot) => {
        const next = snapshot.docs
          .map((item) => toCampaign(item.id, item.data()))
          .sort((a, b) => b.updatedAt - a.updatedAt);
        setCampaigns(next);
        setLoading(false);
        setError(undefined);
        setActiveId((current) => {
          if (current && next.some((campaign) => campaign.id === current)) return current;
          const saved = window.localStorage.getItem(`rpgcord.activeCampaign.${user.id}`);
          if (saved && next.some((campaign) => campaign.id === saved)) return saved;
          return next.length === 1 ? next[0].id : undefined;
        });
      },
      () => {
        setError("Não foi possível carregar suas campanhas.");
        setLoading(false);
      },
    );
  }, [user.id]);

  const selectCampaign = useCallback((campaignId?: string) => {
    setActiveId(campaignId);
    if (campaignId) window.localStorage.setItem(`rpgcord.activeCampaign.${user.id}`, campaignId);
    else window.localStorage.removeItem(`rpgcord.activeCampaign.${user.id}`);
  }, [user.id]);

  const createCampaign = useCallback(async (name: string, description: string) => {
    if (!db) throw new Error("Firestore indisponível.");
    const campaignRef = doc(collection(db, "campaigns"));
    const code = inviteCode();
    const batch = writeBatch(db);
    batch.set(campaignRef, {
      name: name.trim(),
      description: description.trim(),
      ownerId: user.id,
      ownerName: user.name,
      memberIds: [user.id],
      inviteCode: code,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "campaigns", campaignRef.id, "members", user.id), {
      userId: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl ?? "",
      role: "gm",
      joinedAt: serverTimestamp(),
    });
    batch.set(doc(db, "campaignInvites", code), {
      campaignId: campaignRef.id,
      campaignName: name.trim(),
      ownerId: user.id,
      active: true,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    selectCampaign(campaignRef.id);
    return campaignRef.id;
  }, [selectCampaign, user.avatarUrl, user.id, user.name]);

  const joinCampaign = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) throw new Error("Digite o código do convite.");
    const currentUser = auth?.currentUser;
    if (!currentUser) throw new Error("Faça login novamente para entrar na campanha.");
    const idToken = await currentUser.getIdToken();
    const response = await fetch("/api/campaigns/join", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ code, name: user.name, avatarUrl: user.avatarUrl ?? "" }),
    });
    const result = (await response.json()) as { campaignId?: string; error?: string };
    if (!response.ok || !result.campaignId) throw new Error(result.error ?? "Não foi possível entrar na campanha.");
    selectCampaign(result.campaignId);
    return result.campaignId;
  }, [selectCampaign, user.avatarUrl, user.name]);

  /**
   * Sai da campanha. As regras deixam o jogador retirar apenas o proprio id de
   * memberIds; as notas saem no mesmo lote, enquanto a filiacao ainda
   * vale, porque depois disso ele perde o acesso. A ficha fica guardada caso
   * ele volte pelo mesmo convite.
   */
  const leaveCampaign = useCallback(async (campaignId: string) => {
    if (!db) throw new Error("Firestore indisponível.");
    const batch = writeBatch(db);
    batch.delete(doc(db, "campaigns", campaignId, "notes", user.id));
    batch.delete(doc(db, "campaigns", campaignId, "members", user.id));
    batch.update(doc(db, "campaigns", campaignId), { memberIds: arrayRemove(user.id) });
    await batch.commit();
    selectCampaign(undefined);
  }, [selectCampaign, user.id]);

  /** O mestre remove um jogador da mesa. */
  const removeMember = useCallback(async (campaignId: string, memberId: string) => {
    if (!db) throw new Error("Firestore indisponível.");
    const batch = writeBatch(db);
    batch.delete(doc(db, "campaigns", campaignId, "members", memberId));
    batch.update(doc(db, "campaigns", campaignId), { memberIds: arrayRemove(memberId) });
    await batch.commit();
  }, []);

  /** Exclusao definitiva, incluindo as subcolecoes, pelo Admin SDK. */
  const deleteCampaign = useCallback(async (campaignId: string) => {
    const currentUser = auth?.currentUser;
    if (!currentUser) throw new Error("Faça login novamente para excluir a campanha.");
    const idToken = await currentUser.getIdToken();
    const response = await fetch("/api/campaigns/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ campaignId }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Não foi possível excluir a campanha.");
    selectCampaign(undefined);
  }, [selectCampaign]);

  return useMemo(() => ({
    campaigns,
    activeCampaign: campaigns.find((campaign) => campaign.id === activeId),
    loading,
    error,
    selectCampaign,
    createCampaign,
    joinCampaign,
    leaveCampaign,
    removeMember,
    deleteCampaign,
  }), [activeId, campaigns, createCampaign, deleteCampaign, error, joinCampaign, leaveCampaign, loading, removeMember, selectCampaign]);
}

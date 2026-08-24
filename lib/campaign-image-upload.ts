"use client";

import { auth } from "@/lib/firebase";

export type CampaignImagePurpose = "asset" | "character" | "creature";

export async function uploadCampaignImage(campaignId: string, file: File, purpose: CampaignImagePurpose) {
  if (file.size > 4 * 1024 * 1024) throw new Error("A imagem pode ter no máximo 4 MB.");
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error("Sua sessão expirou. Entre novamente para enviar a imagem.");
  const body = new FormData();
  body.set("campaignId", campaignId);
  body.set("file", file);
  body.set("purpose", purpose);
  const response = await fetch("/api/chat-upload", { method: "POST", headers: { Authorization: "Bearer " + token }, body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Não foi possível enviar a imagem.");
  return String(result.imageUrl);
}

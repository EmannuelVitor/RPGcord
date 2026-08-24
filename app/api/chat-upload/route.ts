import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { uploadChatImage } from "@/lib/google-drive";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 4 * 1024 * 1024;

function cleanFileName(name: string) {
  const safe = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-80);
  return safe || "imagem.png";
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "chat-upload"), 12, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  try {
    const authorization = request.headers.get("authorization") ?? "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!idToken) return NextResponse.json({ error: "Entre novamente para enviar imagens." }, { status: 401 });
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const form = await request.formData();
    const campaignId = String(form.get("campaignId") ?? "");
    const purposeNames = { asset: "asset", character: "personagem", creature: "criatura" } as const;
    const requestedPurpose = String(form.get("purpose") ?? "chat");
    const purpose = requestedPurpose in purposeNames ? purposeNames[requestedPurpose as keyof typeof purposeNames] : "chat";
    const file = form.get("file");
    if (!campaignId || !(file instanceof File)) return NextResponse.json({ error: "Campanha ou imagem ausente." }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: "Envie uma imagem JPG, PNG, WebP ou GIF." }, { status: 415 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "A imagem pode ter no máximo 4 MB." }, { status: 413 });

    const campaign = await getAdminFirestore().collection("campaigns").doc(campaignId).get();
    const memberIds = campaign.data()?.memberIds;
    if (!campaign.exists || !Array.isArray(memberIds) || !memberIds.includes(decoded.uid)) {
      return NextResponse.json({ error: "Você não participa desta campanha." }, { status: 403 });
    }

    const stored = await uploadChatImage(file, `${campaignId}-${purpose}-${Date.now()}-${cleanFileName(file.name)}`);
    return NextResponse.json({
      driveFileId: stored.id,
      imageUrl: `/api/drive-image?id=${encodeURIComponent(stored.id)}&campaignId=${encodeURIComponent(campaignId)}`,
    });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Não foi possível enviar a imagem.";
    const driveNotReady = /Drive|Google|autoriza|service|permission|permiss|API|folder|pasta|insufficient/i.test(message);
    return NextResponse.json({
      error: driveNotReady ? "O armazenamento de imagens ainda não foi autorizado no Google Drive." : message,
    }, { status: driveNotReady ? 503 : 500 });
  }
}

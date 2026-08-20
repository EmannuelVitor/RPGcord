import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { downloadPrivateDriveImage } from "@/lib/google-drive";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const DRIVE_FILE_ID = /^[a-zA-Z0-9_-]{10,}$/;
const CAMPAIGN_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const SESSION_COOKIE_NAME = "rpgcord_session";

export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "drive-image"), 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const url = new URL(request.url);
  const fileId = url.searchParams.get("id") ?? "";
  const campaignId = url.searchParams.get("campaignId") ?? "";
  if (!DRIVE_FILE_ID.test(fileId)) {
    return NextResponse.json({ error: "ID do Google Drive inválido." }, { status: 400 });
  }
  if (campaignId && !CAMPAIGN_ID.test(campaignId)) return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });

  try {
    const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return NextResponse.json({ error: "Autenticação necessária para acessar esta imagem." }, { status: 401 });
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    if (campaignId) {
      const campaign = await getAdminFirestore().collection("campaigns").doc(campaignId).get();
      const memberIds = campaign.data()?.memberIds;
      if (!campaign.exists || !Array.isArray(memberIds) || !memberIds.includes(decoded.uid)) {
        return NextResponse.json({ error: "Você não participa desta campanha." }, { status: 403 });
      }
    }
  } catch {
    return NextResponse.json({ error: "A sessão expirou. Entre novamente." }, { status: 401 });
  }

  let response = await fetch(
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`,
    { cache: "force-cache", redirect: "follow" },
  );

  let contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/")) {
    try {
      response = await downloadPrivateDriveImage(fileId);
      contentType = response.headers.get("content-type") ?? "";
    } catch {
      return NextResponse.json({ error: "Imagem do Google Drive indisponível." }, { status: 502 });
    }
  }
  if (!response.ok || !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "O arquivo precisa ser uma imagem acessível no Google Drive." }, { status: 415 });
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=3600, no-transform",
    "Vary": "Cookie",
    "X-Content-Type-Options": "nosniff",
  });
  const contentLength = response.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(response.body, { status: 200, headers });
}

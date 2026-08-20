import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Exclui a campanha e tudo abaixo dela.
 *
 * Apagar o documento no cliente deixaria as subcolecoes orfas — fichas, chat,
 * pinos e cena continuariam no banco, invisiveis e cobrando armazenamento. Por
 * isso a exclusao passa pelo Admin SDK, que sabe apagar em profundidade.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "campaign-delete"), 5, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  try {
    const authorization = request.headers.get("authorization") ?? "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!idToken) return NextResponse.json({ error: "Autenticação ausente." }, { status: 401 });

    const { campaignId } = (await request.json()) as { campaignId?: string };
    if (!campaignId) return NextResponse.json({ error: "Campanha não informada." }, { status: 400 });

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const adminDb = getAdminFirestore();
    const campaignRef = adminDb.collection("campaigns").doc(campaignId);
    const campaign = await campaignRef.get();

    if (!campaign.exists) return NextResponse.json({ error: "Esta campanha não existe mais." }, { status: 404 });
    if (campaign.data()?.ownerId !== decoded.uid) {
      return NextResponse.json({ error: "Só o mestre pode excluir a campanha." }, { status: 403 });
    }

    const inviteCode = String(campaign.data()?.inviteCode ?? "");
    if (inviteCode) await adminDb.collection("campaignInvites").doc(inviteCode).delete().catch(() => undefined);
    await adminDb.recursiveDelete(campaignRef);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a campanha." }, { status: 500 });
  }
}

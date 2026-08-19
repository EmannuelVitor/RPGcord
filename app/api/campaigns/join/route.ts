import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "Autenticação ausente." }, { status: 401 });

    const { code: rawCode, name, avatarUrl } = (await request.json()) as {
      code?: string;
      name?: string;
      avatarUrl?: string;
    };
    const code = rawCode?.trim().toUpperCase();
    if (!code || !/^[A-Z2-9]{6,12}$/.test(code)) {
      return NextResponse.json({ error: "Código de convite inválido." }, { status: 400 });
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    const adminDb = getAdminFirestore();
    const inviteRef = adminDb.collection("campaignInvites").doc(code);
    let campaignId = "";

    await adminDb.runTransaction(async (transaction) => {
      const invite = await transaction.get(inviteRef);
      if (!invite.exists || invite.data()?.active !== true) throw new Error("INVITE_NOT_FOUND");
      campaignId = String(invite.data()?.campaignId ?? "");
      const campaignRef = adminDb.collection("campaigns").doc(campaignId);
      const campaign = await transaction.get(campaignRef);
      if (!campaign.exists) throw new Error("CAMPAIGN_NOT_FOUND");

      transaction.update(campaignRef, {
        memberIds: FieldValue.arrayUnion(decoded.uid),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(adminDb.collection("campaigns").doc(campaignId).collection("members").doc(decoded.uid), {
        userId: decoded.uid,
        name: name?.trim() || decoded.name || decoded.email?.split("@")[0] || "Aventureiro",
        avatarUrl: avatarUrl ?? "",
        role: campaign.data()?.ownerId === decoded.uid ? "gm" : "player",
        joinedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({ campaignId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVITE_NOT_FOUND") {
      return NextResponse.json({ error: "Convite não encontrado ou desativado." }, { status: 404 });
    }
    if (message === "CAMPAIGN_NOT_FOUND") {
      return NextResponse.json({ error: "A campanha deste convite não existe mais." }, { status: 404 });
    }
    return NextResponse.json({ error: "Não foi possível aceitar o convite." }, { status: 401 });
  }
}

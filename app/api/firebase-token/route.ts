import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

type DiscordAuthorization = {
  application?: { id?: string };
  user?: { id?: string; username?: string; global_name?: string | null };
};

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "firebase-token"), 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const { accessToken } = (await request.json()) as { accessToken?: string };
  if (!accessToken) {
    return NextResponse.json({ error: "Token do Discord ausente." }, { status: 400 });
  }
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Configuração OAuth incompleta." }, { status: 503 });
  }

  // /oauth2/@me devolve tambem a aplicacao que emitiu o token. Sem essa
  // conferencia, um token de qualquer outro app Discord com escopo identify
  // serviria para obter um custom token do Firebase no lugar do usuario.
  const discordResponse = await fetch("https://discord.com/api/v10/oauth2/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!discordResponse.ok) {
    return NextResponse.json({ error: "Token do Discord inválido." }, { status: 401 });
  }

  const authorization = (await discordResponse.json()) as DiscordAuthorization;
  if (authorization.application?.id !== clientId) {
    return NextResponse.json({ error: "Este token foi emitido para outro aplicativo." }, { status: 401 });
  }
  const user = authorization.user;
  if (!user?.id) {
    return NextResponse.json({ error: "O Discord não retornou os dados do usuário." }, { status: 401 });
  }

  try {
    const firebaseToken = await getAdminAuth().createCustomToken(user.id, {
      username: user.global_name ?? user.username ?? "Aventureiro",
    });
    return NextResponse.json({ firebaseToken });
  } catch {
    return NextResponse.json({ error: "Firebase Admin não configurado." }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "discord-token"), 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const { code } = (await request.json()) as { code?: string };
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return NextResponse.json({ error: "Configuração OAuth incompleta." }, { status: 400 });
  }

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    return NextResponse.json({ error: "Não foi possível concluir o login pelo Discord." }, { status: 401 });
  }

  // Somente o access_token vai para o navegador. A resposta crua do Discord
  // tambem traz refresh_token, que nunca deve sair do servidor.
  return NextResponse.json({ access_token: payload.access_token });
}

import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const { accessToken } = (await request.json()) as { accessToken?: string };
  if (!accessToken) {
    return NextResponse.json({ error: "Token do Discord ausente." }, { status: 400 });
  }

  const discordResponse = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!discordResponse.ok) {
    return NextResponse.json({ error: "Token do Discord inválido." }, { status: 401 });
  }

  const user = (await discordResponse.json()) as {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
  };

  try {
    const firebaseToken = await getAdminAuth().createCustomToken(user.id, {
      username: user.global_name ?? user.username,
    });
    return NextResponse.json({ firebaseToken });
  } catch {
    return NextResponse.json({ error: "Firebase Admin não configurado." }, { status: 503 });
  }
}

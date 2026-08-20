import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sessionContextOf, sessionCookieOptions } from "@/lib/session-cookie";

export const runtime = "nodejs";
const SESSION_COOKIE_NAME = "rpgcord_session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "session"), 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!idToken) return NextResponse.json({ error: "Token de autenticação ausente." }, { status: 401 });
    await getAdminAuth().verifyIdToken(idToken);
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, sessionCookieOptions(sessionContextOf(request), SESSION_DURATION_MS / 1000));
    return response;
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a sessão protegida." }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(sessionContextOf(request), 0));
  return response;
}

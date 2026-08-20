export type SessionContext = "discord" | "web";

export const SESSION_CONTEXT_HEADER = "x-rpgcord-context";

export function sessionContextOf(request: Request): SessionContext {
  return request.headers.get(SESSION_CONTEXT_HEADER) === "discord" ? "discord" : "web";
}

export function sessionCookieOptions(context: SessionContext, maxAge: number) {
  const base = {
    httpOnly: true,
    path: "/",
    maxAge,
  };

  if (context === "discord") {
    return {
      ...base,
      // Discord Activities run inside a cross-site iframe. Discord's proxy
      // requires this pair so the host-only cookie survives that boundary.
      secure: true,
      sameSite: "none" as const,
      partitioned: true,
    };
  }

  return {
    ...base,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
}

"use client";

import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import type { AppUser } from "@/lib/types";

export type AuthMode = "discord" | "google";

type AuthState = {
  user?: AppUser;
  mode?: AuthMode;
  context: "discord" | "web";
  loading: boolean;
  error?: string;
};

function isDiscordActivity() {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname.endsWith(".discordsays.com") ||
    new URLSearchParams(window.location.search).has("frame_id")
  );
}

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha ao autenticar.";
  if (message.includes("auth/configuration-not-found")) {
    return "O login Google ainda não foi habilitado no Firebase Authentication.";
  }
  if (message.includes("auth/popup-closed-by-user")) return "A janela de login foi fechada.";
  if (message.includes("auth/popup-blocked")) return "O navegador bloqueou a janela de login.";
  return message;
}

let activityMappingsPatched = false;

async function createProtectedSession() {
  const firebaseUser = auth?.currentUser;
  if (!firebaseUser) return;
  const idToken = await firebaseUser.getIdToken();
  const response = await fetch("/api/session", { method: "POST", headers: { Authorization: `Bearer ${idToken}` } });
  if (!response.ok) throw new Error("Não foi possível proteger a sessão de imagens.");
}

async function clearProtectedSession() {
  await fetch("/api/session", { method: "DELETE" });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    context: "web",
    loading: true,
  });

  useEffect(() => {
    const context = isDiscordActivity() ? "discord" : "web";
    let active = true;
    if (!isFirebaseConfigured || !auth) {
      setState({ context, loading: false, error: "O Firebase não está configurado neste ambiente." });
      return;
    }

    if (context === "web") {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        void (async () => {
          try {
            await (firebaseUser ? createProtectedSession() : clearProtectedSession());
          } catch (error) {
            console.error("[RPGcord] Sessão protegida", error);
          }
          if (!active) return;
          setState({
            context,
            loading: false,
            mode: firebaseUser ? "google" : undefined,
            user: firebaseUser
              ? {
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "Aventureiro",
                  email: firebaseUser.email ?? undefined,
                  avatarUrl: firebaseUser.photoURL ?? undefined,
                }
              : undefined,
          });
        })();
      });
      return () => { active = false; unsubscribe(); };
    }

    async function connectDiscord() {
      try {
        const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
        if (!clientId) throw new Error("O Client ID do Discord não está configurado.");

        if (!activityMappingsPatched) {
          patchUrlMappings([
            { prefix: "/googleapis/{subdomain}", target: "{subdomain}.googleapis.com" },
          ]);
          activityMappingsPatched = true;
        }

        const sdk = new DiscordSDK(clientId);
        await sdk.ready();
        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify"],
        });
        const tokenResponse = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!tokenResponse.ok) throw new Error("Não foi possível concluir o login pelo Discord.");
        const { access_token } = (await tokenResponse.json()) as { access_token: string };
        const session = await sdk.commands.authenticate({ access_token });
        if (!session?.user) throw new Error("O Discord não retornou os dados do usuário.");

        const firebaseResponse = await fetch("/api/firebase-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: access_token }),
        });
        if (!firebaseResponse.ok) throw new Error("Não foi possível autenticar o usuário no Firebase.");
        const { firebaseToken } = (await firebaseResponse.json()) as { firebaseToken: string };
        await signInWithCustomToken(auth!, firebaseToken);
        await createProtectedSession();

        if (!active) return;
        const discordUser = session.user;
        setState({
          context,
          mode: "discord",
          loading: false,
          user: {
            id: discordUser.id,
            name: discordUser.global_name ?? discordUser.username,
            avatarUrl: discordUser.avatar
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
              : undefined,
          },
        });
      } catch (error) {
        if (active) setState({ context, loading: false, error: friendlyAuthError(error) });
      }
    }
    connectDiscord();
    return () => {
      active = false;
    };
  }, []);

  const signInGoogle = useCallback(async () => {
    if (!auth) return;
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: friendlyAuthError(error) }));
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await clearProtectedSession().catch(() => undefined);
    if (auth) await signOut(auth);
  }, []);

  return { ...state, signInGoogle, signOutUser };
}

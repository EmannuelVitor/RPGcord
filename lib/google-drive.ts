import "server-only";

import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

/** A pasta de destino vem do ambiente: um ID fixo no repositorio vaza infraestrutura. */
function chatFolderId() {
  const folderId = process.env.GOOGLE_DRIVE_CHAT_FOLDER_ID?.trim();
  if (!folderId) throw new Error("A pasta do Google Drive para imagens do chat nao foi configurada (GOOGLE_DRIVE_CHAT_FOLDER_ID).");
  return folderId;
}

let cachedToken: { value: string; expiresAt: number } | undefined;

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getDriveAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (refreshToken && oauthClientId && oauthClientSecret) {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: oauthClientId,
        client_secret: oauthClientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result.access_token) throw new Error(result.error_description || "A autorização do Google Drive expirou.");
    cachedToken = { value: result.access_token, expiresAt: Date.now() + Number(result.expires_in ?? 3600) * 1000 };
    return cachedToken.value;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("Conta de serviço do Google não configurada.");

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(privateKey))}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error(result.error_description || "Não foi possível autenticar no Google Drive.");
  cachedToken = { value: result.access_token, expiresAt: Date.now() + Number(result.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

export async function uploadChatImage(file: File, fileName: string) {
  const accessToken = await getDriveAccessToken();
  const folderId = chatFolderId();
  const boundary = `rpgcord_${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const opening = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,
  );
  const closing = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([opening, Buffer.from(await file.arrayBuffer()), closing]);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body: new Uint8Array(body),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.id) throw new Error(result.error?.message || "O Google Drive recusou o envio.");
  return { id: String(result.id), name: String(result.name ?? fileName), mimeType: String(result.mimeType ?? file.type) };
}

export async function downloadPrivateDriveImage(fileId: string) {
  const accessToken = await getDriveAccessToken();
  const folderId = chatFolderId();
  const metadataResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=parents,mimeType&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "force-cache" },
  );
  if (!metadataResponse.ok) throw new Error("Imagem do Google Drive indisponível.");
  const metadata = await metadataResponse.json();
  if (!Array.isArray(metadata.parents) || !metadata.parents.includes(folderId) || !String(metadata.mimeType ?? "").startsWith("image/")) {
    throw new Error("O arquivo não pertence à pasta autorizada do chat.");
  }
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "force-cache",
  });
}

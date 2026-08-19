import { NextResponse } from "next/server";
import { downloadPrivateDriveImage } from "@/lib/google-drive";

const DRIVE_FILE_ID = /^[a-zA-Z0-9_-]{10,}$/;

export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get("id") ?? "";
  if (!DRIVE_FILE_ID.test(fileId)) {
    return NextResponse.json({ error: "ID do Google Drive inválido." }, { status: 400 });
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
    "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  });
  const contentLength = response.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(response.body, { status: 200, headers });
}

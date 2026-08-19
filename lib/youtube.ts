export type YouTubeTarget = {
  videoId?: string;
  playlistId?: string;
};

const SAFE_ID = /^[a-zA-Z0-9_-]+$/;

export function parseYouTubeUrl(input: string): YouTubeTarget | undefined {
  const value = input.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      const playlistId = url.searchParams.get("list") ?? undefined;
      if (videoId && SAFE_ID.test(videoId)) return { videoId, playlistId: playlistId && SAFE_ID.test(playlistId) ? playlistId : undefined };
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const fromPath = ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : undefined;
      const videoId = url.searchParams.get("v") ?? fromPath;
      const playlistId = url.searchParams.get("list") ?? undefined;
      const safeVideo = videoId && SAFE_ID.test(videoId) ? videoId : undefined;
      const safePlaylist = playlistId && SAFE_ID.test(playlistId) ? playlistId : undefined;
      if (safeVideo || safePlaylist) return { videoId: safeVideo, playlistId: safePlaylist };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function toYouTubeEmbedUrl(input: string, loop = false): string {
  const target = parseYouTubeUrl(input);
  if (!target) return "";
  const params = new URLSearchParams({ playsinline: "1", controls: "1", rel: "0" });
  if (target.playlistId) {
    params.set("listType", "playlist");
    params.set("list", target.playlistId);
  }
  if (loop) {
    params.set("loop", "1");
    if (target.videoId && !target.playlistId) params.set("playlist", target.videoId);
  }
  return `https://www.youtube-nocookie.com/embed/${target.videoId ?? ""}?${params.toString()}`;
}

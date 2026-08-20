/** Converte links comuns do Google Drive em uma URL de imagem do próprio app. */
export function toDirectDriveUrl(input: string, campaignId?: string): string {
  const value = input.trim();
  if (!value) return "";

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  const id = patterns.map((pattern) => value.match(pattern)?.[1]).find(Boolean);
  if (!id) return value;
  const params = new URLSearchParams({ id });
  if (campaignId) params.set("campaignId", campaignId);
  return `/api/drive-image?${params.toString()}`;
}

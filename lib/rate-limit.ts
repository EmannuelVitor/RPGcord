import "server-only";

/**
 * Limitador simples de requisicoes, por janela fixa e em memoria.
 *
 * Cada instancia serverless mantem a propria contagem, entao isto nao e um
 * limite global exato: serve para conter abuso trivial e repeticao acidental,
 * nao para barrar um ataque distribuido. Um limite real exigiria um armazenamento
 * compartilhado (Vercel KV, Upstash ou equivalente).
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5000;

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (buckets.size > MAX_TRACKED_KEYS) prune(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  return { ok: true, retryAfter: 0 };
}

/** Identifica o chamador pelo IP repassado pela borda da Vercel. */
export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "desconhecido";
  return `${scope}:${ip}`;
}

export function tooManyRequests(retryAfter: number) {
  return Response.json(
    { error: "Muitas requisições em pouco tempo. Tente novamente em instantes." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

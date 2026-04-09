import { isProductionEnvironment } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";

const MAX_MESSAGES = 100;
const TTL_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate limiter (replacement for Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60_000); // cleanup every minute

export async function checkIpRateLimit(ip: string | undefined) {
  if (!isProductionEnvironment || !ip) {
    return;
  }

  try {
    const key = `ip-rate-limit:${ip}`;
    const now = Date.now();
    const existing = rateLimitMap.get(key);

    if (existing && now < existing.resetAt) {
      existing.count += 1;
      if (existing.count > MAX_MESSAGES) {
        throw new ChatbotError("rate_limit:chat");
      }
    } else {
      rateLimitMap.set(key, { count: 1, resetAt: now + TTL_MS });
    }
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
  }
}

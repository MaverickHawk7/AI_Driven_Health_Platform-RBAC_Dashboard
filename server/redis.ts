import { createClient, type RedisClientType } from "redis";
import { RedisStore } from "connect-redis";
import { log } from "./index";

const CACHE_PREFIX = "ecd:cache:";
const SESSION_PREFIX = "ecd:sess:";

let redisClient: RedisClientType | null = null;
let isReady = false;

function initClient(): RedisClientType | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    log("REDIS_URL not set — running without Redis", "redis");
    return null;
  }

  const client = createClient({ url }) as RedisClientType;

  client.on("ready", () => {
    isReady = true;
    log("Connected and ready", "redis");
  });

  client.on("error", (err) => {
    log(`Error: ${err.message}`, "redis");
  });

  client.on("reconnecting", () => {
    isReady = false;
    log("Reconnecting...", "redis");
  });

  client.on("end", () => {
    isReady = false;
    log("Connection closed", "redis");
  });

  return client;
}

export async function awaitRedisReady(timeoutMs = 3000): Promise<void> {
  redisClient = initClient();
  if (!redisClient) return;

  try {
    await Promise.race([
      redisClient.connect(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);
  } catch (err: any) {
    log(
      `Failed to connect within ${timeoutMs}ms (${err.message}). Continuing without Redis.`,
      "redis"
    );
    try { await redisClient.disconnect(); } catch {}
    redisClient = null;
    isReady = false;
  }
}

export function getSessionStore(): RedisStore | null {
  if (!redisClient || !isReady) return null;

  return new RedisStore({
    client: redisClient,
    prefix: SESSION_PREFIX,
  });
}

export async function cacheWrap<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const fullKey = CACHE_PREFIX + key;

  if (redisClient && isReady) {
    try {
      const cached = await redisClient.get(fullKey);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch {}

  }

  const data = await fetcher();

  if (redisClient && isReady) {
    try {
      await redisClient.set(fullKey, JSON.stringify(data), { EX: ttlSec });
    } catch {}

  }

  return data;
}

export async function invalidateCache(...patterns: string[]): Promise<void> {
  if (!redisClient || !isReady) return;

  for (const pattern of patterns) {
    try {
      if (pattern.includes("*")) {
        const scanPattern = CACHE_PREFIX + pattern;
        const keys: string[] = [];
        for await (const key of redisClient.scanIterator({
          MATCH: scanPattern,
          COUNT: 100,
        })) {
          if (Array.isArray(key)) {
            keys.push(...key);
          } else {
            keys.push(key as string);
          }
        }
        for (const k of keys) {
          await redisClient.del(k);
        }
      } else {
        await redisClient.del(CACHE_PREFIX + pattern);
      }
    } catch {}

  }
}

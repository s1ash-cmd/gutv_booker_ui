import Redis from "ioredis";

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  throw new Error("REDIS_URL не установлен");
};

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export function getRedis() {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(getRedisUrl());
  }

  return globalForRedis.redis;
}

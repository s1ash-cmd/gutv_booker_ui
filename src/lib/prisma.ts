import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __gutvPrisma: ReturnType<typeof createPrismaClient> | undefined;
}

function createPrismaClient() {
  const accelerateUrl = process.env.PRISMA_DATABASE_URL;

  if (!accelerateUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new PrismaClient({
    accelerateUrl,
  }).$extends(withAccelerate());
}

function getPrismaClient() {
  if (!global.__gutvPrisma) {
    global.__gutvPrisma = createPrismaClient();
  }

  return global.__gutvPrisma;
}

export const prisma = new Proxy({} as ReturnType<typeof createPrismaClient>, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient(), prop, receiver);
  },
});

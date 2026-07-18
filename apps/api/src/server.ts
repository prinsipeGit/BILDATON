import { loadConfig } from "@luca/config";
import { PrismaClient } from "@luca/database";
import { createClient } from "redis";
import { buildApp } from "./app.js";

const config = loadConfig(process.env);
const prisma = new PrismaClient();
const redis = createClient({ url: config.redisUrl });

const app = buildApp({
  corsOrigins: config.corsAllowedOrigins,
  readinessProbes: [
    { name: "database", check: async () => void (await prisma.$queryRaw`SELECT 1`) },
    {
      name: "redis",
      check: async () => {
        if (!redis.isOpen) await redis.connect();
        await redis.ping();
      }
    }
  ]
});
redis.on("error", (error) =>
  app.log.error({ errorName: error.name }, "Redis client error")
);

app.addHook("onClose", async () => {
  await prisma.$disconnect();
  if (redis.isOpen) await redis.quit();
});

try {
  await app.listen({ host: "0.0.0.0", port: config.port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}

import { loadConfig, loadMetaConfig, loadOpenAIConfig } from "@luca/config";
import { PrismaClient } from "@luca/database";
import { buildApp } from "./app.js";
import { getAdminDashboard } from "./admin-dashboard.js";
import { ChatbotProcessor } from "./chatbot-processor.js";
import { createMetaWebhookHandler } from "./meta-webhook.js";
import { updateRegistrarRequestStatus } from "./registrar-status.js";

const config = loadConfig(process.env);
const metaConfig = loadMetaConfig(process.env);
const openAIConfig = loadOpenAIConfig(process.env);
const adminDashboardToken = process.env.ADMIN_DASHBOARD_TOKEN?.trim();
const prisma = new PrismaClient();
const processor = new ChatbotProcessor(prisma, {
  openAIApiKey: openAIConfig.apiKey,
  openAIModel: openAIConfig.model,
  pageAccessToken: metaConfig.pageAccessToken,
  logError: (error, message) => app.log.error({ error }, message)
});

const app = buildApp({
  corsOrigins: config.corsAllowedOrigins,
  metaAppSecret: metaConfig.appSecret,
  metaVerifyToken: metaConfig.verifyToken,
  handleMetaWebhook: createMetaWebhookHandler(prisma, {
    onEventsStored: () => void processor.processPending()
  }),
  ...(adminDashboardToken ? { adminDashboardToken } : {}),
  getAdminDashboard: () => getAdminDashboard(prisma),
  updateRegistrarStatus: (input) => updateRegistrarRequestStatus(prisma, input),
  onRegistrarStatusUpdated: () => void processor.processPending(),
  readinessProbes: [
    { name: "database", check: async () => void (await prisma.$queryRaw`SELECT 1`) }
  ]
});
const processingInterval = setInterval(() => void processor.processPending(), 5_000);
processingInterval.unref();
void processor.processPending();

app.addHook("onClose", async () => {
  clearInterval(processingInterval);
  await prisma.$disconnect();
});

try {
  await app.listen({ host: "0.0.0.0", port: config.port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}

CREATE TABLE "ChatbotRule" (
  "id" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatbotRule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Message" ADD COLUMN "aiRunId" UUID;
ALTER TABLE "Message" ADD COLUMN "citations" JSONB;
ALTER TABLE "AiRun" ADD COLUMN "responseId" TEXT;
ALTER TABLE "AiRun" ADD COLUMN "knowledgeVersionIds" JSONB;
ALTER TABLE "AiRun" ADD COLUMN "errorCode" TEXT;

CREATE UNIQUE INDEX "ChatbotRule_institutionId_name_key" ON "ChatbotRule"("institutionId", "name");
CREATE INDEX "ChatbotRule_institutionId_active_priority_idx" ON "ChatbotRule"("institutionId", "active", "priority");
CREATE INDEX "Message_aiRunId_idx" ON "Message"("aiRunId");

ALTER TABLE "ChatbotRule" ADD CONSTRAINT "ChatbotRule_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_aiRunId_fkey"
  FOREIGN KEY ("aiRunId") REFERENCES "AiRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

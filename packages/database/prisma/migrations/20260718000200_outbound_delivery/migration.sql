-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'DELIVERED',
  'RETRYABLE_FAILURE',
  'PERMANENT_FAILURE'
);

-- CreateTable
CREATE TABLE "OutboundDelivery" (
  "id" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "recipientAddress" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" TEXT,
  "nextAttemptAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutboundDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboundDelivery_messageId_key" ON "OutboundDelivery"("messageId");
CREATE UNIQUE INDEX "OutboundDelivery_provider_idempotencyKey_key" ON "OutboundDelivery"("provider", "idempotencyKey");
CREATE INDEX "OutboundDelivery_status_nextAttemptAt_idx" ON "OutboundDelivery"("status", "nextAttemptAt");
CREATE INDEX "OutboundDelivery_institutionId_createdAt_idx" ON "OutboundDelivery"("institutionId", "createdAt");

ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

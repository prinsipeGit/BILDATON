CREATE TYPE "RegistrarRequestKind" AS ENUM ('DOCUMENT', 'APPOINTMENT');

CREATE TYPE "RegistrarRequestStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'NEEDS_INFORMATION',
  'SCHEDULED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE "RegistrarRequest" (
  "id" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "messengerIdentityId" UUID NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "kind" "RegistrarRequestKind" NOT NULL,
  "status" "RegistrarRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "currentStep" TEXT NOT NULL,
  "documentType" TEXT,
  "appointmentPurpose" TEXT,
  "preferredSchedule" TEXT,
  "studentNote" TEXT,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrarRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrarRequest_institutionId_referenceNumber_key"
  ON "RegistrarRequest"("institutionId", "referenceNumber");
CREATE INDEX "RegistrarRequest_institutionId_status_createdAt_idx"
  ON "RegistrarRequest"("institutionId", "status", "createdAt");
CREATE INDEX "RegistrarRequest_conversationId_status_idx"
  ON "RegistrarRequest"("conversationId", "status");

ALTER TABLE "RegistrarRequest"
  ADD CONSTRAINT "RegistrarRequest_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrarRequest"
  ADD CONSTRAINT "RegistrarRequest_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistrarRequest"
  ADD CONSTRAINT "RegistrarRequest_messengerIdentityId_fkey"
  FOREIGN KEY ("messengerIdentityId") REFERENCES "MessengerIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

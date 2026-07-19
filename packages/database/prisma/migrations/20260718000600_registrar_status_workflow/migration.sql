ALTER TYPE "RegistrarRequestStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "RegistrarRequestStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

CREATE TABLE "RegistrarStatusEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registrarRequestId" UUID NOT NULL,
  "fromStatus" "RegistrarRequestStatus" NOT NULL,
  "toStatus" "RegistrarRequestStatus" NOT NULL,
  "actorType" TEXT NOT NULL DEFAULT 'STAFF',
  "actorId" TEXT,
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrarStatusEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RegistrarStatusEvent"
  ADD CONSTRAINT "RegistrarStatusEvent_registrarRequestId_fkey"
  FOREIGN KEY ("registrarRequestId") REFERENCES "RegistrarRequest"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "RegistrarStatusEvent_notifiedAt_createdAt_idx"
  ON "RegistrarStatusEvent"("notifiedAt", "createdAt");

CREATE INDEX "RegistrarStatusEvent_registrarRequestId_createdAt_idx"
  ON "RegistrarStatusEvent"("registrarRequestId", "createdAt");

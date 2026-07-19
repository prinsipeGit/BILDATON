ALTER TYPE "RegistrarRequestStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';

ALTER TABLE "RegistrarRequest"
  ADD COLUMN "studentLastName" TEXT,
  ADD COLUMN "studentIdNumber" VARCHAR(6),
  ADD COLUMN "studentEmail" TEXT,
  ADD COLUMN "readyNotifiedAt" TIMESTAMP(3);

CREATE INDEX "RegistrarRequest_status_readyNotifiedAt_idx"
  ON "RegistrarRequest"("status", "readyNotifiedAt");

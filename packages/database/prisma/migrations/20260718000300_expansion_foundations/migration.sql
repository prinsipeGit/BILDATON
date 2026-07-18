CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "DepartmentActivationStatus" AS ENUM ('PLANNED', 'READY', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "KnowledgeAudience" AS ENUM ('STUDENT', 'STAFF');
CREATE TYPE "OrganizationRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_INFORMATION', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "VenueConfirmationStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'CONFIRMED', 'UNAVAILABLE');
CREATE TYPE "OrganizationReviewDecision" AS ENUM ('NEEDS_INFORMATION', 'APPROVED', 'REJECTED');

CREATE TABLE "DepartmentConfiguration" (
  "id" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "sourceOwnerUserId" UUID,
  "routingDestination" TEXT,
  "operatingHours" TEXT,
  "escalationRules" JSONB,
  "publicFaqEnabled" BOOLEAN NOT NULL DEFAULT false,
  "activationStatus" "DepartmentActivationStatus" NOT NULL DEFAULT 'PLANNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DepartmentConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepartmentConfiguration_departmentId_key" ON "DepartmentConfiguration"("departmentId");
CREATE INDEX "DepartmentConfiguration_activationStatus_publicFaqEnabled_idx" ON "DepartmentConfiguration"("activationStatus", "publicFaqEnabled");

ALTER TABLE "KnowledgeDocument" ADD COLUMN "audience" "KnowledgeAudience" NOT NULL DEFAULT 'STUDENT';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "sourceUri" TEXT;

CREATE TABLE "KnowledgeChunk" (
  "id" UUID NOT NULL,
  "documentVersionId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "embeddingModel" TEXT,
  "embedding" vector(1536),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeChunk_documentVersionId_chunkIndex_key" ON "KnowledgeChunk"("documentVersionId", "chunkIndex");
CREATE INDEX "KnowledgeChunk_institutionId_departmentId_idx" ON "KnowledgeChunk"("institutionId", "departmentId");
CREATE INDEX "KnowledgeChunk_embedding_idx" ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);

CREATE TABLE "Organization" (
  "id" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_institutionId_slug_key" ON "Organization"("institutionId", "slug");
CREATE INDEX "Organization_institutionId_enabled_idx" ON "Organization"("institutionId", "enabled");

CREATE TABLE "OrganizationOfficer" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationOfficer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationOfficer_organizationId_studentId_key" ON "OrganizationOfficer"("organizationId", "studentId");
CREATE INDEX "OrganizationOfficer_studentId_revokedAt_idx" ON "OrganizationOfficer"("studentId", "revokedAt");

CREATE TABLE "OrganizationRequest" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "submitterOfficerId" UUID NOT NULL,
  "reviewingDepartmentId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requestedStartAt" TIMESTAMP(3),
  "requestedEndAt" TIMESTAMP(3),
  "venueName" TEXT,
  "venueConfirmation" "VenueConfirmationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
  "status" "OrganizationRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationRequest_reviewingDepartmentId_status_createdAt_idx" ON "OrganizationRequest"("reviewingDepartmentId", "status", "createdAt");
CREATE INDEX "OrganizationRequest_organizationId_createdAt_idx" ON "OrganizationRequest"("organizationId", "createdAt");

CREATE TABLE "OrganizationRequestReview" (
  "id" UUID NOT NULL,
  "organizationRequestId" UUID NOT NULL,
  "reviewerUserId" UUID NOT NULL,
  "decision" "OrganizationReviewDecision" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationRequestReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationRequestReview_organizationRequestId_createdAt_idx" ON "OrganizationRequestReview"("organizationRequestId", "createdAt");

CREATE TABLE "OrganizationRequestFileLink" (
  "id" UUID NOT NULL,
  "organizationRequestId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationRequestFileLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationRequestFileLink_organizationRequestId_idx" ON "OrganizationRequestFileLink"("organizationRequestId");

CREATE TABLE "KnowledgeCitation" (
  "id" UUID NOT NULL,
  "aiRunId" UUID NOT NULL,
  "knowledgeChunkId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeCitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeCitation_aiRunId_knowledgeChunkId_key" ON "KnowledgeCitation"("aiRunId", "knowledgeChunkId");
CREATE INDEX "KnowledgeCitation_knowledgeChunkId_idx" ON "KnowledgeCitation"("knowledgeChunkId");

ALTER TABLE "DepartmentConfiguration" ADD CONSTRAINT "DepartmentConfiguration_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentConfiguration" ADD CONSTRAINT "DepartmentConfiguration_sourceOwnerUserId_fkey"
  FOREIGN KEY ("sourceOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "KnowledgeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationOfficer" ADD CONSTRAINT "OrganizationOfficer_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationOfficer" ADD CONSTRAINT "OrganizationOfficer_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationRequest" ADD CONSTRAINT "OrganizationRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationRequest" ADD CONSTRAINT "OrganizationRequest_submitterOfficerId_fkey"
  FOREIGN KEY ("submitterOfficerId") REFERENCES "OrganizationOfficer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationRequest" ADD CONSTRAINT "OrganizationRequest_reviewingDepartmentId_fkey"
  FOREIGN KEY ("reviewingDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationRequestReview" ADD CONSTRAINT "OrganizationRequestReview_organizationRequestId_fkey"
  FOREIGN KEY ("organizationRequestId") REFERENCES "OrganizationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationRequestReview" ADD CONSTRAINT "OrganizationRequestReview_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationRequestFileLink" ADD CONSTRAINT "OrganizationRequestFileLink_organizationRequestId_fkey"
  FOREIGN KEY ("organizationRequestId") REFERENCES "OrganizationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeCitation" ADD CONSTRAINT "KnowledgeCitation_aiRunId_fkey"
  FOREIGN KEY ("aiRunId") REFERENCES "AiRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeCitation" ADD CONSTRAINT "KnowledgeCitation_knowledgeChunkId_fkey"
  FOREIGN KEY ("knowledgeChunkId") REFERENCES "KnowledgeChunk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

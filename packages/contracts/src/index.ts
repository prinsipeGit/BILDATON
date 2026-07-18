export const ticketStatuses = [
  "NEW",
  "NEEDS_INFORMATION",
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_STUDENT",
  "RESOLVED",
  "CLOSED",
  "REOPENED"
] as const;

export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof ticketPriorities)[number];

export interface TicketSummary {
  id: string;
  referenceNumber: string;
  institutionId: string;
  departmentId: string;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestContext {
  requestId: string;
  institutionId: string;
  actorUserId: string | null;
  verifiedStudentId: string | null;
  departmentIds: readonly string[];
}

export const departmentActivationStatuses = ["PLANNED", "READY", "ACTIVE", "SUSPENDED"] as const;
export type DepartmentActivationStatus = (typeof departmentActivationStatuses)[number];

export interface DepartmentActivation {
  institutionId: string;
  departmentId: string;
  status: DepartmentActivationStatus;
  publicFaqEnabled: boolean;
  sourceOwnerUserId: string | null;
  routingDestination: string | null;
}

export interface VerifiedStudentAccess {
  studentId: string;
  verifiedAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface RetrievalQuery {
  institutionId: string;
  departmentId: string;
  audience: "STUDENT" | "STAFF";
  requestedAt: string;
  query: string;
}

export interface RetrievalCitation {
  documentId: string;
  documentVersionId: string;
  chunkId: string;
  title: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface RetrievedKnowledge {
  citation: RetrievalCitation;
  content: string;
}

export type OrganizationRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "NEEDS_INFORMATION"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type VenueConfirmationStatus = "NOT_REQUESTED" | "PENDING" | "CONFIRMED" | "UNAVAILABLE";

export interface OrganizationRequestInput {
  organizationId: string;
  submitterOfficerId: string;
  reviewingDepartmentId: string;
  title: string;
  description: string;
  requestedStartAt: string | null;
  requestedEndAt: string | null;
  venueName: string | null;
}

export interface VenueCalendarAdapter {
  checkAvailability(input: {
    venueName: string;
    startAt: string;
    endAt: string;
  }): Promise<{ status: VenueConfirmationStatus }>;
}

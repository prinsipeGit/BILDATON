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

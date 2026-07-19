import type { PrismaClient } from "@luca/database";

export const STAFF_REGISTRAR_STATUSES = ["APPROVED", "PROCESSING", "READY_FOR_PICKUP"] as const;

export type StaffRegistrarStatus = (typeof STAFF_REGISTRAR_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<StaffRegistrarStatus, readonly string[]> = {
  APPROVED: ["SUBMITTED", "IN_REVIEW", "NEEDS_INFORMATION"],
  PROCESSING: ["APPROVED"],
  READY_FOR_PICKUP: ["PROCESSING"]
};

export class RegistrarStatusError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "INVALID_TRANSITION" | "UNSUPPORTED_REQUEST",
    message: string
  ) {
    super(message);
  }
}

export function isStaffRegistrarStatus(value: unknown): value is StaffRegistrarStatus {
  return typeof value === "string" && STAFF_REGISTRAR_STATUSES.includes(value as StaffRegistrarStatus);
}

export async function updateRegistrarRequestStatus(
  prisma: PrismaClient,
  input: { requestId: string; status: StaffRegistrarStatus; actorId: string }
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.registrarRequest.findUnique({
      where: { id: input.requestId },
      select: { id: true, kind: true, status: true, referenceNumber: true }
    });

    if (!request) {
      throw new RegistrarStatusError("NOT_FOUND", "Registrar request was not found.");
    }
    if (request.kind !== "DOCUMENT") {
      throw new RegistrarStatusError(
        "UNSUPPORTED_REQUEST",
        "Only document requests use the pickup workflow right now."
      );
    }
    if (request.status === input.status) {
      return { request, changed: false, statusEventId: null };
    }
    if (!ALLOWED_TRANSITIONS[input.status].includes(request.status)) {
      throw new RegistrarStatusError(
        "INVALID_TRANSITION",
        `This request cannot move from ${friendlyStatus(request.status)} to ${friendlyStatus(input.status)}.`
      );
    }

    const [updated, event] = await Promise.all([
      tx.registrarRequest.update({
        where: { id: request.id },
        data: { status: input.status }
      }),
      tx.registrarStatusEvent.create({
        data: {
          registrarRequestId: request.id,
          fromStatus: request.status,
          toStatus: input.status,
          actorId: input.actorId
        }
      })
    ]);

    return { request: updated, changed: true, statusEventId: event.id };
  });
}

function friendlyStatus(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

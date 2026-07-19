import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@luca/database";

interface StoredMetaEvent {
  providerEventId: string;
  payload: Prisma.InputJsonObject;
}

export interface MetaWebhookHandlerOptions {
  onEventsStored?: () => void;
}

export function createMetaWebhookHandler(
  prisma: PrismaClient,
  options: MetaWebhookHandlerOptions = {}
) {
  return async (payload: unknown): Promise<void> => {
    const events = extractMetaEvents(payload);
    if (events.length === 0) return;

    const institutions = await prisma.institution.findMany({
      select: { id: true },
      take: 2
    });
    if (institutions.length !== 1) {
      throw new Error("Messenger webhook processing requires exactly one configured institution");
    }

    const result = await prisma.webhookEvent.createMany({
      data: events.map((event) => ({
        institutionId: institutions[0]!.id,
        provider: "META_MESSENGER",
        providerEventId: event.providerEventId,
        payload: event.payload
      })),
      skipDuplicates: true
    });
    if (result.count > 0) options.onEventsStored?.();
  };
}

export function extractMetaEvents(payload: unknown): StoredMetaEvent[] {
  if (!isJsonObject(payload) || payload.object !== "page" || !Array.isArray(payload.entry)) {
    throw new Error("Unsupported Meta webhook payload");
  }

  const events: StoredMetaEvent[] = [];
  for (const entry of payload.entry) {
    if (!isJsonObject(entry) || typeof entry.id !== "string" || !Array.isArray(entry.messaging)) {
      continue;
    }

    for (const messagingEvent of entry.messaging) {
      if (!isJsonObject(messagingEvent)) continue;

      const storedPayload: Prisma.InputJsonObject = {
        pageId: entry.id,
        entryTimestamp: asJsonValue(entry.time),
        event: messagingEvent
      };
      events.push({
        providerEventId: getProviderEventId(entry.id, messagingEvent),
        payload: storedPayload
      });
    }
  }

  return events;
}

function getProviderEventId(pageId: string, event: Prisma.InputJsonObject): string {
  const message = event.message;
  if (isJsonObject(message) && typeof message.mid === "string") return message.mid;

  return createHash("sha256")
    .update(pageId)
    .update("\0")
    .update(JSON.stringify(event))
    .digest("hex");
}

function isJsonObject(value: unknown): value is Prisma.InputJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    isJsonObject(value)
  ) {
    return value;
  }
  return null;
}

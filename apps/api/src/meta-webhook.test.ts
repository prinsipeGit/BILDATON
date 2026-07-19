import { describe, expect, it } from "vitest";
import { extractMetaEvents } from "./meta-webhook.js";

describe("Meta webhook event extraction", () => {
  it("uses the Messenger message ID for replay protection", () => {
    const events = extractMetaEvents({
      object: "page",
      entry: [
        {
          id: "page-123",
          time: 1_700_000_000_000,
          messaging: [
            {
              sender: { id: "sender-123" },
              recipient: { id: "page-123" },
              timestamp: 1_700_000_000_000,
              message: { mid: "message-123", text: "Hello" }
            }
          ]
        }
      ]
    });

    expect(events).toEqual([
      {
        providerEventId: "message-123",
        payload: {
          pageId: "page-123",
          entryTimestamp: 1_700_000_000_000,
          event: {
            sender: { id: "sender-123" },
            recipient: { id: "page-123" },
            timestamp: 1_700_000_000_000,
            message: { mid: "message-123", text: "Hello" }
          }
        }
      }
    ]);
  });

  it("creates a stable ID for events without a message ID", () => {
    const payload = {
      object: "page",
      entry: [{ id: "page-123", messaging: [{ postback: { payload: "START" } }] }]
    };

    expect(extractMetaEvents(payload)[0]?.providerEventId).toBe(
      extractMetaEvents(payload)[0]?.providerEventId
    );
  });

  it("rejects payloads that are not Page webhooks", () => {
    expect(() => extractMetaEvents({ object: "instagram", entry: [] })).toThrow(
      "Unsupported Meta webhook payload"
    );
  });
});

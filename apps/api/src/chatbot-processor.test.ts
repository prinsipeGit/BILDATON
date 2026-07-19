import { describe, expect, it } from "vitest";
import {
  parseInboundMessengerMessage,
  readyForPickupMessage,
  registrarStatusMessage
} from "./chatbot-processor.js";

describe("Messenger message parsing", () => {
  it("extracts a text message from the stored webhook payload", () => {
    expect(
      parseInboundMessengerMessage({
        pageId: "page-123",
        event: {
          sender: { id: "sender-123" },
          timestamp: 1_700_000_000_000,
          message: { mid: "message-123", text: "  Hello Luca  " }
        }
      })
    ).toEqual({
      pageId: "page-123",
      senderId: "sender-123",
      providerMessageId: "message-123",
      text: "Hello Luca",
      sentAt: new Date(1_700_000_000_000)
    });
  });

  it("ignores delivery echoes and non-text messages", () => {
    expect(
      parseInboundMessengerMessage({
        pageId: "page-123",
        event: {
          sender: { id: "sender-123" },
          message: { mid: "message-123", text: "echo", is_echo: true }
        }
      })
    ).toBeNull();
    expect(
      parseInboundMessengerMessage({
        pageId: "page-123",
        event: { sender: { id: "sender-123" }, message: { mid: "message-123" } }
      })
    ).toBeNull();
  });
});

describe("Registrar pickup notification", () => {
  it("includes the document and tracking reference without inventing pickup details", () => {
    const message = readyForPickupMessage("Transcript of Records", "REG-20260718-ABC123");

    expect(message).toContain("Transcript of Records is ready for pickup");
    expect(message).toContain("REG-20260718-ABC123");
    expect(message).toContain("valid ID");
    expect(message).not.toContain("8:00 AM");
  });

  it("clearly distinguishes approval, processing, and pickup updates", () => {
    const approved = registrarStatusMessage("APPROVED", "Diploma", "REG-123");
    const processing = registrarStatusMessage("PROCESSING", "Diploma", "REG-123");
    const ready = registrarStatusMessage("READY_FOR_PICKUP", "Diploma", "REG-123");

    expect(approved).toContain("has been approved");
    expect(approved).toContain("REG-123");
    expect(processing).toContain("now processing");
    expect(processing).toContain("not ready for pickup yet");
    expect(ready).toContain("ready for pickup");
  });
});

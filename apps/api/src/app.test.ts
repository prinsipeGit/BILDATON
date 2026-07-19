import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { buildApp } from "./app.js";

describe("health endpoint", () => {
  it("reports process health without leaking configuration", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "luca-api",
      status: "OPERATIONAL"
    });

    await app.close();
  });

  it("allows a configured Pages origin to read service health", async () => {
    const app = buildApp({ corsOrigins: ["https://prinsipegit.github.io"] });
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://prinsipegit.github.io" }
    });

    expect(response.headers["access-control-allow-origin"]).toBe("https://prinsipegit.github.io");
    expect(response.headers.vary).toBe("Origin");
    await app.close();
  });

  it("does not allow an unconfigured cross-origin request", async () => {
    const app = buildApp({ corsOrigins: ["https://prinsipegit.github.io"] });
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://untrusted.example" }
    });

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    await app.close();
  });

  it("responds to a configured-origin CORS preflight", async () => {
    const app = buildApp({ corsOrigins: ["https://prinsipegit.github.io"] });
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "https://prinsipegit.github.io" }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toBe("GET, OPTIONS");
    await app.close();
  });
});

describe("readiness endpoint", () => {
  it("does not claim readiness when no dependency probes are configured", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      service: "luca-api",
      status: "NOT_READY",
      dependencies: {}
    });
    await app.close();
  });

  it("reports ready when all dependencies respond", async () => {
    const app = buildApp({
      readinessProbes: [
        { name: "database", check: async () => undefined },
        { name: "redis", check: async () => undefined }
      ]
    });

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "luca-api",
      status: "READY",
      dependencies: { database: "UP", redis: "UP" }
    });
    await app.close();
  });

  it("reports unavailable without leaking dependency errors", async () => {
    const app = buildApp({
      readinessProbes: [
        { name: "database", check: async () => undefined },
        { name: "redis", check: async () => Promise.reject(new Error("secret connection details")) }
      ]
    });

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      service: "luca-api",
      status: "NOT_READY",
      dependencies: { database: "UP", redis: "DOWN" }
    });
    expect(response.body).not.toContain("secret connection details");
    await app.close();
  });
});

describe("admin dashboard endpoint", () => {
  it("allows loopback access when no shared token is configured", async () => {
    const app = buildApp({ getAdminDashboard: async () => ({ metrics: { conversations: 1 } }) });
    const response = await app.inject({ method: "GET", url: "/admin/dashboard" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ metrics: { conversations: 1 } });
    await app.close();
  });

  it("requires the configured shared token", async () => {
    const app = buildApp({
      adminDashboardToken: "dashboard-secret",
      getAdminDashboard: async () => ({ ok: true })
    });
    const rejected = await app.inject({ method: "GET", url: "/admin/dashboard" });
    const accepted = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
      headers: { authorization: "Bearer dashboard-secret" }
    });

    expect(rejected.statusCode).toBe(401);
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toEqual({ ok: true });
    await app.close();
  });
});

describe("admin Registrar status endpoint", () => {
  it("accepts an authorized staff status update and triggers notification processing", async () => {
    const updates: unknown[] = [];
    let notificationTriggered = false;
    const app = buildApp({
      adminDashboardToken: "dashboard-secret",
      updateRegistrarStatus: async (input) => {
        updates.push(input);
        return { changed: true, request: { id: input.requestId, status: input.status } };
      },
      onRegistrarStatusUpdated: () => void (notificationTriggered = true)
    });
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/registrar/requests/request-123/status",
      headers: {
        authorization: "Bearer dashboard-secret",
        "content-type": "application/json"
      },
      payload: JSON.stringify({ status: "APPROVED", actorId: "registrar@example.edu" })
    });

    expect(response.statusCode).toBe(200);
    expect(updates).toEqual([{
      requestId: "request-123",
      status: "APPROVED",
      actorId: "registrar@example.edu"
    }]);
    expect(notificationTriggered).toBe(true);
    await app.close();
  });

  it("rejects invalid statuses and unauthorized requests", async () => {
    let updateCount = 0;
    const app = buildApp({
      adminDashboardToken: "dashboard-secret",
      updateRegistrarStatus: async () => void (updateCount += 1)
    });
    const unauthorized = await app.inject({
      method: "PATCH",
      url: "/admin/registrar/requests/request-123/status",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ status: "READY_FOR_PICKUP" })
    });
    const invalid = await app.inject({
      method: "PATCH",
      url: "/admin/registrar/requests/request-123/status",
      headers: {
        authorization: "Bearer dashboard-secret",
        "content-type": "application/json"
      },
      payload: JSON.stringify({ status: "COMPLETED" })
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(invalid.statusCode).toBe(400);
    expect(updateCount).toBe(0);
    await app.close();
  });
});

describe("Meta Messenger webhook verification", () => {
  it("returns Meta's challenge when the verification token matches", async () => {
    const app = buildApp({ metaVerifyToken: "test-verification-token" });
    const response = await app.inject({
      method: "GET",
      url:
        "/webhooks/meta/messenger" +
        "?hub.mode=subscribe" +
        "&hub.verify_token=test-verification-token" +
        "&hub.challenge=123456"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toBe("123456");
    await app.close();
  });

  it("rejects an incorrect verification token", async () => {
    const app = buildApp({ metaVerifyToken: "correct-token" });
    const response = await app.inject({
      method: "GET",
      url:
        "/webhooks/meta/messenger" +
        "?hub.mode=subscribe" +
        "&hub.verify_token=wrong-token" +
        "&hub.challenge=123456"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Webhook verification failed" });
    await app.close();
  });

  it("rejects verification when the server token is not configured", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url:
        "/webhooks/meta/messenger" +
        "?hub.mode=subscribe" +
        "&hub.verify_token=anything" +
        "&hub.challenge=123456"
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });
});

describe("Meta Messenger webhook delivery", () => {
  const appSecret = "test-app-secret";
  const payload = JSON.stringify({ object: "page", entry: [] });
  const signature = `sha256=${createHmac("sha256", appSecret).update(payload).digest("hex")}`;

  it("accepts a correctly signed event and hands it to the processor", async () => {
    const received: unknown[] = [];
    const app = buildApp({
      metaAppSecret: appSecret,
      handleMetaWebhook: async (event) => void received.push(event)
    });
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/meta/messenger",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature
      },
      payload
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("EVENT_RECEIVED");
    expect(received).toEqual([{ object: "page", entry: [] }]);
    await app.close();
  });

  it("rejects an invalid signature without processing the event", async () => {
    let processed = false;
    const app = buildApp({
      metaAppSecret: appSecret,
      handleMetaWebhook: async () => void (processed = true)
    });
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/meta/messenger",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${"0".repeat(64)}`
      },
      payload
    });

    expect(response.statusCode).toBe(401);
    expect(processed).toBe(false);
    await app.close();
  });

  it("refuses to acknowledge an event when processing is unavailable", async () => {
    const app = buildApp({ metaAppSecret: appSecret });
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/meta/messenger",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature
      },
      payload
    });

    expect(response.statusCode).toBe(503);
    await app.close();
  });
});

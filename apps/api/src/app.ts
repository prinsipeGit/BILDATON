import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isStaffRegistrarStatus,
  RegistrarStatusError,
  type StaffRegistrarStatus
} from "./registrar-status.js";

export interface ReadinessProbe {
  name: string;
  check(): Promise<void>;
}

export interface BuildAppOptions {
  readinessProbes?: readonly ReadinessProbe[];
  corsOrigins?: readonly string[];
  metaAppSecret?: string;
  metaVerifyToken?: string;
  handleMetaWebhook?: (payload: unknown) => Promise<void>;
  adminDashboardToken?: string;
  getAdminDashboard?: () => Promise<unknown>;
  updateRegistrarStatus?: (input: {
    requestId: string;
    status: StaffRegistrarStatus;
    actorId: string;
  }) => Promise<unknown>;
  onRegistrarStatusUpdated?: () => void;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url.replace(/\?.*$/, ""),
            hostname: request.hostname,
            remoteAddress: request.ip
          };
        }
      },
      redact: [
        "req.headers.authorization",
        "req.headers.x-hub-signature-256",
        "request.body",
        "response.body"
      ]
    }
  });

  app.register(sensible);

  const corsOrigins = new Set(options.corsOrigins ?? []);
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;
    if (!origin || !corsOrigins.has(origin)) return;

    reply.header("access-control-allow-origin", origin);
    reply.header("access-control-allow-methods", "GET, OPTIONS");
    reply.header("access-control-allow-headers", "Content-Type");
    reply.header("vary", "Origin");

    if (request.method === "OPTIONS") return reply.code(204).send();
  });

  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body)
  );

  app.get("/health", async () => ({
    service: "luca-api",
    status: "OPERATIONAL"
  }));

  app.get("/ready", async (_request, reply) => {
    const checks = await Promise.all(
      (options.readinessProbes ?? []).map(async (probe) => {
        try {
          await probe.check();
          return [probe.name, "UP"] as const;
        } catch {
          return [probe.name, "DOWN"] as const;
        }
      })
    );
    const dependencies = Object.fromEntries(checks);
    const ready = checks.length > 0 && checks.every(([, status]) => status === "UP");

    return reply.code(ready ? 200 : 503).send({
      service: "luca-api",
      status: ready ? "READY" : "NOT_READY",
      dependencies
    });
  });

  app.get("/admin/dashboard", async (request, reply) => {
    if (!isAuthorizedAdminRequest(request.headers.authorization, request.ip, options.adminDashboardToken)) {
      return reply.code(401).send({ error: "Dashboard access is unauthorized" });
    }
    if (!options.getAdminDashboard) {
      return reply.code(503).send({ error: "Dashboard data is unavailable" });
    }

    return reply.send(await options.getAdminDashboard());
  });

  app.patch<{ Params: { requestId: string }; Body: Buffer }>(
    "/admin/registrar/requests/:requestId/status",
    async (request, reply) => {
      if (!isAuthorizedAdminRequest(request.headers.authorization, request.ip, options.adminDashboardToken)) {
        return reply.code(401).send({ error: "Dashboard access is unauthorized" });
      }
      if (!options.updateRegistrarStatus) {
        return reply.code(503).send({ error: "Registrar status updates are unavailable" });
      }

      let body: unknown;
      try {
        body = JSON.parse(request.body.toString("utf8"));
      } catch {
        return reply.code(400).send({ error: "Invalid JSON payload" });
      }
      if (!isObject(body) || !isStaffRegistrarStatus(body.status)) {
        return reply.code(400).send({ error: "Status must be APPROVED, PROCESSING, or READY_FOR_PICKUP" });
      }
      const actorId = typeof body.actorId === "string" ? body.actorId.trim().slice(0, 320) : "dashboard-worker";

      try {
        const result = await options.updateRegistrarStatus({
          requestId: request.params.requestId,
          status: body.status,
          actorId: actorId || "dashboard-worker"
        });
        options.onRegistrarStatusUpdated?.();
        return reply.send(result);
      } catch (error) {
        if (error instanceof RegistrarStatusError) {
          const statusCode = error.code === "NOT_FOUND" ? 404 : 409;
          return reply.code(statusCode).send({ error: error.message, code: error.code });
        }
        throw error;
      }
    }
  );

  app.get<{
    Querystring: {
      "hub.mode"?: string;
      "hub.verify_token"?: string;
      "hub.challenge"?: string;
    };
  }>("/webhooks/meta/messenger", async (request, reply) => {
    const mode = request.query["hub.mode"];
    const verifyToken = request.query["hub.verify_token"];
    const challenge = request.query["hub.challenge"];

    if (
      mode !== "subscribe" ||
      !options.metaVerifyToken ||
      verifyToken !== options.metaVerifyToken ||
      !challenge
    ) {
      return reply.code(403).send({ error: "Webhook verification failed" });
    }

    return reply.code(200).type("text/plain").send(challenge);
  });

  app.post<{ Body: Buffer }>("/webhooks/meta/messenger", async (request, reply) => {
    const signature = request.headers["x-hub-signature-256"];

    if (
      !options.metaAppSecret ||
      typeof signature !== "string" ||
      !isValidMetaSignature(request.body, signature, options.metaAppSecret)
    ) {
      return reply.code(401).send({ error: "Invalid webhook signature" });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(request.body.toString("utf8"));
    } catch {
      return reply.code(400).send({ error: "Invalid JSON payload" });
    }

    if (!options.handleMetaWebhook) {
      return reply.code(503).send({ error: "Webhook processing is unavailable" });
    }

    await options.handleMetaWebhook(payload);
    return reply.code(200).send("EVENT_RECEIVED");
  });

  return app;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidMetaSignature(body: Buffer, signature: string, appSecret: string): boolean {
  const prefix = "sha256=";
  if (!signature.startsWith(prefix)) return false;

  const suppliedDigest = signature.slice(prefix.length);
  if (!/^[a-f0-9]{64}$/i.test(suppliedDigest)) return false;

  const expected = Buffer.from(createHmac("sha256", appSecret).update(body).digest("hex"), "hex");
  const supplied = Buffer.from(suppliedDigest, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function isAuthorizedAdminRequest(
  authorization: string | undefined,
  requestIp: string,
  configuredToken: string | undefined
): boolean {
  if (!configuredToken) return requestIp === "127.0.0.1" || requestIp === "::1";

  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBuffer = Buffer.from(configuredToken);
  const suppliedBuffer = Buffer.from(supplied);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

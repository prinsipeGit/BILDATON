import sensible from "@fastify/sensible";
import Fastify from "fastify";

export interface ReadinessProbe {
  name: string;
  check(): Promise<void>;
}

export interface BuildAppOptions {
  readinessProbes?: readonly ReadinessProbe[];
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      redact: [
        "req.headers.authorization",
        "req.headers.x-hub-signature-256",
        "request.body",
        "response.body"
      ]
    }
  });

  app.register(sensible);

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

  return app;
}

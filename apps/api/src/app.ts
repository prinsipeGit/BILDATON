import sensible from "@fastify/sensible";
import Fastify from "fastify";

export function buildApp() {
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

  return app;
}

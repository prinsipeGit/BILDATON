import { describe, expect, it } from "vitest";
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

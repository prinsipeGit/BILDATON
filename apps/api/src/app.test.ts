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
});

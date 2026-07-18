import { describe, expect, it } from "vitest";
import { loadConfig, loadMetaConfig, loadRagConfig } from "./index.js";

const validEnvironment = {
  NODE_ENV: "test",
  PORT: "3001",
  DATABASE_URL: "postgresql://user:password@example.test:5432/postgres",
  REDIS_URL: "redis://localhost:6379"
};

describe("loadConfig", () => {
  it("loads validated core service configuration", () => {
    expect(loadConfig(validEnvironment)).toEqual({
      nodeEnv: "test",
      port: 3001,
      databaseUrl: validEnvironment.DATABASE_URL,
      redisUrl: validEnvironment.REDIS_URL
    });
  });

  it("rejects a missing database URL", () => {
    expect(() => loadConfig({ ...validEnvironment, DATABASE_URL: undefined })).toThrow(
      "DATABASE_URL is required"
    );
  });

  it("rejects an unsupported Redis protocol", () => {
    expect(() => loadConfig({ ...validEnvironment, REDIS_URL: "https://example.test" })).toThrow(
      "REDIS_URL must use redis: or rediss:"
    );
  });
});

describe("loadMetaConfig", () => {
  it("rejects placeholder integration secrets", () => {
    expect(() =>
      loadMetaConfig({
        META_APP_SECRET: "replace-me",
        META_VERIFY_TOKEN: "token",
        META_PAGE_ACCESS_TOKEN: "page-token"
      })
    ).toThrow("META_APP_SECRET is required");
  });
});

describe("loadRagConfig", () => {
  it("uses secure credentials with explicit model defaults", () => {
    expect(loadRagConfig({ OPENAI_API_KEY: "test-key" })).toEqual({
      apiKey: "test-key",
      embeddingModel: "text-embedding-3-small",
      answerModel: "gpt-4.1-mini"
    });
  });
});

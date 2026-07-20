import { describe, expect, it } from "vitest";
import { loadConfig, loadMetaConfig, loadRagConfig } from "./index.js";

const validEnvironment = {
  NODE_ENV: "test",
  PORT: "3001",
  DATABASE_URL: "postgresql://user:password@example.test:5432/postgres"
};

describe("loadConfig", () => {
  it("loads validated core service configuration", () => {
    expect(loadConfig(validEnvironment)).toEqual({
      nodeEnv: "test",
      port: 3001,
      databaseUrl: validEnvironment.DATABASE_URL,
      corsAllowedOrigins: []
    });
  });

  it("rejects a missing database URL", () => {
    expect(() => loadConfig({ ...validEnvironment, DATABASE_URL: undefined })).toThrow(
      "DATABASE_URL is required"
    );
  });

  it("accepts an explicit list of public web origins", () => {
    expect(loadConfig({
      ...validEnvironment,
      CORS_ALLOWED_ORIGINS: "https://prinsipegit.github.io,http://localhost:4173"
    }).corsAllowedOrigins).toEqual(["https://prinsipegit.github.io", "http://localhost:4173"]);
  });

  it("rejects a CORS origin with a path", () => {
    expect(() => loadConfig({
      ...validEnvironment,
      CORS_ALLOWED_ORIGINS: "https://prinsipegit.github.io/BILDATON"
    })).toThrow("CORS_ALLOWED_ORIGINS must contain HTTP or HTTPS origins without paths");
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
      answerModel: "gpt-4o-mini"
    });
  });
});

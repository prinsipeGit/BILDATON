export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  redisUrl: string;
  corsAllowedOrigins: readonly string[];
}

export function loadConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const nodeEnv = environment.NODE_ENV ?? "development";
  if (!isNodeEnvironment(nodeEnv)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }

  const port = Number(environment.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer from 1 through 65535");
  }

  const databaseUrl = requireUrl(environment, "DATABASE_URL", ["postgres:", "postgresql:"]);
  const redisUrl = requireUrl(environment, "REDIS_URL", ["redis:", "rediss:"]);
  const corsAllowedOrigins = parseCorsAllowedOrigins(environment.CORS_ALLOWED_ORIGINS);

  return { nodeEnv, port, databaseUrl, redisUrl, corsAllowedOrigins };
}

export interface MetaConfig {
  appSecret: string;
  verifyToken: string;
  pageAccessToken: string;
}

export interface RagConfig {
  apiKey: string;
  embeddingModel: string;
  answerModel: string;
}

export function loadMetaConfig(environment: NodeJS.ProcessEnv): MetaConfig {
  return {
    appSecret: requireSecret(environment, "META_APP_SECRET"),
    verifyToken: requireSecret(environment, "META_VERIFY_TOKEN"),
    pageAccessToken: requireSecret(environment, "META_PAGE_ACCESS_TOKEN")
  };
}

export function loadRagConfig(environment: NodeJS.ProcessEnv): RagConfig {
  return {
    apiKey: requireSecret(environment, "OPENAI_API_KEY"),
    embeddingModel: environment.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
    answerModel: environment.OPENAI_ANSWER_MODEL?.trim() || "gpt-4.1-mini"
  };
}

function isNodeEnvironment(value: string): value is AppConfig["nodeEnv"] {
  return value === "development" || value === "test" || value === "production";
}

function requireUrl(
  environment: NodeJS.ProcessEnv,
  name: string,
  allowedProtocols: readonly string[]
): string {
  const value = requireSecret(environment, name);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (!allowedProtocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${allowedProtocols.join(" or ")}`);
  }
  return value;
}

function requireSecret(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value || value === "replace-me") {
    throw new Error(`${name} is required and must not be a placeholder`);
  }
  return value;
}

function parseCorsAllowedOrigins(value: string | undefined): readonly string[] {
  if (!value?.trim()) return [];

  return value.split(",").map((item) => item.trim()).filter(Boolean).map((origin) => {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error("CORS_ALLOWED_ORIGINS must contain valid origins");
    }
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) {
      throw new Error("CORS_ALLOWED_ORIGINS must contain HTTP or HTTPS origins without paths");
    }
    return origin;
  });
}

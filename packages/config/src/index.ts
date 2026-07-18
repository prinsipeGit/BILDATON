export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  redisUrl: string;
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

  return { nodeEnv, port, databaseUrl, redisUrl };
}

export interface MetaConfig {
  appSecret: string;
  verifyToken: string;
  pageAccessToken: string;
}

export function loadMetaConfig(environment: NodeJS.ProcessEnv): MetaConfig {
  return {
    appSecret: requireSecret(environment, "META_APP_SECRET"),
    verifyToken: requireSecret(environment, "META_VERIFY_TOKEN"),
    pageAccessToken: requireSecret(environment, "META_PAGE_ACCESS_TOKEN")
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

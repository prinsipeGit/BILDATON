export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
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

  return { nodeEnv, port };
}

function isNodeEnvironment(value: string): value is AppConfig["nodeEnv"] {
  return value === "development" || value === "test" || value === "production";
}

import { loadConfig } from "@luca/config";
import { buildApp } from "./app.js";

const config = loadConfig(process.env);
const app = buildApp();

try {
  await app.listen({ host: "0.0.0.0", port: config.port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}

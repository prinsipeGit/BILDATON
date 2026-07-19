import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the Luca dashboard instead of the starter preview", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Luca Messenger Operations/);
  assert.match(page, /Student conversations/);
  assert.match(page, /Published knowledge/);
  assert.match(page, /Chatbot rules/);
  assert.match(page, /redirect\(chatGPTSignInPath\("\/"\)\)/);
  assert.match(layout, /Luca Messenger Operations/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

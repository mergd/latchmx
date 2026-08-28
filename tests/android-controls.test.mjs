import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("Android controls with isolated native module mocks", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/android-controls.cases.mjs"],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
    },
  );
  expect(result.status, result.stdout + result.stderr).toBe(0);
});

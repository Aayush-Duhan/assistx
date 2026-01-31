import { describe, expect, it } from "vitest";
import { detectConfigChanges } from "../mcp-config-diff";

describe("mcp-config-diff", () => {
  it("detects add, remove, update", () => {
    const prev = { a: { command: "node" }, b: { url: "https://x" } } as any;
    const next = { a: { command: "bash" }, c: { command: "python" } } as any;
    const changes = detectConfigChanges(prev, next);
    const types = changes.map((c) => c.type).toSorted();
    expect(types).toEqual(["add", "remove", "update"]);
  });
});

import { describe, expect, it } from "vitest";
import { createMCPToolId, extractMCPToolId, sanitizeFunctionName } from "../mcp-tool-id";

describe("mcp-tool-id", () => {
  it("sanitizes names", () => {
    expect(sanitizeFunctionName("1abc")).toMatch(/^_/);
    expect(sanitizeFunctionName("a b c")).toBe("a_b_c");
  });

  it("creates combined tool id with separator", () => {
    const id = createMCPToolId("server#name", "tool@name");
    expect(id.includes("_")).toBe(true);
    const result = extractMCPToolId(id);
    expect(result).not.toBeNull();
    expect(result!.serverName.length).toBeGreaterThan(0);
    expect(result!.toolName.length).toBeGreaterThan(0);
  });
});

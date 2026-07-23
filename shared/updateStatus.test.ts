import { describe, it, expect } from "vitest";
import { compareVersions } from "./updateStatus";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("0.0.1", "0.0.1")).toBe(0);
  });

  it("detects newer and older versions", () => {
    expect(compareVersions("1.2.4", "1.2.3")).toBe(1);
    expect(compareVersions("1.2.3", "1.2.4")).toBe(-1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("0.0.1", "0.1.0")).toBe(-1);
  });

  it("handles unequal segment lengths", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1.2.1", "1.2")).toBe(1);
    expect(compareVersions("1.2", "1.2.1")).toBe(-1);
  });

  it("strips v prefix, pre-release, and build metadata", () => {
    expect(compareVersions("v1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.3-beta.1", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.3+build.1", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.4-rc.1", "1.2.3")).toBe(1);
  });
});

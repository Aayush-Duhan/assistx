import { beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "./logger";

describe("Logger", () => {
  describe("Factory", () => {
    it("creates Logger instances via Logger.create()", () => {
      const logger = Logger.create("test-context");
      expect(logger).toBeInstanceOf(Logger);
    });

    it("creates Logger with custom config", () => {
      const logger = Logger.create("test", { level: "warn" });
      expect(logger.getLevel()).toBe("warn");
    });
  });

  describe("Log Methods", () => {
    let output: object[];
    let logger: Logger;

    beforeEach(() => {
      // Capture pino output by mocking the internal instance
      output = [];
      logger = Logger.create("test", { level: "trace" });

      // Mock the internal pino methods to capture output
      const mockLog = (level: string) => (obj: object) => {
        output.push({ level, ...obj });
      };

      (logger as any).pinoInstance.trace = mockLog("trace");
      (logger as any).pinoInstance.debug = mockLog("debug");
      (logger as any).pinoInstance.info = mockLog("info");
      (logger as any).pinoInstance.warn = mockLog("warn");
      (logger as any).pinoInstance.error = mockLog("error");
      (logger as any).pinoInstance.fatal = mockLog("fatal");
    });

    it("trace() emits correct log structure", () => {
      logger.trace("test.event", "Test message", { data: "value" });
      expect(output[0]).toMatchObject({
        level: "trace",
        event: "test.event",
        msg: "Test message",
        data: "value",
      });
    });

    it("debug() emits correct log structure", () => {
      logger.debug("debug.event", "Debug message");
      expect(output[0]).toMatchObject({
        level: "debug",
        event: "debug.event",
        msg: "Debug message",
      });
    });

    it("info() emits correct log structure", () => {
      logger.info("info.event", "Info message", { key: 123 });
      expect(output[0]).toMatchObject({
        level: "info",
        event: "info.event",
        msg: "Info message",
        key: 123,
      });
    });

    it("warn() emits correct log structure", () => {
      logger.warn("warn.event", "Warning message");
      expect(output[0]).toMatchObject({
        level: "warn",
        event: "warn.event",
        msg: "Warning message",
      });
    });
  });

  describe("Error Logging", () => {
    let output: object[];
    let logger: Logger;

    beforeEach(() => {
      output = [];
      logger = Logger.create("test", { level: "trace" });

      const mockLog = (level: string) => (obj: object) => {
        output.push({ level, ...obj });
      };

      (logger as any).pinoInstance.error = mockLog("error");
      (logger as any).pinoInstance.fatal = mockLog("fatal");
    });

    it("error() without Error object emits correct structure", () => {
      logger.error("error.event", "Error message", { detail: "info" });
      expect(output[0]).toMatchObject({
        level: "error",
        event: "error.event",
        msg: "Error message",
        detail: "info",
      });
      expect(output[0]).not.toHaveProperty("err");
    });

    it("error() with Error object includes err property", () => {
      const error = new Error("Test error");
      logger.error(error, "error.event", "Error occurred", { extra: "data" });
      expect(output[0]).toMatchObject({
        level: "error",
        event: "error.event",
        msg: "Error occurred",
        extra: "data",
      });
      expect((output[0] as any).err).toBe(error);
    });

    it("fatal() without Error object emits correct structure", () => {
      logger.fatal("fatal.event", "Fatal message");
      expect(output[0]).toMatchObject({
        level: "fatal",
        event: "fatal.event",
        msg: "Fatal message",
      });
    });

    it("fatal() with Error object includes err property", () => {
      const error = new Error("Fatal error");
      logger.fatal(error, "fatal.event", "Fatal occurred");
      expect(output[0]).toMatchObject({
        level: "fatal",
        event: "fatal.event",
        msg: "Fatal occurred",
      });
      expect((output[0] as any).err).toBe(error);
    });

    it("Error stack and message are preserved when logging errors", () => {
      const error = new Error("Preserved error message");
      error.stack = "Error: Preserved error message\n    at Test.run";
      logger.error(error, "error.event", "Error occurred");
      const loggedError = (output[0] as any).err;
      expect(loggedError.message).toBe("Preserved error message");
      expect(loggedError.stack).toBe("Error: Preserved error message\n    at Test.run");
    });
  });

  describe("Payload Sanitization", () => {
    let output: object[];
    let logger: Logger;

    beforeEach(() => {
      output = [];
      logger = Logger.create("test", { level: "trace" });

      (logger as any).pinoInstance.info = (obj: object) => {
        output.push(obj);
      };
    });

    it("prefixes reserved field 'msg' with underscore", () => {
      logger.info("test.event", "Real message", { msg: "payload msg" });
      expect(output[0]).toMatchObject({
        msg: "Real message",
        _msg: "payload msg",
      });
    });

    it("prefixes reserved field 'err' with underscore", () => {
      logger.info("test.event", "Message", { err: "not a real error" });
      expect(output[0]).toMatchObject({
        _err: "not a real error",
      });
    });

    it("prefixes reserved field 'level' with underscore", () => {
      logger.info("test.event", "Message", { level: "custom" });
      expect(output[0]).toMatchObject({
        _level: "custom",
      });
    });

    it("prefixes reserved field 'event' with underscore", () => {
      logger.info("real.event", "Message", { event: "payload event" });
      expect(output[0]).toMatchObject({
        event: "real.event",
        _event: "payload event",
      });
    });

    it("prefixes multiple reserved fields", () => {
      logger.info("test.event", "Message", {
        msg: "a",
        err: "b",
        level: "c",
        time: "d",
        normal: "e",
      });
      expect(output[0]).toMatchObject({
        msg: "Message",
        _msg: "a",
        _err: "b",
        _level: "c",
        _time: "d",
        normal: "e",
      });
    });

    it("prefixes reserved field 'service' with underscore", () => {
      logger.info("test.event", "Message", { service: "payload-service" });
      expect(output[0]).toMatchObject({
        _service: "payload-service",
      });
    });

    it("prefixes reserved field 'context' with underscore", () => {
      logger.info("test.event", "Message", { context: "payload-context" });
      expect(output[0]).toMatchObject({
        _context: "payload-context",
      });
    });
  });

  describe("Child Loggers", () => {
    it("child() returns a Logger instance", () => {
      const parent = Logger.create("parent");
      const child = parent.child("child-context");
      expect(child).toBeInstanceOf(Logger);
    });

    it("child() uses Pino's native child() method", () => {
      const parent = Logger.create("parent");
      const parentPino = (parent as any).pinoInstance;
      const childSpy = vi.spyOn(parentPino, "child");

      parent.child("child-context");

      expect(childSpy).toHaveBeenCalledWith({ context: "child-context" });
    });

    it("child logger shares frozen config with parent", () => {
      const parent = Logger.create("parent", { level: "warn" });
      const child = parent.child("child");

      expect((parent as any).frozenConfig).toBe((child as any).frozenConfig);
    });
  });

  describe("Level Propagation", () => {
    it("setLevel() changes the logger level", () => {
      const logger = Logger.create("test", { level: "info" });
      expect(logger.getLevel()).toBe("info");

      logger.setLevel("debug");
      expect(logger.getLevel()).toBe("debug");
    });

    it("setLevel() propagates to child loggers", () => {
      const parent = Logger.create("parent", { level: "info" });
      const child1 = parent.child("child1");
      const child2 = parent.child("child2");

      expect(child1.getLevel()).toBe("info");
      expect(child2.getLevel()).toBe("info");

      parent.setLevel("trace");

      expect(parent.getLevel()).toBe("trace");
      expect(child1.getLevel()).toBe("trace");
      expect(child2.getLevel()).toBe("trace");
    });

    it("setLevel() propagates to nested child loggers", () => {
      const root = Logger.create("root", { level: "info" });
      const child = root.child("child");
      const grandchild = child.child("grandchild");

      root.setLevel("warn");

      expect(root.getLevel()).toBe("warn");
      expect(child.getLevel()).toBe("warn");
      expect(grandchild.getLevel()).toBe("warn");
    });
  });

  describe("Frozen Config", () => {
    it("config is frozen and immutable", () => {
      const logger = Logger.create("test", { level: "info" });
      const config = (logger as any).frozenConfig;

      expect(Object.isFrozen(config)).toBe(true);
    });

    it("attempting to modify frozen config throws", () => {
      const logger = Logger.create("test");
      const config = (logger as any).frozenConfig;

      expect(() => {
        config.name = "modified";
      }).toThrow();
    });

    it("child loggers reference same frozen config object", () => {
      const parent = Logger.create("parent");
      const child1 = parent.child("c1");
      const child2 = parent.child("c2");
      const grandchild = child1.child("gc");

      const parentConfig = (parent as any).frozenConfig;
      expect((child1 as any).frozenConfig).toBe(parentConfig);
      expect((child2 as any).frozenConfig).toBe(parentConfig);
      expect((grandchild as any).frozenConfig).toBe(parentConfig);
    });
  });
});

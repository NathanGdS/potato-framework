import { describe, it, expect, beforeEach } from "vitest";
import { RequestCycle } from "../RequestCycle.mjs";

describe("RequestCycle", () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  describe("add()", () => {
    it("should add a single handler to the queue", () => {
      // Arrange
      const cycle = new RequestCycle();
      const handler = () => {};

      // Act
      cycle.add(handler);

      // Assert
      expect(cycle.getAllHandlers()).toHaveLength(1);
      expect(cycle.getAllHandlers()[0]).toBe(handler);
    });
  });

  describe("addMultiples()", () => {
    it("should add multiple handlers in order", () => {
      // Arrange
      const cycle = new RequestCycle();
      const h1 = () => {};
      const h2 = () => {};
      const h3 = () => {};

      // Act
      cycle.addMultiples([h1, h2, h3]);

      // Assert
      const handlers = cycle.getAllHandlers();
      expect(handlers).toHaveLength(3);
      expect(handlers[0]).toBe(h1);
      expect(handlers[1]).toBe(h2);
      expect(handlers[2]).toBe(h3);
    });
  });

  describe("reset()", () => {
    it("should clear all handlers", () => {
      // Arrange
      const cycle = new RequestCycle();
      cycle.add(() => {});
      cycle.add(() => {});
      expect(cycle.getAllHandlers()).toHaveLength(2);

      // Act
      cycle.reset();

      // Assert
      expect(cycle.getAllHandlers()).toHaveLength(0);
    });
  });

  describe("getAllHandlers()", () => {
    it("should return the current handler array", () => {
      // Arrange
      const cycle = new RequestCycle();
      const h1 = () => {};
      const h2 = () => {};
      cycle.addMultiples([h1, h2]);

      // Act
      const handlers = cycle.getAllHandlers();

      // Assert
      expect(handlers).toEqual([h1, h2]);
    });

    it("should return an empty array when no handlers are added", () => {
      // Arrange
      const cycle = new RequestCycle();

      // Act
      const handlers = cycle.getAllHandlers();

      // Assert
      expect(handlers).toEqual([]);
    });
  });

  describe("executeRequestCycle()", () => {
    it("should call sync handler exactly once with the data object", async () => {
      // Arrange
      const cycle = new RequestCycle();
      const data = { body: null, params: null, headers: {}, queries: null };
      let callCount = 0;
      let received;
      cycle.add((ctx) => {
        callCount++;
        received = ctx;
      });

      // Act
      await cycle.executeRequestCycle(data);

      // Assert
      expect(callCount).toBe(1);
      expect(received).toBe(data);
    });

    it("should pass the same data object reference to each handler", async () => {
      // Arrange
      const cycle = new RequestCycle();
      const data = { body: null, params: null, headers: {}, queries: null };
      const receivedRefs = [];
      cycle.addMultiples([
        (ctx) => { receivedRefs.push(ctx); },
        (ctx) => { receivedRefs.push(ctx); },
        (ctx) => { receivedRefs.push(ctx); },
      ]);

      // Act
      await cycle.executeRequestCycle(data);

      // Assert
      expect(receivedRefs).toHaveLength(3);
      expect(receivedRefs[0]).toBe(data);
      expect(receivedRefs[1]).toBe(data);
      expect(receivedRefs[2]).toBe(data);
    });

    it("should await async handlers before proceeding to next", async () => {
      // Arrange
      const order = [];
      const cycle = new RequestCycle();
      cycle.addMultiples([
        async () => { await delay(20); order.push(1); },
        async () => { order.push(2); },
      ]);

      // Act
      await cycle.executeRequestCycle({});

      // Assert
      expect(order).toEqual([1, 2]);
    });

    it("should execute multiple handlers in sequential order", async () => {
      // Arrange
      const order = [];
      const cycle = new RequestCycle();
      cycle.addMultiples([
        async () => { await delay(30); order.push(1); },
        async () => { await delay(10); order.push(2); },
        async () => { order.push(3); },
      ]);

      // Act
      await cycle.executeRequestCycle({});

      // Assert
      expect(order).toEqual([1, 2, 3]);
    });

    it("should handle a mix of sync and async handlers in order", async () => {
      // Arrange
      const order = [];
      const cycle = new RequestCycle();
      cycle.addMultiples([
        () => { order.push("sync-1"); },
        async () => { await delay(10); order.push("async-1"); },
        () => { order.push("sync-2"); },
        async () => { order.push("async-2"); },
      ]);

      // Act
      await cycle.executeRequestCycle({});

      // Assert
      expect(order).toEqual(["sync-1", "async-1", "sync-2", "async-2"]);
    });

    it("should execute no handlers when the queue is empty", async () => {
      // Arrange
      const cycle = new RequestCycle();

      // Act & Assert — should resolve without throwing
      await expect(cycle.executeRequestCycle({})).resolves.toBeUndefined();
    });
  });
});

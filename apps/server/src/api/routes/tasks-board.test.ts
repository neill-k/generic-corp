import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

import { createTaskRouter } from "./tasks.js";

vi.mock("../../db/client.js", () => {
  const mockDb = {
    agent: {
      findUnique: vi.fn(),
    },
    task: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { db: mockDb };
});

vi.mock("../../queue/agent-queues.js", () => ({
  enqueueAgentTask: vi.fn(),
}));

vi.mock("../../services/app-events.js", () => ({
  appEventBus: { emit: vi.fn() },
}));

import { db } from "../../db/client.js";
import { appEventBus } from "../../services/app-events.js";

const mockDb = db as unknown as {
  agent: { findUnique: ReturnType<typeof vi.fn> };
  task: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const mockEventBus = appEventBus as unknown as { emit: ReturnType<typeof vi.fn> };

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", createTaskRouter());
  app.use(((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message, stack: err.stack });
  }) as express.ErrorRequestHandler);
  return app;
}

// --- Helpers ---

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    prompt: "Implement feature X",
    status: "pending",
    priority: 1,
    tags: [],
    createdAt: new Date("2025-06-01"),
    assigneeId: "a1",
    assignee: {
      id: "a1",
      name: "marcus",
      displayName: "Marcus Bell",
      avatarColor: "#4F46E5",
    },
    ...overrides,
  };
}

describe("task routes — list & board", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== GET /tasks =====

  describe("GET /api/tasks", () => {
    it("returns a filtered list with assignee info", async () => {
      const tasks = [
        makeTask({ id: "t1", status: "pending" }),
        makeTask({ id: "t2", status: "running", prompt: "Deploy service" }),
      ];
      mockDb.task.findMany.mockResolvedValue(tasks);

      const res = await request(createApp()).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(2);
      expect(res.body.tasks[0].assignee).toEqual({
        id: "a1",
        name: "marcus",
        displayName: "Marcus Bell",
        avatarColor: "#4F46E5",
      });
    });

    it("applies status filter", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks?status=running");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "running" }),
        }),
      );
    });

    it("applies assignee filter by agent name", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks?assignee=sable");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignee: { name: "sable" } }),
        }),
      );
    });

    it("applies search filter (case-insensitive contains on prompt)", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks?search=deploy");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            prompt: { contains: "deploy", mode: "insensitive" },
          }),
        }),
      );
    });

    it("applies priority filter", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks?priority=2");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ priority: 2 }),
        }),
      );
    });

    it("respects limit param (capped at 100)", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks?limit=10");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it("defaults limit to 50", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it("uses cursor-based pagination", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks?cursor=t5");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { lt: "t5" } }),
        }),
      );
    });

    it("sorts by createdAt desc", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "desc" } }),
      );
    });
  });

  // ===== GET /tasks/board =====

  describe("GET /api/tasks/board", () => {
    it("returns tasks grouped into kanban columns", async () => {
      const tasks = [
        makeTask({ id: "t1", status: "pending" }),
        makeTask({ id: "t2", status: "running" }),
        makeTask({ id: "t3", status: "review" }),
        makeTask({ id: "t4", status: "completed" }),
        makeTask({ id: "t5", status: "failed" }),
        makeTask({ id: "t6", status: "blocked" }),
      ];
      mockDb.task.findMany.mockResolvedValue(tasks);

      const res = await request(createApp()).get("/api/tasks/board");

      expect(res.status).toBe(200);
      expect(res.body.columns.backlog.count).toBe(2); // pending + blocked
      expect(res.body.columns.in_progress.count).toBe(1); // running
      expect(res.body.columns.review.count).toBe(1); // review
      expect(res.body.columns.done.count).toBe(2); // completed + failed
      expect(res.body.total).toBe(6);
    });

    it("returns empty columns when no tasks", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      const res = await request(createApp()).get("/api/tasks/board");

      expect(res.status).toBe(200);
      expect(res.body.columns.backlog).toEqual({ tasks: [], count: 0 });
      expect(res.body.columns.in_progress).toEqual({ tasks: [], count: 0 });
      expect(res.body.columns.review).toEqual({ tasks: [], count: 0 });
      expect(res.body.columns.done).toEqual({ tasks: [], count: 0 });
      expect(res.body.total).toBe(0);
    });

    it("applies search filter", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks/board?search=deploy");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            prompt: { contains: "deploy", mode: "insensitive" },
          }),
        }),
      );
    });

    it("applies assignee filter by agent name", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks/board?assignee=sable");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignee: { name: "sable" } }),
        }),
      );
    });

    it("applies priority filter", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks/board?priority=3");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ priority: 3 }),
        }),
      );
    });

    it("applies department filter via assignee relation", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get("/api/tasks/board?department=Engineering");

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignee: { department: "Engineering" },
          }),
        }),
      );
    });

    it("limits tasks per column according to limit param", async () => {
      const tasks = [
        makeTask({ id: "t1", status: "pending" }),
        makeTask({ id: "t2", status: "pending" }),
        makeTask({ id: "t3", status: "pending" }),
      ];
      mockDb.task.findMany.mockResolvedValue(tasks);

      const res = await request(createApp()).get("/api/tasks/board?limit=2");

      expect(res.status).toBe(200);
      expect(res.body.columns.backlog.tasks).toHaveLength(2);
      expect(res.body.columns.backlog.count).toBe(3);
    });

    it("combines assignee and department filters", async () => {
      mockDb.task.findMany.mockResolvedValue([]);

      await request(createApp()).get(
        "/api/tasks/board?assignee=sable&department=Engineering",
      );

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignee: { name: "sable", department: "Engineering" },
          }),
        }),
      );
    });
  });

  // ===== Tags on create/update =====

  describe("tags support", () => {
    it("accepts tags on POST /api/tasks", async () => {
      mockDb.agent.findUnique.mockResolvedValue({ id: "a1", name: "marcus" });
      mockDb.task.create.mockResolvedValue({ id: "t1" });

      const tags = [{ label: "urgent", color: "#EF4444", bg: "#FEE2E2" }];
      const res = await request(createApp())
        .post("/api/tasks")
        .send({ prompt: "Fix bug", tags });

      expect(res.status).toBe(201);
      expect(mockDb.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tags }),
        }),
      );
    });

    it("defaults tags to empty array on POST /api/tasks when omitted", async () => {
      mockDb.agent.findUnique.mockResolvedValue({ id: "a1", name: "marcus" });
      mockDb.task.create.mockResolvedValue({ id: "t1" });

      await request(createApp())
        .post("/api/tasks")
        .send({ prompt: "Do something" });

      expect(mockDb.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tags: [] }),
        }),
      );
    });

    it("accepts tags on PATCH /api/tasks/:id", async () => {
      mockDb.task.findUnique.mockResolvedValue({ id: "t1", status: "pending" });
      const tags = [{ label: "backend", color: "#3B82F6", bg: "#DBEAFE" }];
      mockDb.task.update.mockResolvedValue({ id: "t1", tags });

      const res = await request(createApp())
        .patch("/api/tasks/t1")
        .send({ tags });

      expect(res.status).toBe(200);
      expect(mockDb.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tags }),
        }),
      );
    });

    it("rejects invalid tag objects on POST (missing required fields)", async () => {
      mockDb.agent.findUnique.mockResolvedValue({ id: "a1", name: "marcus" });

      const res = await request(createApp())
        .post("/api/tasks")
        .send({ prompt: "Fix bug", tags: [{ label: "oops" }] });

      // Zod validation should fail — missing color and bg
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("rejects invalid tag objects on PATCH (missing required fields)", async () => {
      mockDb.task.findUnique.mockResolvedValue({ id: "t1", status: "pending" });

      const res = await request(createApp())
        .patch("/api/tasks/t1")
        .send({ tags: [{ color: "#FFF" }] });

      // Zod validation should fail — missing label and bg
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("emits task_updated event when tags are updated", async () => {
      mockDb.task.findUnique.mockResolvedValue({ id: "t1", status: "pending" });
      const tags = [{ label: "frontend", color: "#8B5CF6", bg: "#EDE9FE" }];
      mockDb.task.update.mockResolvedValue({ id: "t1", tags });

      await request(createApp())
        .patch("/api/tasks/t1")
        .send({ tags });

      expect(mockEventBus.emit).toHaveBeenCalledWith("task_updated", { taskId: "t1" });
    });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

import { createApiRouter } from "./routes.js";

vi.mock("../db/client.js", () => {
  const mockDb = {
    agent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    task: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orgNode: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  return { db: mockDb };
});

vi.mock("../queue/agent-queues.js", () => ({
  enqueueAgentTask: vi.fn(),
}));

import { db } from "../db/client.js";

vi.mock("../services/chat-continuity.js", () => ({
  generateThreadSummary: vi.fn(),
}));

import { generateThreadSummary } from "../services/chat-continuity.js";

const mockBoardService = {
  listBoardItems: vi.fn(),
  writeBoardItem: vi.fn(),
  archiveBoardItem: vi.fn(),
  listArchivedItems: vi.fn(),
};

const mockRuntime = {} as never;
const mockGenerateThreadSummary = generateThreadSummary as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter({ boardService: mockBoardService as never, runtime: mockRuntime }));
  return app;
}

const mockDb = db as unknown as {
  agent: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  task: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  message: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  orgNode: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

describe("routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/agents", () => {
    it("returns agents list", async () => {
      mockDb.agent.findMany.mockResolvedValue([
        { id: "1", name: "marcus", displayName: "Marcus Bell", role: "CEO", department: "Executive", level: "c-suite", status: "idle", currentTaskId: null, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const res = await request(createApp()).get("/api/agents");

      expect(res.status).toBe(200);
      expect(res.body.agents).toHaveLength(1);
      expect(res.body.agents[0].name).toBe("marcus");
    });
  });

  describe("POST /api/tasks", () => {
    it("creates a task and returns id", async () => {
      mockDb.agent.findUnique.mockResolvedValue({ id: "a1", name: "marcus" });
      mockDb.task.create.mockResolvedValue({ id: "t1" });

      const res = await request(createApp())
        .post("/api/tasks")
        .send({ prompt: "Do something" });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe("t1");
    });

    it("returns 404 for unknown assignee", async () => {
      mockDb.agent.findUnique.mockResolvedValue(null);

      const res = await request(createApp())
        .post("/api/tasks")
        .send({ prompt: "Do something", assignee: "nobody" });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("returns a task", async () => {
      mockDb.task.findUnique.mockResolvedValue({ id: "t1", status: "pending", prompt: "test" });

      const res = await request(createApp()).get("/api/tasks/t1");

      expect(res.status).toBe(200);
      expect(res.body.task.id).toBe("t1");
    });

    it("returns 404 for unknown task", async () => {
      mockDb.task.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).get("/api/tasks/unknown");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/messages", () => {
    it("creates a message to an agent", async () => {
      mockDb.agent.findUnique.mockResolvedValue({ id: "a1", name: "marcus" });
      mockDb.message.create.mockResolvedValue({
        id: "m1",
        fromAgentId: null,
        toAgentId: "a1",
        threadId: "thread-1",
        body: "Hello Marcus",
        type: "chat",
        createdAt: new Date("2025-01-01"),
      });

      const res = await request(createApp())
        .post("/api/messages")
        .send({ agentName: "marcus", body: "Hello Marcus" });

      expect(res.status).toBe(201);
      expect(res.body.message.id).toBe("m1");
      expect(res.body.message.body).toBe("Hello Marcus");
    });

    it("creates a message with explicit threadId", async () => {
      mockDb.agent.findUnique.mockResolvedValue({ id: "a1", name: "marcus" });
      mockDb.message.create.mockResolvedValue({
        id: "m2",
        fromAgentId: null,
        toAgentId: "a1",
        threadId: "existing-thread",
        body: "Follow up",
        type: "chat",
        createdAt: new Date("2025-01-01"),
      });

      const res = await request(createApp())
        .post("/api/messages")
        .send({ agentName: "marcus", body: "Follow up", threadId: "existing-thread" });

      expect(res.status).toBe(201);
      expect(res.body.message.threadId).toBe("existing-thread");
    });

    it("returns 400 for missing body", async () => {
      const res = await request(createApp())
        .post("/api/messages")
        .send({ agentName: "marcus" });

      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown agent", async () => {
      mockDb.agent.findUnique.mockResolvedValue(null);

      const res = await request(createApp())
        .post("/api/messages")
        .send({ agentName: "nobody", body: "Hello" });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/messages", () => {
    it("returns messages for a thread", async () => {
      mockDb.message.findMany.mockResolvedValue([
        {
          id: "m1",
          fromAgentId: null,
          toAgentId: "a1",
          threadId: "thread-1",
          body: "Hello",
          type: "chat",
          createdAt: new Date("2025-01-01"),
        },
        {
          id: "m2",
          fromAgentId: "a1",
          toAgentId: "a1",
          threadId: "thread-1",
          body: "Hi there",
          type: "chat",
          createdAt: new Date("2025-01-01T00:01:00"),
        },
      ]);

      const res = await request(createApp()).get("/api/messages?threadId=thread-1");

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0].id).toBe("m1");
    });

    it("returns 400 when threadId is missing", async () => {
      const res = await request(createApp()).get("/api/messages");

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/org", () => {
    it("returns org tree with nested children", async () => {
      mockDb.orgNode.findMany.mockResolvedValue([
        {
          id: "on1",
          agentId: "a1",
          parentNodeId: null,
          position: 0,
          agent: { id: "a1", name: "marcus", displayName: "Marcus Bell", role: "CEO", department: "Executive", level: "c-suite", status: "idle", currentTaskId: null },
        },
        {
          id: "on2",
          agentId: "a2",
          parentNodeId: "on1",
          position: 0,
          agent: { id: "a2", name: "sable", displayName: "Sable Chen", role: "Principal Engineer", department: "Engineering", level: "lead", status: "idle", currentTaskId: null },
        },
        {
          id: "on3",
          agentId: "a3",
          parentNodeId: "on1",
          position: 1,
          agent: { id: "a3", name: "viv", displayName: "Vivian Reyes", role: "VP Product", department: "Product", level: "vp", status: "running", currentTaskId: "t1" },
        },
      ]);

      const res = await request(createApp()).get("/api/org");

      expect(res.status).toBe(200);
      expect(res.body.org).toHaveLength(1);

      const root = res.body.org[0];
      expect(root.agent.name).toBe("marcus");
      expect(root.parentAgentId).toBeNull();
      expect(root.children).toHaveLength(2);
      expect(root.children[0].agent.name).toBe("sable");
      expect(root.children[1].agent.name).toBe("viv");
    });

    it("returns empty array when no org nodes exist", async () => {
      mockDb.orgNode.findMany.mockResolvedValue([]);

      const res = await request(createApp()).get("/api/org");

      expect(res.status).toBe(200);
      expect(res.body.org).toEqual([]);
    });
  });

  describe("GET /api/threads", () => {
    it("returns thread list grouped by threadId", async () => {
      mockDb.message.findMany.mockResolvedValue([
        {
          threadId: "thread-1",
          toAgentId: "a1",
          body: "Latest message",
          createdAt: new Date("2025-01-02"),
          recipient: { name: "marcus" },
        },
        {
          threadId: "thread-2",
          toAgentId: "a2",
          body: "Another thread",
          createdAt: new Date("2025-01-01"),
          recipient: { name: "sarah" },
        },
      ]);

      const res = await request(createApp()).get("/api/threads");

      expect(res.status).toBe(200);
      expect(res.body.threads).toHaveLength(2);
      expect(res.body.threads[0].threadId).toBe("thread-1");
      expect(res.body.threads[0].agentName).toBe("marcus");
      expect(res.body.threads[0].preview).toBe("Latest message");

      expect(mockDb.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: "chat" }),
        }),
      );
    });
  });

  describe("GET /api/agents/:id", () => {
    it("returns agent detail", async () => {
      mockDb.agent.findUnique.mockResolvedValue({
        id: "a1",
        name: "marcus",
        displayName: "Marcus Bell",
        role: "CEO",
        department: "Executive",
        level: "c-suite",
        personality: "You are Marcus Bell",
        status: "idle",
        currentTaskId: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      });

      const res = await request(createApp()).get("/api/agents/a1");

      expect(res.status).toBe(200);
      expect(res.body.agent.name).toBe("marcus");
      expect(res.body.agent.personality).toBe("You are Marcus Bell");
    });

    it("returns 404 for unknown agent", async () => {
      mockDb.agent.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).get("/api/agents/unknown");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/agents/:id/tasks", () => {
    it("returns tasks for an agent", async () => {
      mockDb.task.findMany.mockResolvedValue([
        { id: "t1", prompt: "Do stuff", status: "completed", createdAt: new Date("2025-01-01"), completedAt: new Date("2025-01-01T01:00:00") },
        { id: "t2", prompt: "Do more", status: "pending", createdAt: new Date("2025-01-02"), completedAt: null },
      ]);

      const res = await request(createApp()).get("/api/agents/a1/tasks");

      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(2);
      expect(res.body.tasks[0].id).toBe("t1");
    });
  });

  describe("GET /api/threads/:id/summary", () => {
    it("returns a thread summary", async () => {
      mockGenerateThreadSummary.mockResolvedValue("While you were away: feature deployed.");

      const res = await request(createApp()).get(
        "/api/threads/t1/summary?since=2025-01-01T00:00:00Z",
      );

      expect(res.status).toBe(200);
      expect(res.body.summary).toBe("While you were away: feature deployed.");
    });

    it("returns null summary when no activity", async () => {
      mockGenerateThreadSummary.mockResolvedValue(null);

      const res = await request(createApp()).get(
        "/api/threads/t1/summary?since=2025-01-01T00:00:00Z",
      );

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeNull();
    });

    it("returns 400 when since is missing", async () => {
      const res = await request(createApp()).get("/api/threads/t1/summary");

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/board", () => {
    it("returns board items", async () => {
      mockBoardService.listBoardItems.mockResolvedValue([
        {
          author: "marcus",
          type: "status_update",
          summary: "All systems go",
          timestamp: "2025-01-01T00:00:00.000Z",
          path: "/workspace/board/status-updates/file.md",
        },
      ]);

      const res = await request(createApp()).get("/api/board");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].author).toBe("marcus");
      expect(res.body.items[0].type).toBe("status_update");
    });

    it("passes type and since filters", async () => {
      mockBoardService.listBoardItems.mockResolvedValue([]);

      const res = await request(createApp()).get("/api/board?type=blocker&since=2025-01-01");

      expect(res.status).toBe(200);
      expect(mockBoardService.listBoardItems).toHaveBeenCalledWith({
        type: "blocker",
        since: "2025-01-01",
      });
    });

    it("returns empty array when no items", async () => {
      mockBoardService.listBoardItems.mockResolvedValue([]);

      const res = await request(createApp()).get("/api/board");

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
    });
  });

  describe("POST /api/board/archive", () => {
    it("archives a board item", async () => {
      mockBoardService.archiveBoardItem.mockResolvedValue("/workspace/board/completed/file.md");

      const res = await request(createApp())
        .post("/api/board/archive")
        .send({ filePath: "/workspace/board/status-updates/file.md" });

      expect(res.status).toBe(200);
      expect(res.body.archivedPath).toBe("/workspace/board/completed/file.md");
      expect(mockBoardService.archiveBoardItem).toHaveBeenCalledWith(
        "/workspace/board/status-updates/file.md",
      );
    });

    it("returns 400 when filePath is missing", async () => {
      const res = await request(createApp())
        .post("/api/board/archive")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/board/archived", () => {
    it("returns archived items", async () => {
      mockBoardService.listArchivedItems.mockResolvedValue([
        {
          author: "sable",
          type: "blocker",
          summary: "Resolved blocker",
          timestamp: "2025-01-01T00:00:00.000Z",
          path: "/workspace/board/completed/file.md",
        },
      ]);

      const res = await request(createApp()).get("/api/board/archived");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].author).toBe("sable");
    });

    it("returns empty array when no archived items", async () => {
      mockBoardService.listArchivedItems.mockResolvedValue([]);

      const res = await request(createApp()).get("/api/board/archived");

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
    });
  });
});

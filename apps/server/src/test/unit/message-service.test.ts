import { describe, expect, it, vi, beforeEach } from "vitest";

const emitMock = vi.fn();
const signalMock = vi.fn();

vi.mock("../../services/event-bus.js", () => ({
  EventBus: { emit: emitMock },
}));

vi.mock("../../temporal/index.js", () => ({
  signalNewMessage: signalMock,
}));

vi.mock("../../db/index.js", () => ({
  db: {
    message: {
      create: vi.fn(async (_args: any) => ({
        id: "m1",
        subject: "s",
        body: "b",
        fromAgent: { name: "From" },
      })),
      update: vi.fn(async (_args: any) => ({})),
      findMany: vi.fn(async () => []),
    },
  },
}));

describe("MessageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits message:new and signals Temporal on send", async () => {
    const { MessageService } = await import("../../services/message-service.js");
    await MessageService.send({
      fromAgentId: "a1",
      toAgentId: "a2",
      subject: "hi",
      body: "body",
    });

    expect(emitMock).toHaveBeenCalledWith(
      "message:new",
      expect.objectContaining({ toAgentId: "a2" })
    );
    expect(signalMock).toHaveBeenCalled();
  });

  it("does not throw if Temporal signal fails", async () => {
    signalMock.mockRejectedValueOnce(new Error("no temporal"));
    const { MessageService } = await import("../../services/message-service.js");
    await expect(
      MessageService.send({ fromAgentId: "a1", toAgentId: "a2", subject: "hi", body: "b" })
    ).resolves.toBeDefined();
  });

  it("createDraft emits draft:pending", async () => {
    const { MessageService } = await import("../../services/message-service.js");
    await MessageService.createDraft({
      fromAgentId: "a1",
      externalRecipient: "x@example.com",
      subject: "s",
      body: "b",
    });
    expect(emitMock).toHaveBeenCalledWith(
      "draft:pending",
      expect.objectContaining({ draftId: "m1" })
    );
  });

  it("rejectDraft emits draft:rejected", async () => {
    const { MessageService } = await import("../../services/message-service.js");
    await MessageService.rejectDraft("d1", "no");
    expect(emitMock).toHaveBeenCalledWith("draft:rejected", { draftId: "d1", reason: "no" });
  });

  it("markAsRead updates status", async () => {
    const { MessageService } = await import("../../services/message-service.js");
    const { db } = await import("../../db/index.js");

    await MessageService.markAsRead("m1", "a1");
    expect((db as any).message.update).toHaveBeenCalled();
  });

  it("approveDraft updates message", async () => {
    const { MessageService } = await import("../../services/message-service.js");
    const { db } = await import("../../db/index.js");

    await MessageService.approveDraft("d1", "ceo");
    expect((db as any).message.update).toHaveBeenCalled();
  });
});

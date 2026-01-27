import { describe, expect, it, vi } from "vitest";

describe("EmailService", () => {
  it("validates email addresses", async () => {
    const { EmailService } = await import("../../services/email-service.js");
    expect(EmailService.validateEmail("a@b.com")).toBe(true);
    expect(EmailService.validateEmail("not-an-email")).toBe(false);
  });

  it("sendEmail returns success and messageId", async () => {
    const { EmailService } = await import("../../services/email-service.js");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await EmailService.sendEmail({
      to: "a@b.com",
      subject: "Hello",
      body: "World",
    });
    logSpy.mockRestore();

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^email-/);
  });

  it("sendEmail returns failure on unexpected error", async () => {
    const { EmailService } = await import("../../services/email-service.js");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("boom");
    });

    const result = await EmailService.sendEmail({
      to: "a@b.com",
      subject: "Hello",
      body: "World",
    });

    logSpy.mockRestore();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/boom/);
  });
});

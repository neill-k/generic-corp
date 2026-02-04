import { describe, expect, it } from "vitest";

import { validateMcpUri } from "./mcp-health.js";

describe("validateMcpUri", () => {
  describe("valid public URLs", () => {
    it("allows a public HTTPS URL", () => {
      const result = validateMcpUri("https://mcp.example.com/v1");
      expect(result).toEqual({ valid: true });
    });

    it("allows a public HTTP URL", () => {
      const result = validateMcpUri("http://mcp.example.com:8080/sse");
      expect(result).toEqual({ valid: true });
    });

    it("allows a public IP address", () => {
      const result = validateMcpUri("https://203.0.113.42:3000/api");
      expect(result).toEqual({ valid: true });
    });
  });

  describe("rejects localhost and loopback", () => {
    it("rejects localhost", () => {
      const result = validateMcpUri("http://localhost:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects 127.0.0.1", () => {
      const result = validateMcpUri("http://127.0.0.1:8080/sse");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects 0.0.0.0", () => {
      const result = validateMcpUri("http://0.0.0.0:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects ::1 (IPv6 loopback)", () => {
      const result = validateMcpUri("http://[::1]:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });
  });

  describe("rejects private IP ranges", () => {
    it("rejects 10.x.x.x (10.0.0.0/8)", () => {
      const result = validateMcpUri("http://10.0.0.1:8080");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects 10.255.255.255", () => {
      const result = validateMcpUri("http://10.255.255.255:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects 172.16.x.x (172.16.0.0/12 lower bound)", () => {
      const result = validateMcpUri("http://172.16.0.1:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects 172.31.x.x (172.16.0.0/12 upper bound)", () => {
      const result = validateMcpUri("http://172.31.255.255:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });

    it("allows 172.15.x.x (outside private range)", () => {
      const result = validateMcpUri("http://172.15.0.1:3000");
      expect(result).toEqual({ valid: true });
    });

    it("allows 172.32.x.x (outside private range)", () => {
      const result = validateMcpUri("http://172.32.0.1:3000");
      expect(result).toEqual({ valid: true });
    });

    it("rejects 192.168.x.x (192.168.0.0/16)", () => {
      const result = validateMcpUri("http://192.168.1.100:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects 192.168.0.1", () => {
      const result = validateMcpUri("http://192.168.0.1:8080");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP ranges are not allowed");
    });
  });

  describe("stdio protocol bypass", () => {
    it("allows any URI for stdio protocol", () => {
      const result = validateMcpUri("/usr/local/bin/my-mcp-server", "stdio");
      expect(result).toEqual({ valid: true });
    });

    it("allows localhost for stdio protocol", () => {
      const result = validateMcpUri("http://localhost:3000", "stdio");
      expect(result).toEqual({ valid: true });
    });

    it("allows private IPs for stdio protocol", () => {
      const result = validateMcpUri("http://192.168.1.1", "stdio");
      expect(result).toEqual({ valid: true });
    });
  });

  describe("invalid URLs", () => {
    it("rejects malformed URLs for non-stdio protocols", () => {
      const result = validateMcpUri("not a valid url");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid URL");
    });

    it("rejects empty string for non-stdio protocols", () => {
      const result = validateMcpUri("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid URL");
    });
  });
});

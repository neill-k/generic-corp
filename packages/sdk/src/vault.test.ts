import { describe, it, expect } from "vitest";
import {
  VAULT_PLACEHOLDER_REGEX,
  findPlaceholders,
  containsPlaceholders,
} from "./vault.js";

describe("VAULT_PLACEHOLDER_REGEX", () => {
  it("matches uppercase placeholders with underscores", () => {
    const text = "Use {{STRIPE_KEY}} and {{GITHUB_TOKEN}}";
    const regex = new RegExp(VAULT_PLACEHOLDER_REGEX.source, "g");
    const matches = [...text.matchAll(regex)];
    expect(matches).toHaveLength(2);
    expect(matches[0]![1]).toBe("STRIPE_KEY");
    expect(matches[1]![1]).toBe("GITHUB_TOKEN");
  });

  it("does not match lowercase placeholders", () => {
    const text = "{{lowercase}} should not match";
    expect(containsPlaceholders(text)).toBe(false);
  });

  it("does not match placeholders starting with numbers", () => {
    const text = "{{123_BAD}} should not match";
    expect(containsPlaceholders(text)).toBe(false);
  });

  it("matches placeholders starting with underscore", () => {
    const text = "{{_INTERNAL_KEY}} is valid";
    expect(containsPlaceholders(text)).toBe(true);
  });

  it("matches single letter placeholder", () => {
    expect(containsPlaceholders("{{A}}")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(containsPlaceholders("")).toBe(false);
  });

  it("returns false for no placeholders", () => {
    expect(containsPlaceholders("plain text")).toBe(false);
  });
});

describe("findPlaceholders", () => {
  it("returns unique placeholder names", () => {
    const text = "{{API_KEY}} and {{API_KEY}} and {{OTHER}}";
    const result = findPlaceholders(text);
    expect(result).toEqual(["API_KEY", "OTHER"]);
  });

  it("returns empty array for no placeholders", () => {
    expect(findPlaceholders("no placeholders here")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(findPlaceholders("")).toEqual([]);
  });

  it("finds multiple distinct placeholders", () => {
    const text = "{{A}} {{B}} {{C_D}}";
    expect(findPlaceholders(text)).toEqual(["A", "B", "C_D"]);
  });
});

describe("containsPlaceholders", () => {
  it("returns true when placeholders present", () => {
    expect(containsPlaceholders("key is {{MY_KEY}}")).toBe(true);
  });

  it("returns false when no placeholders present", () => {
    expect(containsPlaceholders("no secrets here")).toBe(false);
  });
});

import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MarkdownContent } from "./MarkdownContent.js";

afterEach(cleanup);

describe("MarkdownContent", () => {
  it("renders plain text", () => {
    render(<MarkdownContent content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders bold text", () => {
    render(<MarkdownContent content="This is **bold** text" />);
    const strong = screen.getByText("bold").closest("strong");
    expect(strong).toBeInTheDocument();
  });

  it("renders italic text", () => {
    render(<MarkdownContent content="This is *italic* text" />);
    const em = screen.getByText("italic").closest("em");
    expect(em).toBeInTheDocument();
  });

  it("renders headings as non-heading elements", () => {
    const { container } = render(<MarkdownContent content={"# Heading One"} />);
    // Should not use actual h1 tags
    expect(container.querySelector("h1")).toBeNull();
    // But should still render the text in a styled div
    expect(screen.getByText("Heading One")).toBeInTheDocument();
    expect(screen.getByText("Heading One").className).toContain("font-bold");
  });

  it("renders h2 headings as non-heading elements", () => {
    const { container } = render(<MarkdownContent content={"## Heading Two"} />);
    expect(container.querySelector("h2")).toBeNull();
    expect(screen.getByText("Heading Two")).toBeInTheDocument();
  });

  it("renders unordered lists", () => {
    const markdown = "- Item 1\n- Item 2\n- Item 3";
    const { container } = render(<MarkdownContent content={markdown} />);
    const ul = container.querySelector("ul");
    expect(ul).toBeInTheDocument();
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
  });

  it("renders ordered lists", () => {
    const markdown = "1. First\n2. Second\n3. Third";
    const { container } = render(<MarkdownContent content={markdown} />);
    const ol = container.querySelector("ol");
    expect(ol).toBeInTheDocument();
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
  });

  it("renders inline code", () => {
    const { container } = render(
      <MarkdownContent content="Use `console.log` for debugging" />,
    );
    const code = container.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code!.textContent).toBe("console.log");
    expect(code!.className).toContain("font-mono");
  });

  it("renders fenced code blocks with pre wrapper", () => {
    const markdown = "```javascript\nconst x = 1;\n```";
    const { container } = render(<MarkdownContent content={markdown} />);
    const pre = container.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre!.className).toContain("overflow-x-auto");
    expect(pre!.textContent).toContain("const x = 1;");
  });

  it("renders links with target=_blank and rel=noopener", () => {
    render(
      <MarkdownContent content="Visit [Example](https://example.com)" />,
    );
    const link = screen.getByText("Example") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("href")).toBe("https://example.com");
  });

  it("renders tables with overflow wrapper", () => {
    const markdown = "| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |";
    const { container } = render(<MarkdownContent content={markdown} />);
    const table = container.querySelector("table");
    expect(table).toBeInTheDocument();
    const wrapper = table!.parentElement;
    expect(wrapper!.className).toContain("overflow-x-auto");
  });

  it("renders blockquotes", () => {
    const { container } = render(
      <MarkdownContent content="> This is a quote" />,
    );
    const blockquote = container.querySelector("blockquote");
    expect(blockquote).toBeInTheDocument();
  });

  it("renders images as alt text instead of img elements", () => {
    const { container } = render(
      <MarkdownContent content="![My image](https://example.com/image.png)" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeNull();
    expect(screen.getByText("[My image]")).toBeInTheDocument();
  });

  it("strips raw HTML (XSS prevention)", () => {
    const { container } = render(
      <MarkdownContent content={'<script>alert("xss")</script>'} />,
    );
    const script = container.querySelector("script");
    expect(script).toBeNull();
  });

  it("renders empty string without error", () => {
    const { container } = render(<MarkdownContent content="" />);
    expect(container).toBeInTheDocument();
  });

  it("renders horizontal rules", () => {
    const markdown = "Above\n\n---\n\nBelow";
    const { container } = render(<MarkdownContent content={markdown} />);
    const hr = container.querySelector("hr");
    expect(hr).toBeInTheDocument();
  });

  it("renders strikethrough (GFM)", () => {
    const { container } = render(
      <MarkdownContent content="This is ~~deleted~~ text" />,
    );
    const del = container.querySelector("del");
    expect(del).toBeInTheDocument();
    expect(del!.textContent).toBe("deleted");
  });

  it("renders task lists (GFM)", () => {
    const markdown = "- [x] Done\n- [ ] Todo";
    const { container } = render(<MarkdownContent content={markdown} />);
    const inputs = container.querySelectorAll("input[type='checkbox']");
    expect(inputs).toHaveLength(2);
  });
});

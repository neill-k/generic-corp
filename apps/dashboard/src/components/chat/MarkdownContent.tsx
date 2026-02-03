import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
}

const components: Components = {
  // Headings — use styled divs to avoid document outline conflicts
  h1: ({ children }) => (
    <div className="mb-2 mt-3 text-lg font-bold first:mt-0">{children}</div>
  ),
  h2: ({ children }) => (
    <div className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</div>
  ),
  h3: ({ children }) => (
    <div className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</div>
  ),
  h4: ({ children }) => (
    <div className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</div>
  ),
  h5: ({ children }) => (
    <div className="mb-1 mt-2 text-sm font-medium first:mt-0">{children}</div>
  ),
  h6: ({ children }) => (
    <div className="mb-1 mt-2 text-sm font-medium first:mt-0">{children}</div>
  ),

  // Paragraphs
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

  // Code blocks and inline code
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <code className={`block ${className ?? ""}`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.85em]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-[#1E1E1E] p-3 font-mono text-xs text-[#D4D4D4]">
      {children}
    </pre>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-0.5">{children}</li>,

  // Tables — wrapped for horizontal scroll
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-black/10 bg-black/5">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-black/5 px-2 py-1">{children}</td>
  ),

  // Links — open in new tab, safe protocols only
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800"
    >
      {children}
    </a>
  ),

  // Block quotes
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-black/20 pl-3 italic text-[#666]">
      {children}
    </blockquote>
  ),

  // Horizontal rules
  hr: () => <hr className="my-3 border-black/10" />,

  // Images — render as alt text, do not load remote images
  img: ({ alt }) => (
    <span className="italic text-[#999]">[{alt || "image"}]</span>
  ),
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </Markdown>
  );
}

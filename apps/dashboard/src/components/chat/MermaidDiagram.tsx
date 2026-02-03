import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
});

let mermaidCounter = 0;

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++mermaidCounter}`);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    async function render() {
      try {
        const { svg } = await mermaid.render(idRef.current, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="my-2 overflow-x-auto rounded-md bg-[#1E1E1E] p-3 font-mono text-xs text-[#D4D4D4]">
        <div className="mb-1 text-xs text-red-400">Mermaid diagram error</div>
        <pre className="whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-2 flex justify-center overflow-x-auto rounded-md bg-white p-2"
    />
  );
}

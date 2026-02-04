import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { usePluginStore } from "../store/plugin-store.js";
import { api } from "../lib/api-client.js";

interface PluginPageData {
  html?: string;
  data?: unknown;
  layout?: string;
}

export function PluginPage() {
  const { pluginId } = useParams({ strict: false }) as { pluginId?: string };
  const pages = usePluginStore((s) => s.getPages());
  const page = pages.find((p) => p.path === `/plugins/${pluginId}`);

  const { data, isLoading, error } = useQuery({
    queryKey: ["plugin-page", pluginId],
    queryFn: () => api.get<PluginPageData>(page?.apiEndpoint ?? ""),
    enabled: !!page?.apiEndpoint,
  });

  if (!page) {
    return (
      <div className="p-8">
        <h2 className="text-lg font-semibold text-black">Plugin not found</h2>
        <p className="mt-2 text-sm text-[#666]">
          No plugin page registered for &quot;{pluginId}&quot;.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <h2 className="text-lg font-semibold text-black">{page.title}</h2>
        <p className="mt-4 text-sm text-[#666]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h2 className="text-lg font-semibold text-black">{page.title}</h2>
        <p className="mt-4 text-sm text-red-500">
          Failed to load: {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-lg font-semibold text-black">{page.title}</h2>
      <div className="mt-4">
        <PluginContent data={data} />
      </div>
    </div>
  );
}

function PluginContent({ data }: { data?: PluginPageData }) {
  if (!data) {
    return <p className="text-sm text-[#666]">No data available.</p>;
  }

  // If response has html field, render in a sandboxed container
  if (data.html) {
    return (
      <div
        className="plugin-html-content prose max-w-none"
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
    );
  }

  // If response has data + layout, render using built-in layout
  if (data.data && data.layout === "key-value") {
    const entries = Object.entries(data.data as Record<string, unknown>);
    return (
      <table className="min-w-full divide-y divide-[#EEE]">
        <tbody className="divide-y divide-[#EEE]">
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td className="py-2 pr-4 text-sm font-medium text-black">{key}</td>
              <td className="py-2 text-sm text-[#666]">{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Fallback: render raw JSON
  return (
    <pre className="overflow-auto rounded bg-[#F5F5F5] p-4 text-xs text-black">
      {JSON.stringify(data.data ?? data, null, 2)}
    </pre>
  );
}

import { useQuery } from "@tanstack/react-query";
import { usePluginStore } from "../store/plugin-store.js";
import { api } from "../lib/api-client.js";
import type { WidgetExtension } from "@generic-corp/sdk";

interface PluginWidgetsProps {
  targetPage: string;
  position: "top" | "bottom" | "sidebar";
}

export function PluginWidgets({ targetPage, position }: PluginWidgetsProps) {
  const widgets = usePluginStore((s) =>
    s.getWidgetsForPage(targetPage, position),
  );

  if (widgets.length === 0) return null;

  return (
    <div className="space-y-4">
      {widgets.map((widget) => (
        <PluginWidget key={widget.id} widget={widget} />
      ))}
    </div>
  );
}

function PluginWidget({ widget }: { widget: WidgetExtension }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["plugin-widget", widget.id],
    queryFn: () => api.get<unknown>(widget.apiEndpoint),
    enabled: !!widget.apiEndpoint,
  });

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-3">
        <p className="text-xs text-red-500">
          Widget &quot;{widget.title}&quot; failed to load.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded border border-[#EEE] bg-white p-4">
        <h3 className="text-sm font-medium text-black">{widget.title}</h3>
        <p className="mt-2 text-xs text-[#999]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-[#EEE] bg-white p-4">
      <h3 className="text-sm font-medium text-black">{widget.title}</h3>
      <div className="mt-2">
        <pre className="overflow-auto text-xs text-[#666]">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

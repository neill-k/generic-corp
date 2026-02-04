import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Info } from "lucide-react";

import { api } from "../../lib/api-client.js";
import { queryKeys } from "../../lib/query-keys.js";
import type { ApiAgentDetail } from "@generic-corp/shared";

interface ToolPermission {
  id: string;
  name: string;
  description: string;
  iconName: string;
  enabled: boolean;
  overridden: boolean;
}

interface ToolPermissionsResponse {
  permissions: ToolPermission[];
}

interface SystemPromptResponse {
  systemPrompt: string;
}

export function AgentConfig({ agentId, agent }: { agentId: string; agent: ApiAgentDetail }) {
  const queryClient = useQueryClient();
  const [personality, setPersonality] = useState(agent.personality);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setPersonality(agent.personality);
    setIsDirty(false);
  }, [agent.personality]);

  // --- System Prompt Query ---
  const systemPromptQuery = useQuery({
    queryKey: queryKeys.agents.systemPrompt(agentId),
    queryFn: () =>
      api.get<SystemPromptResponse>(`/agents/${agentId}/system-prompt`),
  });

  // --- Tool Permissions Query ---
  const toolPermissionsQuery = useQuery({
    queryKey: queryKeys.agents.toolPermissions(agentId),
    queryFn: () =>
      api.get<ToolPermissionsResponse>(`/agents/${agentId}/tool-permissions`),
  });

  // --- Save Personality Mutation ---
  const savePersonality = useMutation({
    mutationFn: (newPersonality: string) =>
      api.patch(`/agents/${agentId}`, { personality: newPersonality }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detail(agentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.systemPrompt(agentId),
      });
      setIsDirty(false);
    },
  });

  // --- Toggle Tool Permission Mutation ---
  const togglePermission = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      api.patch(`/agents/${agentId}/tool-permissions`, { [name]: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.toolPermissions(agentId),
      });
    },
  });

  const permissions = toolPermissionsQuery.data?.permissions ?? [];
  const enabledCount = permissions.filter((p) => p.enabled).length;

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
      {/* Config Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-black">
          Configuration
        </span>
        <button
          onClick={() => savePersonality.mutate(personality)}
          disabled={!isDirty || savePersonality.isPending}
          className="flex items-center gap-1.5 rounded-md px-4 py-2 bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#222] transition-colors"
        >
          <Save size={12} />
          <span className="text-[11px] font-medium">
            {savePersonality.isPending ? "Saving..." : "Save Changes"}
          </span>
        </button>
      </div>

      {/* Personality Field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#999]">
          Personality
        </label>
        <textarea
          value={personality}
          onChange={(e) => {
            setPersonality(e.target.value);
            setIsDirty(e.target.value !== agent.personality);
          }}
          rows={4}
          className="rounded-md border border-[#EEE] px-3 py-2.5 text-xs text-black leading-6 resize-y focus:outline-none focus:ring-2 focus:ring-[#EEE] focus:border-[#999]"
          placeholder="Describe the agent's personality and communication style..."
        />
        {savePersonality.isError && (
          <p className="text-[11px] text-red-500">
            Failed to save: {savePersonality.error instanceof Error ? savePersonality.error.message : "Unknown error"}
          </p>
        )}
        {savePersonality.isSuccess && !isDirty && (
          <p className="text-[11px] text-green-600">Saved successfully.</p>
        )}
      </div>

      {/* System Prompt (Read-Only) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#999]">
          System Prompt
        </label>
        <div className="flex items-center gap-1.5 mb-1">
          <Info size={12} className="text-[#999]" />
          <span className="text-[10px] text-[#999]">
            This is auto-generated from the agent's personality, role, and department
          </span>
        </div>
        <div className="rounded-md border border-[#EEE] bg-[#F5F5F5] px-3 py-2.5 max-h-48 overflow-y-auto">
          {systemPromptQuery.isLoading ? (
            <p className="text-[11px] text-[#999]">Loading system prompt...</p>
          ) : systemPromptQuery.isError ? (
            <p className="text-[11px] text-red-500">Failed to load system prompt.</p>
          ) : (
            <pre className="font-mono text-[11px] text-[#666] leading-6 whitespace-pre-wrap">
              {systemPromptQuery.data?.systemPrompt ?? "No system prompt available."}
            </pre>
          )}
        </div>
      </div>

      {/* Tool Permissions */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#999]">
            Tool Permissions
          </span>
          {permissions.length > 0 && (
            <span className="font-mono text-[10px] text-[#999]">
              {enabledCount} of {permissions.length} enabled
            </span>
          )}
        </div>

        {toolPermissionsQuery.isLoading ? (
          <p className="text-xs text-[#999]">Loading permissions...</p>
        ) : toolPermissionsQuery.isError ? (
          <p className="text-xs text-red-500">Failed to load tool permissions.</p>
        ) : permissions.length === 0 ? (
          <p className="text-xs text-[#999]">No tool permissions configured.</p>
        ) : (
          <div className="flex flex-col rounded-lg overflow-hidden border border-[#EEE]">
            {permissions.map((perm, i) => (
              <div
                key={perm.id}
                className={`flex items-center justify-between px-3.5 py-2.5 ${
                  i < permissions.length - 1 ? "border-b border-[#EEE]" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-xs font-medium ${
                          perm.enabled ? "text-black" : "text-[#999]"
                        }`}
                      >
                        {perm.name}
                      </span>
                      {perm.overridden && (
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-amber-100 text-amber-700">
                          overridden
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] ${
                        perm.enabled ? "text-[#666]" : "text-[#CCC]"
                      }`}
                    >
                      {perm.description}
                    </span>
                  </div>
                </div>
                {/* Toggle Switch */}
                <button
                  onClick={() =>
                    togglePermission.mutate({
                      name: perm.name,
                      enabled: !perm.enabled,
                    })
                  }
                  disabled={togglePermission.isPending}
                  className="flex items-center shrink-0 rounded-full transition-colors disabled:opacity-50"
                  style={{
                    width: 36,
                    height: 20,
                    padding: 2,
                    backgroundColor: perm.enabled ? "#4CAF50" : "#cbd5e1",
                    justifyContent: perm.enabled ? "flex-end" : "flex-start",
                    display: "flex",
                  }}
                  aria-label={`Toggle ${perm.name}`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

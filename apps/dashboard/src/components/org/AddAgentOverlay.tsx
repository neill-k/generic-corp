import { useState } from "react";
import { X } from "lucide-react";
import type { ApiAgentSummary, ApiOrgNode } from "@generic-corp/shared";

interface AddAgentOverlayProps {
  availableAgents: ApiAgentSummary[];
  allOrgNodes: ApiOrgNode[];
  onAdd: (agentId: string, parentNodeId?: string, positionX?: number, positionY?: number) => void;
  onClose: () => void;
  isPending: boolean;
  error?: string;
}

export function AddAgentOverlay({
  availableAgents,
  allOrgNodes,
  onAdd,
  onClose,
  isPending,
  error,
}: AddAgentOverlayProps) {
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedParentNodeId, setSelectedParentNodeId] = useState("");

  const handleAdd = () => {
    if (!selectedAgentId) return;

    // Calculate initial position
    let positionX = 0;
    let positionY = 0;

    if (selectedParentNodeId) {
      // Place below parent
      const parent = allOrgNodes.find((n) => n.nodeId === selectedParentNodeId);
      if (parent) {
        positionX = parent.positionX;
        positionY = parent.positionY + 150;
      }
    } else if (allOrgNodes.length > 0) {
      // Place to the right of the rightmost node
      let maxX = -Infinity;
      for (const node of allOrgNodes) {
        if (node.positionX > maxX) maxX = node.positionX;
      }
      positionX = maxX + 250;
      positionY = 0;
    }

    onAdd(
      selectedAgentId,
      selectedParentNodeId || undefined,
      positionX,
      positionY,
    );
  };

  return (
    <div className="absolute right-4 top-4 z-10 w-72 rounded-lg border border-[#EEE] bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-black">Add Agent to Org</span>
        <button onClick={onClose} className="text-[#999] hover:text-[#666]">
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[#666]">Agent</label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="rounded-md border border-[#EEE] px-3 py-2 text-xs text-black outline-none focus:border-[#999]"
          >
            <option value="">Select an agent...</option>
            {availableAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName} ({a.role})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[#666]">
            Reports To (optional)
          </label>
          <select
            value={selectedParentNodeId}
            onChange={(e) => setSelectedParentNodeId(e.target.value)}
            className="rounded-md border border-[#EEE] px-3 py-2 text-xs text-black outline-none focus:border-[#999]"
          >
            <option value="">None (Top Level)</option>
            {allOrgNodes.map((n) => (
              <option key={n.nodeId} value={n.nodeId}>
                {n.agent.displayName} ({n.agent.role})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAdd}
          disabled={!selectedAgentId || isPending}
          className="flex items-center justify-center gap-1.5 rounded-md bg-black px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add"}
        </button>

        {error && (
          <span className="text-[11px] text-red-500">Failed: {error}</span>
        )}
      </div>
    </div>
  );
}

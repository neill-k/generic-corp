import { X } from "lucide-react";

import { AgentDetail } from "./AgentDetail.js";

interface AgentDetailModalProps {
  agentId: string;
  onClose: () => void;
}

export function AgentDetailModal({ agentId, onClose }: AgentDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EEE] px-6 py-4">
          <h2 className="text-sm font-semibold text-black">
            Agent Detail
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#999] transition-colors hover:bg-[#F5F5F5] hover:text-[#666]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AgentDetail agentId={agentId} />
        </div>
      </div>
    </div>
  );
}

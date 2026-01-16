import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { useSocket } from "../hooks/useSocket";

// Message type styling
const MESSAGE_TYPE_STYLES: Record<string, { icon: string; color: string; bgColor: string }> = {
  direct: { icon: "✉", color: "text-blue-400", bgColor: "bg-blue-900/30" },
  broadcast: { icon: "📢", color: "text-purple-400", bgColor: "bg-purple-900/30" },
  system: { icon: "⚙", color: "text-gray-400", bgColor: "bg-gray-800/30" },
  external_draft: { icon: "📝", color: "text-yellow-400", bgColor: "bg-yellow-900/30" },
};

export function MessageCenter() {
  const { agents, messages, selectedAgentId } = useGameStore();
  const { sendMessage } = useSocket();
  const [isComposing, setIsComposing] = useState(false);
  const [toAgentId, setToAgentId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "inbox" | "sent">("all");

  // Format timestamp
  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
    if (filter === "inbox") {
      // Messages to "player" (Marcus)
      const marcus = agents.find((a) => a.name === "Marcus Bell");
      return marcus && msg.toAgentId === marcus.id;
    }
    if (filter === "sent") {
      // Messages from "player" (Marcus)
      const marcus = agents.find((a) => a.name === "Marcus Bell");
      return marcus && msg.fromAgentId === marcus.id;
    }
    return true;
  });

  // Handle send message
  const handleSendMessage = async () => {
    if (!toAgentId || !subject.trim() || !body.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      const targetAgent = agents.find((a) => a.id === toAgentId);
      const result = await sendMessage(targetAgent?.name || "", subject, body);

      if (result.success) {
        setIsComposing(false);
        setToAgentId("");
        setSubject("");
        setBody("");
      } else {
        setError(result.error || "Failed to send message");
      }
    } catch (err) {
      setError("An error occurred while sending the message");
    } finally {
      setIsSending(false);
    }
  };

  // Start composing to selected agent
  const startComposingToSelected = () => {
    if (selectedAgentId) {
      setToAgentId(selectedAgentId);
    }
    setIsComposing(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-corp-accent">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Message Center
          </div>
          <button
            onClick={startComposingToSelected}
            className="px-2 py-1 bg-corp-highlight text-white text-xs rounded hover:bg-opacity-80 transition-colors"
          >
            + New
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {(["all", "inbox", "sent"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === f
                  ? "bg-corp-accent text-white"
                  : "bg-corp-dark text-gray-400 hover:bg-corp-mid"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Compose form */}
      {isComposing && (
        <div className="p-3 bg-corp-dark border-b border-corp-accent">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400">Compose Message</div>
            <button
              onClick={() => setIsComposing(false)}
              className="text-gray-500 hover:text-gray-300 text-sm"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="p-2 mb-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-300">
              {error}
            </div>
          )}

          {/* To field */}
          <div className="mb-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-wide">To</label>
            <select
              value={toAgentId}
              onChange={(e) => setToAgentId(e.target.value)}
              disabled={isSending}
              className="w-full mt-1 px-2 py-1.5 bg-corp-mid border border-corp-accent rounded text-sm focus:outline-none focus:border-corp-highlight disabled:opacity-50"
            >
              <option value="">Select agent...</option>
              {agents
                .filter((a) => a.name !== "Marcus Bell") // Can't message yourself
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.role})
                  </option>
                ))}
            </select>
          </div>

          {/* Subject */}
          <div className="mb-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-wide">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
              placeholder="Message subject..."
              className="w-full mt-1 px-2 py-1.5 bg-corp-mid border border-corp-accent rounded text-sm focus:outline-none focus:border-corp-highlight disabled:opacity-50"
            />
          </div>

          {/* Body */}
          <div className="mb-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-wide">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSending}
              rows={3}
              placeholder="Type your message..."
              className="w-full mt-1 px-2 py-1.5 bg-corp-mid border border-corp-accent rounded text-sm resize-none focus:outline-none focus:border-corp-highlight disabled:opacity-50"
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!toAgentId || !subject.trim() || !body.trim() || isSending}
            className="w-full py-1.5 bg-corp-highlight text-white text-sm rounded hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <span className="animate-spin">⟳</span>
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </button>
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-8">
            No messages
          </div>
        ) : (
          <div className="divide-y divide-corp-accent/30">
            {filteredMessages.map((message) => {
              const typeStyle = MESSAGE_TYPE_STYLES[message.type] || MESSAGE_TYPE_STYLES.direct;
              const fromAgent = agents.find((a) => a.id === message.fromAgentId);
              const toAgent = agents.find((a) => a.id === message.toAgentId);

              return (
                <div
                  key={message.id}
                  className={`p-3 hover:bg-corp-mid/50 transition-colors ${
                    message.status === "pending" ? "border-l-2 border-corp-highlight" : ""
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={typeStyle.color}>{typeStyle.icon}</span>
                      <span className="text-sm font-medium text-gray-200">
                        {fromAgent?.name.split(" ")[0] || "Unknown"}
                      </span>
                      <span className="text-gray-500 text-xs">→</span>
                      <span className="text-sm text-gray-400">
                        {toAgent?.name.split(" ")[0] || "Unknown"}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-600">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>

                  {/* Subject */}
                  <div className="text-xs text-gray-300 font-medium mb-1">
                    {message.subject}
                  </div>

                  {/* Body preview */}
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {message.body}
                  </div>

                  {/* Status badge */}
                  {message.status !== "delivered" && message.status !== "read" && (
                    <div className="mt-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          message.status === "pending"
                            ? "bg-yellow-900/50 text-yellow-400"
                            : message.status === "approved"
                            ? "bg-green-900/50 text-green-400"
                            : message.status === "rejected"
                            ? "bg-red-900/50 text-red-400"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {message.status}
                      </span>
                    </div>
                  )}

                  {/* External recipient */}
                  {message.isExternalDraft && message.externalRecipient && (
                    <div className="mt-1 text-[10px] text-gray-600">
                      External: {message.externalRecipient}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

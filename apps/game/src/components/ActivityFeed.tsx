import { useGameStore } from "../store/gameStore";

export function ActivityFeed() {
  const { activities, agents } = useGameStore();

  const getAgentName = (agentId: string) => {
    return agents.find((a) => a.id === agentId)?.name || "Unknown";
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "task_started":
        return "▶";
      case "task_completed":
        return "✓";
      case "task_failed":
        return "✗";
      case "message_sent":
        return "✉";
      case "draft_created":
        return "📝";
      default:
        return "•";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "task_started":
        return "text-yellow-400";
      case "task_completed":
        return "text-green-400";
      case "task_failed":
        return "text-red-400";
      case "message_sent":
        return "text-blue-400";
      case "draft_created":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="h-48 overflow-y-auto p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
        Activity Feed
      </div>

      {activities.length === 0 ? (
        <div className="text-center text-gray-600 text-sm py-8">
          No activity yet
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((activity, index) => (
            <div
              key={activity.id || index}
              className="flex items-start gap-2 text-xs py-1 border-b border-corp-accent/30 last:border-0"
            >
              <span className={getActionColor(activity.action)}>
                {getActionIcon(activity.action)}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-corp-highlight">
                  {getAgentName(activity.agentId)}
                </span>
                <span className="text-gray-400 ml-1">
                  {activity.action.replace(/_/g, " ")}
                </span>
                {activity.details && (
                  <span className="text-gray-500 block truncate">
                    {typeof activity.details === "string"
                      ? activity.details
                      : JSON.stringify(activity.details)}
                  </span>
                )}
              </div>
              <span className="text-gray-600 whitespace-nowrap">
                {formatTime(activity.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  delegate_task: "Delegating task",
  get_task: "Checking task",
  list_tasks: "Listing tasks",
  query_board: "Searching board",
  post_board_item: "Posting to board",
  send_message: "Sending message",
  get_my_org: "Checking org",
  list_agents: "Listing agents",
  get_agent_status: "Checking agent",
  create_agent: "Creating agent",
  update_agent: "Updating agent",
  read_messages: "Reading messages",
  list_threads: "Listing threads",
  TodoWrite: "Updating tasks",
};

export function getToolLabel(toolName: string, status: "running" | "complete"): string {
  const base = TOOL_DISPLAY_NAMES[toolName] ?? toolName;
  if (status === "complete") {
    return base
      .replace(/ing\b/, "ed")
      .replace(/Listing/, "Listed")
      .replace(/Checking/, "Checked")
      .replace(/Searching/, "Searched");
  }
  return `${base}...`;
}

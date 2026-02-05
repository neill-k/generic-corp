export interface BoardTag {
  label: string;
  color: string;
  bg: string;
}

export interface BoardAssignee {
  id: string;
  name: string;
  displayName?: string;
  avatarColor?: string;
}

export interface BoardTask {
  id: string;
  prompt: string;
  status: string;
  priority: number;
  tags: BoardTag[];
  assigneeId?: string;
  assignee?: BoardAssignee;
  parentTaskId?: string | null;
}

import type { KanbanColumn } from "@generic-corp/shared";

export interface BoardColumnData {
  tasks: BoardTask[];
  count: number;
}

export interface BoardResponse {
  columns: Record<KanbanColumn, BoardColumnData>;
  total: number;
}

export type BoardColumnKey = KanbanColumn;

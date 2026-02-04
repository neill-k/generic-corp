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

export interface BoardColumnData {
  tasks: BoardTask[];
  count: number;
}

export interface BoardResponse {
  columns: {
    backlog: BoardColumnData;
    in_progress: BoardColumnData;
    review: BoardColumnData;
    done: BoardColumnData;
  };
  total: number;
}

export type BoardColumnKey = keyof BoardResponse["columns"];

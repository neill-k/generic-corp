import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { BOARD_TYPE_TO_FOLDER, type BoardItemType } from "@generic-corp/shared";

function safeIsoForFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export interface BoardItem {
  author: string;
  type: BoardItemType;
  summary: string;
  timestamp: string;
  path: string;
}

export class BoardService {
  private readonly root: string;

  constructor(workspaceRoot: string) {
    this.root = path.resolve(workspaceRoot);
  }

  async writeBoardItem(params: {
    agentName: string;
    type: BoardItemType;
    content: string;
  }): Promise<string> {
    const folder = BOARD_TYPE_TO_FOLDER[params.type];
    const dir = path.join(this.root, "board", folder);
    await mkdir(dir, { recursive: true });

    const now = new Date();
    const fileName = `${safeIsoForFilename(now)}-${params.agentName}.md`;
    const filePath = path.join(dir, fileName);
    const body = `# ${params.type}\n\nAuthor: ${params.agentName}\nTime: ${now.toISOString()}\n\n---\n\n${params.content.trim()}\n`;
    await writeFile(filePath, body, "utf8");

    return filePath;
  }

  async listBoardItems(params: {
    type?: BoardItemType;
    since?: string;
  }): Promise<BoardItem[]> {
    const types: BoardItemType[] = params.type
      ? [params.type]
      : (Object.keys(BOARD_TYPE_TO_FOLDER) as BoardItemType[]);

    const sinceMs = params.since ? Date.parse(params.since) : null;
    if (params.since && Number.isNaN(sinceMs)) {
      throw new Error(`Invalid 'since' timestamp: ${params.since}`);
    }

    const items: BoardItem[] = [];

    for (const type of types) {
      const folder = BOARD_TYPE_TO_FOLDER[type];
      const dir = path.join(this.root, "board", folder);

      let files: string[] = [];
      try {
        files = await readdir(dir);
      } catch {
        continue;
      }

      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const filePath = path.join(dir, file);

        let text: string;
        try {
          text = await readFile(filePath, "utf8");
        } catch {
          continue;
        }

        const summaryLine = text
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.length > 0 && !l.startsWith("#"))
          ?? "";

        const timeLine = text
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.startsWith("Time: "));

        const timestamp = timeLine ? timeLine.replace("Time: ", "") : new Date().toISOString();
        const timestampMs = Date.parse(timestamp);
        if (sinceMs !== null && !Number.isNaN(timestampMs) && timestampMs < sinceMs) continue;

        const authorLine = text
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.startsWith("Author: "));
        const author = authorLine ? authorLine.replace("Author: ", "") : "unknown";

        items.push({ author, type, summary: summaryLine, timestamp, path: filePath });
      }
    }

    items.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    return items;
  }
}

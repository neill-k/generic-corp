import { BoardView } from "../components/board/BoardView.js";

export function BoardPage() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Board</h2>
      <BoardView />
    </div>
  );
}

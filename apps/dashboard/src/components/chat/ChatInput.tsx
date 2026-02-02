import { useState } from "react";

interface ChatInputProps {
  onSend: (body: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-1.5 border-t border-[#EEE] bg-white px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center rounded border border-[#EEE] px-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type a message or /help..."
            disabled={disabled}
            className="h-12 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-[#999]"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="h-12 rounded-md bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-[#222] disabled:opacity-50"
        >
          Send
        </button>
      </div>
      <span className="pl-1 font-mono text-[10px] text-[#999]">
        Press Enter to send
      </span>
    </form>
  );
}

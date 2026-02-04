import { ArrowDown } from "lucide-react";

interface ScrollToBottomButtonProps {
  onClick: () => void;
}

export function ScrollToBottomButton({ onClick }: ScrollToBottomButtonProps) {
  return (
    <button
      onClick={onClick}
      className="sticky bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[#EEE] bg-white p-2 shadow-md transition-colors hover:bg-[#F5F5F5]"
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="h-4 w-4 text-[#666]" />
    </button>
  );
}

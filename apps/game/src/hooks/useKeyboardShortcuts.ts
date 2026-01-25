import { useEffect, useState, useCallback } from "react";

/**
 * Hook for managing keyboard shortcuts
 * Provides state for showing command palette and help
 *
 * Shortcuts:
 * - Ctrl/Cmd+K: Open command palette
 * - ?: Show help/onboarding
 * - Esc: Close dialogs
 */
export function useKeyboardShortcuts() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if this is the first visit
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("generic-corp-onboarding-seen");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  // Mark onboarding as seen
  const completeOnboarding = useCallback(() => {
    localStorage.setItem("generic-corp-onboarding-seen", "true");
    setShowOnboarding(false);
  }, []);

  // Reset onboarding (for showing help again)
  const showHelp = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Cmd/Ctrl + K for command palette (always works)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      // ? for help (only when not typing)
      if (e.key === "?" && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        showHelp();
        return;
      }

      // Escape to close any open dialog
      if (e.key === "Escape") {
        if (showCommandPalette) {
          setShowCommandPalette(false);
        } else if (showOnboarding) {
          completeOnboarding();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCommandPalette, showOnboarding, completeOnboarding, showHelp]);

  return {
    showCommandPalette,
    setShowCommandPalette,
    showOnboarding,
    setShowOnboarding,
    completeOnboarding,
    showHelp,
  };
}

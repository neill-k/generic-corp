import { useState, useEffect } from "react";
import { useGameStore } from "../store/gameStore";

interface OnboardingProps {
  onComplete: () => void;
}

/**
 * Onboarding component for Capability Discovery
 * Shows first-time users how to interact with the AI agent system
 */
export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const { agents } = useGameStore();

  const steps = [
    {
      title: "Welcome to Generic Corp",
      content: `You are the CEO of an AI-powered company. Your team of AI agents will execute tasks you assign and help build your business.

Each agent has unique capabilities and expertise. They work autonomously but check in with you for important decisions.`,
    },
    {
      title: "Meet Your Team",
      content: `You have ${agents.length} agents with different specializations:

${agents.slice(0, 5).map((a) => `• ${a.name}: ${a.role}`).join("\n")}
${agents.length > 5 ? `\n...and ${agents.length - 5} more` : ""}

Each agent excels in their area and can collaborate with others.`,
    },
    {
      title: "Assign Tasks",
      content: `Click on an agent to select them, then use "Assign Task" to give them work.

Tasks have:
• Title: Brief summary
• Description: Detailed requirements
• Priority: Urgent, High, Normal, Low
• Acceptance Criteria: Success conditions

Agents execute autonomously and report progress.`,
    },
    {
      title: "Monitor Progress",
      content: `The Activity Feed shows real-time updates from your team.

• Task Started: Agent begins work
• Task Completed: Work finished successfully
• Task Failed: Issues encountered
• Messages: Inter-agent communication

Watch for draft approvals - external communications need your sign-off.`,
    },
    {
      title: "Get Help",
      content: `Press Ctrl+K (Cmd+K on Mac) anytime to open the command palette.

Key shortcuts:
• ? - Show this help again
• Ctrl+K - Command palette
• Esc - Close dialogs

Agents can also use the help tool for guidance on their capabilities.`,
    },
  ];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onComplete();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (step < steps.length - 1) {
          setStep((s) => s + 1);
        } else {
          onComplete();
        }
      } else if (e.key === "ArrowLeft") {
        if (step > 0) {
          setStep((s) => s - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, steps.length, onComplete]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-corp-dark border border-corp-accent rounded-lg p-6 max-w-lg mx-4 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">
          {steps[step].title}
        </h2>
        <pre className="text-gray-300 whitespace-pre-wrap font-sans text-sm leading-relaxed mb-6">
          {steps[step].content}
        </pre>
        <div className="flex justify-between items-center">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="px-4 py-2 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white transition-colors"
          >
            Back
          </button>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-corp-highlight" : "bg-corp-accent"
                }`}
              />
            ))}
          </div>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 bg-corp-highlight text-white rounded hover:bg-corp-highlight/80 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
            >
              Get Started
            </button>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-4 text-center">
          Press Esc to skip, or use arrow keys to navigate
        </p>
      </div>
    </div>
  );
}

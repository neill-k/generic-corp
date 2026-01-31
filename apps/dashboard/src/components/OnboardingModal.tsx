import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "gc-onboarding-dismissed";

const STEPS = [
  {
    title: "Chat with agents",
    description:
      "Open Chat to talk to the CEO agent. Describe what you need and work gets delegated to the right team member.",
    link: "/chat",
    linkLabel: "Go to Chat",
  },
  {
    title: "Monitor the org",
    description:
      "The Org Chart shows every agent's live status. Click an agent to watch their activity in real-time.",
    link: "/org",
    linkLabel: "View Org Chart",
  },
  {
    title: "Track on the board",
    description:
      "Agents post status updates, blockers, and findings to the shared Board. Archive items when resolved.",
    link: "/board",
    linkLabel: "Open Board",
  },
  {
    title: "Type /help anytime",
    description:
      "Type /help in the chat input to see what agents can do, or visit the Help page from the sidebar.",
    link: "/help",
    linkLabel: "Read Help Docs",
  },
];

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Welcome to Generic Corp</h2>
          <button
            onClick={dismiss}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Skip
          </button>
        </div>

        {/* Step indicator */}
        <div className="mb-4 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-blue-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {currentStep && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-800">
              {currentStep.title}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {currentStep.description}
            </p>
            <Link
              to={currentStep.link}
              onClick={dismiss}
              className="mt-2 inline-block text-sm text-blue-600 hover:underline"
            >
              {currentStep.linkLabel}
            </Link>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:invisible"
          >
            Back
          </button>
          {isLast ? (
            <button
              onClick={dismiss}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

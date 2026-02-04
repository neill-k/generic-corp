import SettingsLayout from "../../components/SettingsLayout";

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div
      className={`flex h-5 w-9 items-center rounded-[10px] p-0.5 ${
        enabled
          ? "justify-end bg-[#4CAF50]"
          : "justify-start bg-[var(--gray-300)]"
      }`}
    >
      <div className="h-4 w-4 rounded-full bg-white" />
    </div>
  );
}

export default function SettingsBilling() {
  return (
    <SettingsLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
            Billing
          </h1>
          <p className="text-[12px] text-[var(--gray-600)]">
            Manage your subscription, usage, and payment methods.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* Plan Card */}
      <div className="flex items-center justify-between rounded-lg bg-[var(--black-primary)] p-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
            CURRENT PLAN
          </span>
          <span className="text-[20px] font-semibold text-white">
            Starter Plan
          </span>
          <span className="text-[12px] text-[#999999]">
            $200/mo · 6 agent seats · 20,000 credits · Renews Feb 15, 2026
          </span>
        </div>
        <button className="rounded-md border border-[#555555] px-4 py-2 text-[12px] font-medium text-white">
          Upgrade Plan
        </button>
      </div>

      {/* Usage Label */}
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
        USAGE THIS PERIOD
      </span>

      {/* Usage Cards */}
      <div className="flex w-full gap-4">
        {/* Credits Used */}
        <div className="flex flex-1 flex-col gap-2 rounded-lg bg-[var(--bg-surface)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[20px] font-semibold text-[var(--black-primary)]">
              14,280
            </span>
            <span className="text-[12px] text-[var(--gray-500)]">71%</span>
          </div>
          <span className="text-[11px] text-[var(--gray-500)]">
            Credits Used
          </span>
          <div className="h-1 w-full rounded-sm bg-[var(--border-light)]">
            <div
              className="h-1 rounded-sm bg-[var(--red-primary)]"
              style={{ width: "71%" }}
            />
          </div>
        </div>

        {/* Agent Seats */}
        <div className="flex flex-1 flex-col gap-2 rounded-lg bg-[var(--bg-surface)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[20px] font-semibold text-[var(--black-primary)]">
              4 / 6
            </span>
            <span className="text-[12px] text-[var(--gray-500)]">67%</span>
          </div>
          <span className="text-[11px] text-[var(--gray-500)]">
            Agent Seats
          </span>
          <div className="h-1 w-full rounded-sm bg-[var(--border-light)]">
            <div
              className="h-1 rounded-sm bg-[#4CAF50]"
              style={{ width: "67%" }}
            />
          </div>
        </div>
      </div>

      {/* Ad-hoc Billing toggle */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--border-light)] p-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-medium text-[var(--black-primary)]">
            Ad-hoc Billing
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">
            Allow agents to consume additional credits beyond the plan limit at
            $0.015 per credit.
          </span>
        </div>
        <Toggle enabled={true} />
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* Payment Method Label */}
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
        PAYMENT METHOD
      </span>

      {/* Payment Card */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--border-light)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-10 items-center justify-center rounded bg-[#1A1F71]">
            <span className="text-[9px] font-bold text-white">VISA</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[13px] font-medium text-[var(--black-primary)]">
              &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull;
              &bull;&bull;&bull;&bull; 4242
            </span>
            <span className="text-[11px] text-[var(--gray-500)]">
              Expires 08/2027
            </span>
          </div>
        </div>
        <button className="rounded-md border border-[var(--border-light)] px-3 py-1.5 text-[11px] font-medium text-[var(--gray-600)]">
          Update
        </button>
      </div>
    </SettingsLayout>
  );
}

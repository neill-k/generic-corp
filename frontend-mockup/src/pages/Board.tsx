import AppLayout from "../components/AppLayout";

/* ------------------------------------------------------------------ */
/*  Inline SVG icons (no lucide-react dependency)                      */
/* ------------------------------------------------------------------ */

function IconPlus({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconSearch({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconColumns3({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  );
}

function IconList({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Tag {
  label: string;
  color: string;       // text color
  bg: string;          // background color
}

interface CardData {
  title: string;
  tags: Tag[];
  avatarInitials: string;
  avatarBg: string;
  avatarName: string;
  date: string;
}

interface ColumnData {
  name: string;
  dotColor: string;
  count: number;
  cards: CardData[];
  /** Cards in "Done" column render at reduced opacity */
  faded?: boolean;
}

const columns: ColumnData[] = [
  {
    name: "Backlog",
    dotColor: "var(--gray-500)",
    count: 4,
    cards: [
      {
        title: "Set up alerting for payment service",
        tags: [
          { label: "P2", color: "#E65100", bg: "#FFF3E0" },
          { label: "infra", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "MR",
        avatarBg: "var(--black-primary)",
        avatarName: "Marcus R.",
        date: "Jan 28",
      },
      {
        title: "Write API documentation for v2 endpoints",
        tags: [
          { label: "P3", color: "#1565C0", bg: "#E3F2FD" },
          { label: "docs", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "LP",
        avatarBg: "#5C6BC0",
        avatarName: "Lisa P.",
        date: "Jan 29",
      },
      {
        title: "Research SSO provider options",
        tags: [
          { label: "P2", color: "#E65100", bg: "#FFF3E0" },
          { label: "security", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "RC",
        avatarBg: "#26A69A",
        avatarName: "Ryan C.",
        date: "Feb 1",
      },
      {
        title: "Plan Q1 infrastructure budget",
        tags: [
          { label: "P3", color: "#1565C0", bg: "#E3F2FD" },
          { label: "planning", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "SC",
        avatarBg: "#EF5350",
        avatarName: "Sarah C.",
        date: "Feb 3",
      },
    ],
  },
  {
    name: "In Progress",
    dotColor: "#1565C0",
    count: 3,
    cards: [
      {
        title: "Review staging deployment pipeline",
        tags: [
          { label: "P1", color: "#C62828", bg: "#FFEBEE" },
          { label: "devops", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "MR",
        avatarBg: "var(--black-primary)",
        avatarName: "Marcus R.",
        date: "12m ago",
      },
      {
        title: "Audit error logs from production API",
        tags: [
          { label: "P2", color: "#E65100", bg: "#FFF3E0" },
          { label: "backend", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "LP",
        avatarBg: "#5C6BC0",
        avatarName: "Lisa P.",
        date: "45m ago",
      },
      {
        title: "Optimize image processing pipeline",
        tags: [
          { label: "P2", color: "#E65100", bg: "#FFF3E0" },
          { label: "perf", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "RC",
        avatarBg: "#26A69A",
        avatarName: "Ryan C.",
        date: "2h ago",
      },
    ],
  },
  {
    name: "Review",
    dotColor: "#E65100",
    count: 2,
    cards: [
      {
        title: "PR #482 \u2014 Auth middleware refactor",
        tags: [
          { label: "P2", color: "#E65100", bg: "#FFF3E0" },
          { label: "review", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "MR",
        avatarBg: "var(--black-primary)",
        avatarName: "Marcus R.",
        date: "1h ago",
      },
      {
        title: "Vendor security questionnaire draft",
        tags: [
          { label: "P1", color: "#C62828", bg: "#FFEBEE" },
          { label: "compliance", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "SC",
        avatarBg: "#EF5350",
        avatarName: "Sarah C.",
        date: "30m ago",
      },
    ],
  },
  {
    name: "Done",
    dotColor: "#2E7D32",
    count: 5,
    faded: true,
    cards: [
      {
        title: "Generate Q4 engineering metrics report",
        tags: [
          { label: "Done", color: "#2E7D32", bg: "#E8F5E9" },
          { label: "reporting", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "MR",
        avatarBg: "var(--black-primary)",
        avatarName: "Marcus R.",
        date: "8m 41s",
      },
      {
        title: "Summarize standup notes for #eng-general",
        tags: [
          { label: "Done", color: "#2E7D32", bg: "#E8F5E9" },
          { label: "comms", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "LP",
        avatarBg: "#5C6BC0",
        avatarName: "Lisa P.",
        date: "2m 10s",
      },
      {
        title: "Update onboarding docs for new hires",
        tags: [
          { label: "Done", color: "#2E7D32", bg: "#E8F5E9" },
          { label: "docs", color: "var(--gray-600)", bg: "var(--bg-surface)" },
        ],
        avatarInitials: "RC",
        avatarBg: "#26A69A",
        avatarName: "Ryan C.",
        date: "5m 02s",
      },
    ],
  },
];

const filters = ["All", "Engineering", "Operations", "Sales"] as const;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TaskCard({ card, faded }: { card: CardData; faded?: boolean }) {
  return (
    <div
      className={`flex w-full flex-col gap-2.5 rounded-lg border border-[var(--border-light)] bg-white p-3${faded ? " opacity-70" : ""}`}
    >
      {/* Title */}
      <p
        className={`text-xs font-medium leading-[1.4]${faded ? " text-[var(--gray-600)]" : " text-[var(--black-primary)]"}`}
      >
        {card.title}
      </p>

      {/* Tags */}
      <div className="flex gap-1">
        {card.tags.map((tag) => (
          <span
            key={tag.label}
            className="font-mono rounded px-1.5 py-0.5 text-[9px]"
            style={{
              color: tag.color,
              backgroundColor: tag.bg,
              fontWeight: tag.label === "Done" || /^P\d$/.test(tag.label) ? 600 : 400,
            }}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ backgroundColor: card.avatarBg }}
          >
            <span className="text-[7px] font-semibold text-white">
              {card.avatarInitials}
            </span>
          </div>
          <span className="text-[10px] text-[var(--gray-500)]">
            {card.avatarName}
          </span>
        </div>
        <span className="font-mono text-[9px] text-[var(--gray-500)]">
          {card.date}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({ column }: { column: ColumnData }) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3">
      {/* Column header */}
      <div className="flex w-full items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: column.dotColor }}
          />
          <span className="text-xs font-semibold text-[var(--black-primary)]">
            {column.name}
          </span>
          <span className="font-mono rounded-[10px] bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--gray-600)]">
            {column.count}
          </span>
        </div>
        <IconPlus size={16} className="text-[var(--gray-500)]" />
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {column.cards.map((card) => (
          <TaskCard key={card.title} card={card} faded={column.faded} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Board() {
  return (
    <AppLayout>
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* ---- Board Header ---- */}
        <div className="flex flex-col gap-5 px-8 pt-6">
          {/* Title row */}
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="h-6 w-[3px] rounded-sm bg-[var(--red-primary)]" />
                <h1 className="text-[22px] font-semibold text-[var(--black-primary)]">
                  Task Board
                </h1>
              </div>
              <p className="text-[13px] text-[var(--gray-500)]">
                Track and manage tasks across all agents
              </p>
            </div>
            <button className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2">
              <IconPlus size={14} className="text-white" />
              <span className="text-xs font-medium text-white">New Task</span>
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex w-full items-center justify-between">
            {/* Left: search + filters */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-[var(--border-light)] px-3 py-2">
                <IconSearch size={14} className="text-[var(--gray-500)]" />
                <span className="text-xs text-[var(--gray-500)]">
                  Search tasks...
                </span>
              </div>

              {filters.map((f) => {
                const isActive = f === "All";
                return (
                  <span
                    key={f}
                    className={`rounded-full px-3 py-1.5 text-[11px] ${
                      isActive
                        ? "bg-[var(--black-primary)] font-medium text-white"
                        : "border border-[var(--border-light)] text-[var(--gray-600)]"
                    }`}
                  >
                    {f}
                  </span>
                );
              })}
            </div>

            {/* Right: view toggles */}
            <div className="flex items-center gap-0.5 rounded-md border border-[var(--border-light)]">
              <span className="flex items-center gap-1 bg-[var(--bg-surface)] px-3 py-1.5">
                <IconColumns3 size={14} className="text-[var(--black-primary)]" />
                <span className="text-[11px] font-medium text-[var(--black-primary)]">
                  Board
                </span>
              </span>
              <span className="flex items-center gap-1 px-3 py-1.5">
                <IconList size={14} className="text-[var(--gray-500)]" />
                <span className="text-[11px] text-[var(--gray-500)]">List</span>
              </span>
            </div>
          </div>
        </div>

        {/* ---- Kanban Board ---- */}
        <div className="flex flex-1 gap-4 overflow-hidden px-8 pb-6">
          {columns.map((col) => (
            <KanbanColumn key={col.name} column={col} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

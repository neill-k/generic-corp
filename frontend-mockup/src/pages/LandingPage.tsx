{/* Pencil frame: Landing Page (J0BV2) — 1440×auto */}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons (no lucide-react dependency)                      */
/* ------------------------------------------------------------------ */
const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconMessageSquare({ className = "" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconShield({ className = "" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

function IconZap({ className = "" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  );
}

function IconCreditCard({ className = "" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function IconBell({ className = "" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconGitBranch({ className = "" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <line x1="6" x2="6" y1="3" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */
function Header() {
  return (
    <header
      className="flex items-center justify-between w-full h-16 px-[60px] border-b border-[#1A1A1A]"
      style={{
        boxShadow: "0 30px 160px 20px rgba(229, 57, 53, 0.376)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-[#E53935] rounded-none" />
        <span className="font-mono text-white text-sm font-medium">
          GENERIC CORP
        </span>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-8">
        <a href="#" className="font-ui text-[13px] text-[#999999] hover:text-white transition-colors">
          Product
        </a>
        <a href="#" className="font-ui text-[13px] text-[#999999] hover:text-white transition-colors">
          Features
        </a>
        <a href="#" className="font-ui text-[13px] text-[#999999] hover:text-white transition-colors">
          Pricing
        </a>
        <a href="#" className="font-ui text-[13px] text-[#999999] hover:text-white transition-colors">
          Docs
        </a>
      </nav>

      {/* Right: login + CTA */}
      <div className="flex items-center gap-4">
        <a href="#" className="font-ui text-[13px] text-[#999999] hover:text-white transition-colors">
          Log in
        </a>
        <button className="bg-[#E53935] text-white font-ui text-[13px] font-medium px-5 py-2 hover:bg-[#d32f2f] transition-colors">
          Join Waitlist
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="flex flex-col items-center gap-10 w-full py-20 px-[120px]">
      {/* Badge */}
      <div className="flex items-center gap-2 border border-[#333333] px-4 py-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#E53935]" />
        <span className="font-mono text-[11px] text-[#999999]">
          Community Edition — Available Now
        </span>
      </div>

      {/* Headline + subline */}
      <div className="flex flex-col items-center gap-5 max-w-[900px]">
        <h1 className="font-ui text-[64px] font-bold text-white text-center leading-[1.05]">
          Your AI workforce,{"\n"}under one roof.
        </h1>
        <p className="font-ui text-lg text-[#777777] text-center leading-[1.5] max-w-[700px]">
          Generic Corp gives every team an always-on AI agent workforce —
          orchestrated, observable, and integrated into the tools you already
          use. Community edition available now. Hosted platform coming soon.
        </p>
      </div>

      {/* CTA row */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 bg-[#E53935] text-white font-ui text-[15px] font-medium px-8 py-3.5 hover:bg-[#d32f2f] transition-colors">
          Join Waitlist <span>→</span>
        </button>
        <button className="font-ui text-[15px] font-medium text-white px-8 py-3.5 border border-[#444444] hover:border-[#666666] transition-colors">
          Download Community Edition
        </button>
      </div>

      {/* Screenshot placeholder */}
      <div className="flex items-center justify-center w-[1100px] max-w-full h-[620px] bg-[#111111] border border-[#222222]">
        <span className="font-mono text-sm text-[#444444]">
          Screenshot placeholder
        </span>
      </div>

      {/* Trust row */}
      <div className="flex items-center justify-center gap-10 w-full">
        <span className="font-ui text-xs text-[#555555]">Trusted by teams at</span>
        <span className="font-ui text-sm font-semibold text-[#444444]">Stripe</span>
        <span className="font-ui text-sm font-semibold text-[#444444]">Vercel</span>
        <span className="font-ui text-sm font-semibold text-[#444444]">Linear</span>
        <span className="font-ui text-sm font-semibold text-[#444444]">Notion</span>
        <span className="font-ui text-sm font-semibold text-[#444444]">Figma</span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                       */
/* ------------------------------------------------------------------ */
const steps = [
  {
    num: "01",
    title: "Deploy agents",
    desc: "Spin up specialized AI agents for engineering, ops, sales, and security — each with their own skills and MCP server connections.",
  },
  {
    num: "02",
    title: "Orchestrate tasks",
    desc: "Route work through a real-time task board. Agents collaborate, escalate, and hand off — just like a human team, but never offline.",
  },
  {
    num: "03",
    title: "Observe everything",
    desc: "Full visibility into every agent's decisions, tool calls, and outputs. Live org chart, thread history, and cost tracking — all in one place.",
  },
];

function HowItWorks() {
  return (
    <section className="flex flex-col items-center gap-[60px] w-full bg-[#080808] border-t border-[#1A1A1A] py-[100px] px-[120px]">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 max-w-[600px]">
        <span className="font-mono text-[11px] font-medium text-[#E53935] tracking-[2px]">
          HOW IT WORKS
        </span>
        <h2 className="font-ui text-[40px] font-bold text-white text-center leading-[1.1]">
          Three steps to an{"\n"}autonomous workforce.
        </h2>
      </div>

      {/* Step cards */}
      <div className="flex gap-6 w-full">
        {steps.map((s) => (
          <div
            key={s.num}
            className="flex flex-col gap-4 flex-1 bg-[#111111] border border-[#1A1A1A] p-8"
          >
            <span className="font-mono text-[32px] font-semibold text-[#E53935]">
              {s.num}
            </span>
            <span className="font-ui text-lg font-semibold text-white">
              {s.title}
            </span>
            <p className="font-ui text-sm text-[#777777] leading-[1.6]">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features (alternating rows)                                        */
/* ------------------------------------------------------------------ */
const features = [
  {
    tag: "AGENT ORG CHART",
    title: "See your entire AI workforce at a glance.",
    desc: "A real-time organizational view of every agent — their role, status, active tasks, and tool connections. Click into any agent for live activity streams, message history, and configuration.",
    imgRight: true,
  },
  {
    tag: "TASK BOARD",
    title: "A command center for every task.",
    desc: "Kanban-style board with live status updates. Assign work to agents, track progress across queues, and surface blockers before they cascade. Every card links back to the full conversation thread.",
    imgRight: false,
  },
  {
    tag: "MCP INTEGRATIONS",
    title: "Connect agents to every tool in your stack.",
    desc: "MCP servers let agents call GitHub, Slack, Jira, databases, and internal APIs natively. Add new servers in seconds. Monitor connection health and tool usage from a single dashboard.",
    imgRight: true,
  },
];

function FeatureRow({
  tag,
  title,
  desc,
  imgRight,
}: {
  tag: string;
  title: string;
  desc: string;
  imgRight: boolean;
}) {
  const text = (
    <div className="flex flex-col gap-5 flex-1">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-[#E53935]" />
        <span className="font-mono text-[11px] font-medium text-[#E53935] tracking-[1px]">
          {tag}
        </span>
      </div>
      <h3 className="font-ui text-[32px] font-bold text-white leading-[1.15]">
        {title}
      </h3>
      <p className="font-ui text-[15px] text-[#777777] leading-[1.6]">
        {desc}
      </p>
    </div>
  );

  const img = (
    <div className="flex items-center justify-center w-[560px] shrink-0 h-[380px] bg-[#111111] border border-[#1A1A1A]">
      <span className="font-mono text-[13px] text-[#444444]">
        Screenshot placeholder
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-[60px] w-full">
      {imgRight ? (
        <>
          {text}
          {img}
        </>
      ) : (
        <>
          {img}
          {text}
        </>
      )}
    </div>
  );
}

function Features() {
  return (
    <section className="flex flex-col gap-20 w-full bg-black py-[100px] px-[120px]">
      {features.map((f) => (
        <FeatureRow key={f.tag} {...f} />
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Capabilities (6 cards, 2 rows of 3)                                */
/* ------------------------------------------------------------------ */
const capabilities = [
  {
    icon: <IconMessageSquare className="text-[#E53935]" />,
    title: "Agent Chat",
    desc: "Direct conversation threads with any agent. Full message history, context sharing, and tool call transparency.",
  },
  {
    icon: <IconShield className="text-[#E53935]" />,
    title: "Security & Access",
    desc: "Two-factor auth, SSO, IP allowlisting, session controls, and full audit logging for every agent action.",
  },
  {
    icon: <IconZap className="text-[#E53935]" />,
    title: "Skills Engine",
    desc: "Enable or disable agent capabilities per workspace. Bash, code review, deployments, monitoring — you control what agents can do.",
  },
  {
    icon: <IconCreditCard className="text-[#E53935]" />,
    title: "Usage & Billing",
    desc: "Credit-based billing with per-agent cost tracking. Set budgets, enable ad-hoc overages, and monitor spend in real time.",
  },
  {
    icon: <IconBell className="text-[#E53935]" />,
    title: "Smart Notifications",
    desc: "Route alerts to Email, Slack, or in-app. Get notified when agents go offline, tasks fail, or spend thresholds are hit.",
  },
  {
    icon: <IconGitBranch className="text-[#E53935]" />,
    title: "Developer-First",
    desc: "API keys, webhook support, and full programmatic control. Build on top of Generic Corp with the tools you already know.",
  },
];

function Capabilities() {
  return (
    <section className="flex flex-col items-center gap-[60px] w-full bg-[#080808] border-t border-[#1A1A1A] py-[100px] px-[120px]">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 max-w-[600px]">
        <span className="font-mono text-[11px] font-medium text-[#E53935] tracking-[2px]">
          CAPABILITIES
        </span>
        <h2 className="font-ui text-[40px] font-bold text-white text-center leading-[1.1]">
          Everything you need to run{"\n"}an AI-native operation.
        </h2>
      </div>

      {/* Grid: 2 rows of 3 */}
      <div className="flex flex-col gap-5 w-full">
        <div className="flex gap-5 w-full">
          {capabilities.slice(0, 3).map((c) => (
            <div
              key={c.title}
              className="flex flex-col gap-3 flex-1 bg-[#111111] border border-[#1A1A1A] p-7"
            >
              {c.icon}
              <span className="font-ui text-base font-semibold text-white">
                {c.title}
              </span>
              <p className="font-ui text-[13px] text-[#777777] leading-[1.6]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-5 w-full">
          {capabilities.slice(3).map((c) => (
            <div
              key={c.title}
              className="flex flex-col gap-3 flex-1 bg-[#111111] border border-[#1A1A1A] p-7"
            >
              {c.icon}
              <span className="font-ui text-base font-semibold text-white">
                {c.title}
              </span>
              <p className="font-ui text-[13px] text-[#777777] leading-[1.6]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Social Proof (stats + testimonials)                                */
/* ------------------------------------------------------------------ */
const stats = [
  { value: "12,000+", label: "Agent tasks completed" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "340+", label: "Teams onboarded" },
  { value: "< 2s", label: "Avg response time" },
];

const testimonials = [
  {
    quote:
      "\u201CWe replaced three internal tools with Generic Corp. Our agents handle deploys, incident triage, and sprint planning — all without human intervention.\u201D",
    name: "Sarah Chen — VP Eng, Meridian",
  },
  {
    quote:
      "\u201CThe observability is what sold us. We can see every decision an agent makes, every tool it calls. It\u2019s like having perfect transparency into a whole team.\u201D",
    name: "James Park — CTO, Archway Labs",
  },
];

function SocialProof() {
  return (
    <section className="flex flex-col items-center gap-[60px] w-full bg-black py-[100px] px-[120px]">
      {/* Stats row */}
      <div className="flex w-full">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col items-center gap-1 flex-1 py-8 ${
              i < stats.length - 1 ? "border-r border-[#1A1A1A]" : ""
            }`}
          >
            <span className="font-mono text-4xl font-semibold text-white">
              {s.value}
            </span>
            <span className="font-ui text-[13px] text-[#666666]">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Testimonials */}
      <div className="flex gap-6 w-full">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="flex flex-col gap-5 flex-1 border border-[#1A1A1A] p-8"
          >
            <p className="font-ui text-[15px] italic text-[#CCCCCC] leading-[1.6]">
              {t.quote}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#E53935]" />
              <span className="font-ui text-[13px] text-[#666666]">
                {t.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */
interface PricingTier {
  name: string;
  badge?: string;
  price: string;
  period?: string;
  credits: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Starter",
    price: "$200",
    period: "/mo",
    credits: "20,000 credits included",
    features: [
      "Up to 6 agents",
      "All skills & MCP servers",
      "Task board & chat",
      "Email notifications",
      "Community support",
    ],
    cta: "Join Waitlist",
  },
  {
    name: "Plus",
    badge: "MOST POPULAR",
    price: "$2,000",
    period: "/mo",
    credits: "250,000 credits included",
    features: [
      "Up to 50 agents",
      "SSO & advanced security",
      "Priority support",
      "Custom MCP servers",
      "Ad-hoc billing enabled",
    ],
    cta: "Join Waitlist",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$20,000",
    credits: "3,000,000 credits included",
    features: [
      "Unlimited agents",
      "Dedicated infrastructure",
      "SLA guarantee",
      "White-glove onboarding",
      "Custom integrations",
    ],
    cta: "Join Waitlist",
  },
  {
    name: "Enterprise",
    price: "Custom",
    credits: "Volume discounts available",
    features: [
      "Everything in Pro",
      "On-prem deployment",
      "Dedicated account manager",
      "Custom SLA terms",
      "SOC 2 & HIPAA compliance",
    ],
    cta: "Contact Us",
  },
];

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={`flex flex-col gap-6 flex-1 p-8 border ${
        tier.highlighted ? "border-[#E53935]" : "border-[#1A1A1A]"
      }`}
    >
      {/* Top section */}
      <div className="flex flex-col gap-2">
        {tier.badge && (
          <div className="self-start">
            <span className="font-mono text-[10px] font-medium text-white tracking-[1px] bg-[#E53935] px-2.5 py-1">
              {tier.badge}
            </span>
          </div>
        )}
        <span className="font-ui text-base font-semibold text-white">
          {tier.name}
        </span>
        <div className="flex items-end gap-1">
          <span className="font-mono text-4xl font-semibold text-white">
            {tier.price}
          </span>
          {tier.period && (
            <span className="font-ui text-sm text-[#666666]">
              {tier.period}
            </span>
          )}
        </div>
        <span className="font-ui text-[13px] text-[#666666]">
          {tier.credits}
        </span>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#1A1A1A]" />

      {/* Feature list */}
      <div className="flex flex-col gap-3">
        {tier.features.map((f) => (
          <span key={f} className="font-ui text-[13px] text-[#999999]">
            →&nbsp;&nbsp;{f}
          </span>
        ))}
      </div>

      {/* CTA button */}
      <button
        className={`flex items-center justify-center w-full h-11 font-ui text-sm font-medium text-white ${
          tier.highlighted
            ? "bg-[#E53935] hover:bg-[#d32f2f]"
            : "border border-[#444444] hover:border-[#666666]"
        } transition-colors mt-auto`}
      >
        {tier.cta}
      </button>
    </div>
  );
}

function Pricing() {
  return (
    <section className="flex flex-col items-center gap-[60px] w-full bg-[#080808] border-t border-[#1A1A1A] py-[100px] px-[120px]">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 max-w-[600px]">
        <span className="font-mono text-[11px] font-medium text-[#E53935] tracking-[2px]">
          PRICING
        </span>
        <h2 className="font-ui text-[40px] font-bold text-white text-center leading-[1.1]">
          Simple, credit-based pricing.
        </h2>
        <p className="font-ui text-base text-[#666666] text-center leading-[1.5]">
          No per-seat fees. No hidden charges. Pay for what your agents use.
        </p>
      </div>

      {/* Tier cards */}
      <div className="flex gap-6 w-full">
        {tiers.map((t) => (
          <PricingCard key={t.name} tier={t} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */
function FinalCTA() {
  return (
    <section className="flex flex-col items-center gap-8 w-full bg-black py-[120px] px-[120px]">
      <h2 className="font-ui text-5xl font-bold text-white text-center leading-[1.1] max-w-[800px]">
        Ready to put your AI{"\n"}workforce to work?
      </h2>
      <p className="font-ui text-base text-[#666666] text-center leading-[1.5] max-w-[500px]">
        Download the community edition today — bring your own credentials and
        run it on your own server. Or join the waitlist for our fully managed
        hosted platform.
      </p>
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 bg-[#E53935] text-white font-ui text-base font-medium px-10 py-4 hover:bg-[#d32f2f] transition-colors">
          Join Waitlist <span>→</span>
        </button>
        <button className="font-ui text-base font-medium text-white px-10 py-4 border border-[#444444] hover:border-[#666666] transition-colors">
          Download Community Edition
        </button>
      </div>
      <span className="font-mono text-xs text-[#555555]">
        Open source · Self-hosted · Available now
      </span>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="flex flex-col gap-12 w-full bg-black border-t border-[#1A1A1A] py-[60px] px-[120px]">
      {/* Top row */}
      <div className="flex justify-between w-full">
        {/* Brand */}
        <div className="flex flex-col gap-3 w-[280px]">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#E53935]" />
            <span className="font-mono text-sm font-medium text-white">
              GENERIC CORP
            </span>
          </div>
          <p className="font-ui text-[13px] text-[#555555] leading-[1.5]">
            The AI-native workspace for teams that ship.
          </p>
        </div>

        {/* Link columns */}
        <div className="flex gap-[60px]">
          {/* Product */}
          <div className="flex flex-col gap-3">
            <span className="font-ui text-xs font-semibold text-white">
              Product
            </span>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Features
            </a>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Pricing
            </a>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Changelog
            </a>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Documentation
            </a>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-3">
            <span className="font-ui text-xs font-semibold text-white">
              Company
            </span>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              About
            </a>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Blog
            </a>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Careers
            </a>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Contact
            </a>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <span className="font-ui text-xs font-semibold text-white">
              Legal
            </span>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Privacy
            </a>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Terms
            </a>
            <a href="#" className="font-ui text-[13px] text-[#666666] hover:text-[#999999] transition-colors">
              Security
            </a>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between w-full pt-6 border-t border-[#1A1A1A]">
        <span className="font-ui text-xs text-[#444444]">
          &copy; 2026 Generic Corp. All rights reserved.
        </span>
        <div className="flex gap-6">
          <a href="#" className="font-ui text-xs text-[#444444] hover:text-[#666666] transition-colors">
            Twitter
          </a>
          <a href="#" className="font-ui text-xs text-[#444444] hover:text-[#666666] transition-colors">
            GitHub
          </a>
          <a href="#" className="font-ui text-xs text-[#444444] hover:text-[#666666] transition-colors">
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing Page (root)                                                */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <div className="min-h-full w-full bg-black flex flex-col">
      <Header />
      <Hero />
      <HowItWorks />
      <Features />
      <Capabilities />
      <SocialProof />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}

import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-corp-dark via-corp-mid to-corp-dark text-white font-mono">
      {/* Header */}
      <header className="bg-corp-mid/50 backdrop-blur-sm border-b border-corp-accent sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-corp-highlight font-bold tracking-wider text-2xl">GENERIC CORP</span>
            <span className="text-xs text-gray-500 bg-corp-dark px-2 py-1 rounded">v0.1.0 ALPHA</span>
          </div>
          <Link
            to="/game"
            className="px-6 py-2 bg-corp-highlight hover:bg-corp-highlight/80 text-corp-dark font-bold rounded transition-colors"
          >
            Launch Demo →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-corp-highlight via-yellow-400 to-corp-highlight bg-clip-text text-transparent">
            Manage AI Agents.
            <br />
            Build a Company.
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            An isometric management game where you oversee a team of real AI agents powered by Claude.
            Watch them collaborate, solve problems, and work autonomously to save a struggling startup.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/game"
              className="px-8 py-4 bg-corp-highlight hover:bg-corp-highlight/80 text-corp-dark font-bold text-lg rounded transition-all transform hover:scale-105"
            >
              Try the Demo
            </Link>
            <a
              href="https://github.com/neill-k/generic-corp"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-corp-mid hover:bg-corp-accent/20 border border-corp-accent text-white font-bold text-lg rounded transition-all"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-corp-highlight">Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon="🤖"
            title="Real AI Agents"
            description="Each agent is powered by Claude Agent SDK with unique personalities and skills. Watch them think, communicate, and execute tasks autonomously."
          />
          <FeatureCard
            icon="🎮"
            title="Isometric Office"
            description="Beautiful pixel art isometric view built with Phaser 3. See your agents move around the office in real-time as they work."
          />
          <FeatureCard
            icon="⚡"
            title="Real-Time Updates"
            description="WebSocket-powered live updates. Watch tasks progress, messages flow, and agents collaborate without refreshing."
          />
          <FeatureCard
            icon="💬"
            title="Agent Communication"
            description="Agents send messages to each other, collaborate on tasks, and report progress just like a real team."
          />
          <FeatureCard
            icon="📊"
            title="Task Management"
            description="Create tasks, assign them to agents, and watch them get completed. Full visibility into agent workload and progress."
          />
          <FeatureCard
            icon="🔧"
            title="Open Source"
            description="Built with TypeScript, React, Phaser, Express, PostgreSQL, and Redis. Fully extensible and hackable."
          />
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-corp-highlight">Built With</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <TechBadge name="Claude Agent SDK" />
          <TechBadge name="TypeScript" />
          <TechBadge name="React 18" />
          <TechBadge name="Phaser 3" />
          <TechBadge name="Express" />
          <TechBadge name="PostgreSQL" />
          <TechBadge name="Redis" />
          <TechBadge name="WebSockets" />
        </div>
      </section>

      {/* Team Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-corp-highlight">Meet the Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <AgentCard name="Marcus Bell" role="CEO" description="Coordinates team efforts and sets strategic direction" />
          <AgentCard name="Sable Chen" role="Principal Engineer" description="Architecture expert and code review specialist" />
          <AgentCard name="DeVonte Jackson" role="Full-Stack Developer" description="Rapid prototyper who gets features shipped" />
          <AgentCard name="Yuki Tanaka" role="SRE" description="Infrastructure and reliability guardian" />
          <AgentCard name="Graham Sutton" role="Data Engineer" description="Analytics pipelines and data infrastructure" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-corp-mid to-corp-accent/20 border border-corp-accent rounded-lg p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to See AI Agents in Action?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Launch the demo and assign your first task to an AI agent.
          </p>
          <Link
            to="/game"
            className="inline-block px-10 py-4 bg-corp-highlight hover:bg-corp-highlight/80 text-corp-dark font-bold text-xl rounded transition-all transform hover:scale-105"
          >
            Launch Demo Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-corp-mid border-t border-corp-accent mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-corp-highlight font-bold tracking-wider">GENERIC CORP</span>
              <span className="text-gray-500 text-sm">© 2026</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="https://github.com/neill-k/generic-corp" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-corp-highlight transition-colors">
                GitHub
              </a>
              <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-corp-highlight transition-colors">
                Powered by Claude
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Utility Components
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-corp-mid border border-corp-accent rounded-lg p-6 hover:border-corp-highlight transition-colors">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-corp-highlight">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function TechBadge({ name }: { name: string }) {
  return (
    <div className="bg-corp-mid border border-corp-accent rounded px-4 py-3 text-center text-sm font-medium hover:border-corp-highlight transition-colors">
      {name}
    </div>
  );
}

function AgentCard({ name, role, description }: { name: string; role: string; description: string }) {
  return (
    <div className="bg-corp-mid border border-corp-accent rounded-lg p-6 hover:border-corp-highlight transition-colors">
      <div className="w-16 h-16 bg-corp-accent rounded-full mb-4 flex items-center justify-center text-2xl">
        👤
      </div>
      <h3 className="text-lg font-bold mb-1 text-corp-highlight">{name}</h3>
      <p className="text-sm text-gray-400 mb-3">{role}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

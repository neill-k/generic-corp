import React from 'react'

const features = [
  {
    icon: '👁️',
    title: 'Real-Time Visual Orchestration',
    description: 'See every agent action, decision, and interaction as it happens. Debug faster, ship with confidence.',
    highlight: 'LangGraph and CrewAI are code-first/CLI-only. We have live visual debugging.',
    technicalDetails: [
      'Isometric game-like visualization',
      'Real-time agent state monitoring',
      'Interactive debugging interface',
      'Complete execution history'
    ]
  },
  {
    icon: '🏢',
    title: 'Multi-Tenant Production Architecture',
    description: 'Enterprise-grade security and isolation from day one. No "rebuild for production" surprises.',
    highlight: 'Built by ex-Google, ex-Stripe engineers',
    technicalDetails: [
      'Multi-tenant PostgreSQL with row-level security',
      'Per-tenant data isolation',
      'Kubernetes-native horizontal scaling',
      '99.5% uptime SLA for Pro tier'
    ]
  },
  {
    icon: '📚',
    title: 'Template-First Developer Experience',
    description: 'Clone proven workflows, customize for your use case. Start with best practices, not blank files.',
    highlight: 'Get to production in minutes, not weeks',
    technicalDetails: [
      'RESTful API with full OpenAPI documentation',
      'Python & TypeScript SDKs included',
      'Webhook support for event-driven workflows',
      'Local development mode for testing'
    ]
  },
  {
    icon: '🔐',
    title: 'Built on Anthropic Claude',
    description: 'Leverage the most reliable AI models with built-in Agent SDK integration.',
    highlight: 'Production-grade reliability and safety',
    technicalDetails: [
      'SOC 2 Type II ready architecture',
      'End-to-end encryption for agent communications',
      'API rate limiting and abuse prevention',
      'Comprehensive audit logging'
    ]
  }
]

function Features() {
  return (
    <section id="features" className="section" style={{background: 'linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%)'}}>
      <div className="container">
        <div className="section-header">
          <h2>Why Developers Choose Us</h2>
          <p>Production-grade multi-agent orchestration designed for modern engineering teams</p>
        </div>

        <div className="demo-grid">
          {features.map((feature, index) => (
            <div key={index} className="demo-card" style={{background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(139, 92, 246, 0.3)'}}>
              <div className="demo-card-icon" style={{fontSize: '48px', marginBottom: '20px'}}>{feature.icon}</div>
              <h3 style={{color: '#8b5cf6', marginBottom: '12px'}}>{feature.title}</h3>
              <p style={{marginBottom: '16px', fontSize: '16px', lineHeight: '1.6'}}>{feature.description}</p>

              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                borderLeft: '3px solid #8b5cf6',
                padding: '12px 16px',
                marginBottom: '16px',
                fontSize: '14px',
                fontStyle: 'italic',
                color: '#c4b5fd'
              }}>
                {feature.highlight}
              </div>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                fontSize: '14px',
                color: '#94a3b8'
              }}>
                {feature.technicalDetails.map((detail, idx) => (
                  <li key={idx} style={{
                    marginBottom: '8px',
                    paddingLeft: '20px',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: '#8b5cf6'
                    }}>✓</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features

import React from 'react'

const features = [
  {
    icon: '👁️',
    title: 'Real-Time Visual Orchestration',
    description: 'See every agent action, decision, and interaction as it happens. Debug faster, ship with confidence.',
    highlight: 'LangGraph and CrewAI are code-first/CLI-only. We have live visual debugging.'
  },
  {
    icon: '🏢',
    title: 'Multi-Tenant Production Architecture',
    description: 'Enterprise-grade security and isolation from day one. No "rebuild for production" surprises.',
    highlight: 'Multi-tenant PostgreSQL with row-level security, Kubernetes-native scaling.'
  },
  {
    icon: '📋',
    title: 'Template-First Developer Experience',
    description: 'Clone proven workflows, customize for your use case. Start with best practices, not blank files.',
    highlight: 'Deploy in minutes with pre-built templates for common agent workflows.'
  },
  {
    icon: '🤖',
    title: 'Built on Anthropic Claude',
    description: 'Leverage the most reliable AI models with built-in Agent SDK integration.',
    highlight: '99.5% uptime SLA for Pro tier, enterprise-ready from day one.'
  }
]

function TechnicalFeatures() {
  return (
    <section className="section" style={{background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)'}}>
      <div className="container">
        <div className="section-header">
          <h2>Why Developers Choose Generic Corp</h2>
          <p>Production-grade capabilities that set us apart</p>
        </div>

        <div className="demo-grid">
          {features.map((feature, index) => (
            <div key={index} className="demo-card" style={{textAlign: 'left'}}>
              <div className="demo-card-icon" style={{marginBottom: '15px'}}>{feature.icon}</div>
              <h3 style={{marginBottom: '10px', fontSize: '20px'}}>{feature.title}</h3>
              <p style={{marginBottom: '12px', color: '#374151'}}>{feature.description}</p>
              <p style={{fontSize: '14px', color: '#6366f1', fontWeight: '500', fontStyle: 'italic'}}>
                {feature.highlight}
              </p>
            </div>
          ))}
        </div>

        <div style={{marginTop: '50px', padding: '30px', background: '#f3f4f6', borderRadius: '12px'}}>
          <h3 style={{marginBottom: '20px', textAlign: 'center'}}>Technical Credibility</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', fontSize: '14px'}}>
            <div>
              <strong>Architecture:</strong>
              <ul style={{marginTop: '8px', paddingLeft: '20px'}}>
                <li>Multi-tenant PostgreSQL with row-level security</li>
                <li>Kubernetes-native with horizontal scaling</li>
                <li>Built by ex-Google, ex-Stripe engineers</li>
              </ul>
            </div>
            <div>
              <strong>Developer Experience:</strong>
              <ul style={{marginTop: '8px', paddingLeft: '20px'}}>
                <li>RESTful API with full OpenAPI documentation</li>
                <li>Python & TypeScript SDKs included</li>
                <li>Webhook support for event-driven workflows</li>
              </ul>
            </div>
            <div>
              <strong>Security & Compliance:</strong>
              <ul style={{marginTop: '8px', paddingLeft: '20px'}}>
                <li>SOC 2 Type II ready architecture</li>
                <li>End-to-end encryption for agent communications</li>
                <li>Per-tenant data isolation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TechnicalFeatures

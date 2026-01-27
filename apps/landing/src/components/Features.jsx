import React from 'react'

const features = [
  {
    icon: '🔄',
    title: 'Multi-Provider AI Orchestration',
    description: 'Connect to OpenAI, Anthropic Claude, Google Gemini, and open-source models through a unified API. Switch providers without rewriting code.',
    highlight: 'One API for all major LLM providers',
    technicalDetails: [
      'Unified interface for Claude, GPT-4, Gemini',
      'Automatic fallback and retry logic',
      'Provider-agnostic agent definitions',
      'No vendor lock-in'
    ]
  },
  {
    icon: '💰',
    title: 'Intelligent Cost Optimization',
    description: 'Automatic routing to the most cost-effective model for each task. Built-in caching and prompt optimization reduce LLM costs significantly.',
    highlight: 'Built-in cost savings and real-time tracking',
    technicalDetails: [
      'Smart routing based on task complexity',
      'Response caching to reduce API calls',
      'Real-time cost tracking and analytics',
      'Provider cost comparison dashboard'
    ]
  },
  {
    icon: '🛠️',
    title: 'Developer-First Design',
    description: 'Built by engineers, for engineers. Comprehensive debugging tools, clear error messages, and local development environment.',
    highlight: 'Production-ready from day one',
    technicalDetails: [
      'RESTful API with comprehensive documentation',
      'Python SDK with TypeScript coming soon',
      'Webhook support for real-time notifications',
      'Environment-based configuration'
    ]
  },
  {
    icon: '🔐',
    title: 'Enterprise-Ready Security',
    description: 'Multi-tenant isolation, API key scoping, rate limiting, and audit logging built in from day one.',
    highlight: 'Secure and scalable by design',
    technicalDetails: [
      'Multi-tenant schema-level isolation',
      'SOC 2-aligned architecture',
      'Enterprise-grade encryption (TLS, at-rest)',
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

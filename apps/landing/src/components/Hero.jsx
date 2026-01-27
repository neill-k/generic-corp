import React from 'react'

function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <h1>Multi-Provider AI Orchestration Built for Production</h1>
        <p>
          Connect to Claude, GPT-4, Gemini, and open-source models through one unified platform. Intelligent routing, cost optimization, and enterprise-grade reliability built in from day one.
        </p>
        <div style={{marginBottom: '20px', fontSize: '16px', opacity: 0.9, fontStyle: 'italic'}}>
          <p>Stop overpaying for AI. Stop vendor lock-in. Stop rebuilding infrastructure. Start shipping faster.</p>
        </div>
        <div style={{marginBottom: '30px', fontSize: '16px', opacity: 0.9}}>
          <p>✨ Built by ex-Google & Stripe engineers. Production-ready from day one.</p>
        </div>
        <div className="cta-group">
          <a href="#waitlist" className="btn btn-primary">Join Beta Waitlist</a>
          <a href="#pricing" className="btn btn-secondary">View Pricing</a>
        </div>
      </div>
    </section>
  )
}

export default Hero

import React from 'react'

function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <h1>Ship Complex AI Agent Workflows in Minutes, Not Weeks</h1>
        <p>
          The only multi-agent orchestration platform with real-time visual debugging. Built for developers who need production-grade reliability without the complexity.
        </p>
        <div style={{marginBottom: '20px', fontSize: '16px', opacity: 0.9, fontStyle: 'italic'}}>
          <p>Managing multiple AI agents is complex. Debugging failures is painful. Scaling to production is risky. Until now.</p>
        </div>
        <div style={{marginBottom: '30px', fontSize: '16px', opacity: 0.9}}>
          <p>✨ Built on a configurable CLI-based agent runtime by ex-Google/Stripe engineers</p>
        </div>
        <div className="cta-group">
          <a href="#waitlist" className="btn btn-primary">Start Free Trial</a>
          <a href="#demo" className="btn btn-secondary">View Live Demo</a>
        </div>
      </div>
    </section>
  )
}

export default Hero

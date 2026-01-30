import React from 'react'

const demos = [
  {
    icon: '💬',
    title: 'Customer Support Automation',
    description: 'Agent reads support tickets, drafts responses, escalates complex issues. Multi-step workflows with approval gates and inter-agent messaging.',
    tag: 'ROI: 10x'
  },
  {
    icon: '📊',
    title: 'Data Analysis & Reporting',
    description: 'Agent queries databases, generates insights, creates visualizations. Long-running workflows with cost tracking and scheduled execution.',
    tag: 'Real-time'
  },
  {
    icon: '⚙️',
    title: 'Code Review & DevOps',
    description: 'Agent reviews PRs, runs tests, deploys to staging, monitors metrics. Tool permissions ensure agents can read code but need approval to deploy.',
    tag: 'Developer-Focused'
  },
  {
    icon: '🔌',
    title: 'Integration Orchestration',
    description: 'Agent coordinates between Slack, Jira, GitHub, and internal APIs. One agent, multiple integrations, zero credential exposure with OAuth framework.',
    tag: 'Enterprise'
  }
]

function DemoShowcase() {
  return (
    <section id="demo" className="section">
      <div className="container">
        <div className="section-header">
          <h2>Real-World Use Cases</h2>
          <p>See how engineering teams use AgentForce to automate complex workflows</p>
        </div>
        
        <div className="demo-grid">
          {demos.map((demo, index) => (
            <div key={index} className="demo-card">
              <div className="demo-card-icon">{demo.icon}</div>
              <h3>{demo.title}</h3>
              <p>{demo.description}</p>
              <span className="demo-tag">{demo.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DemoShowcase

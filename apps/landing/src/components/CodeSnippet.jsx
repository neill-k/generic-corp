import React, { useState } from 'react'

const codeExamples = {
  python: `# Create a multi-agent workflow in minutes
from genericcorp import AgentTeam, Agent

# Define specialized agents
researcher = Agent(
    name="researcher",
    role="research",
    model="claude-3-5-sonnet"
)

writer = Agent(
    name="writer",
    role="content_generation",
    model="claude-3-5-sonnet"
)

# Coordinate agents in a team
team = AgentTeam(agents=[researcher, writer])

# Execute workflow
result = team.run(
    task="Research AI trends and write a blog post",
    max_iterations=5
)

print(result.output)`,

  typescript: `// TypeScript SDK - Type-safe agent orchestration
import { AgentTeam, Agent } from '@genericcorp/sdk';

// Create agents with full TypeScript support
const researcher = new Agent({
  name: 'researcher',
  role: 'research',
  model: 'claude-3-5-sonnet'
});

const writer = new Agent({
  name: 'writer',
  role: 'content_generation',
  model: 'claude-3-5-sonnet'
});

// Coordinate agents
const team = new AgentTeam({
  agents: [researcher, writer]
});

// Execute with type-safe results
const result = await team.run({
  task: 'Research AI trends and write a blog post',
  maxIterations: 5
});

console.log(result.output);`,

  curl: `# RESTful API - No SDK required
curl -X POST https://api.genericcorp.io/v1/workflows \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agents": [
      {
        "name": "researcher",
        "role": "research",
        "model": "claude-3-5-sonnet"
      },
      {
        "name": "writer",
        "role": "content_generation",
        "model": "claude-3-5-sonnet"
      }
    ],
    "task": "Research AI trends and write a blog post",
    "max_iterations": 5
  }'`
}

function CodeSnippet() {
  const [activeTab, setActiveTab] = useState('python')

  return (
    <section className="section" style={{background: '#0a0e27', color: '#fff'}}>
      <div className="container">
        <div className="section-header">
          <h2 style={{color: '#fff'}}>Developer-Friendly APIs</h2>
          <p style={{color: '#94a3b8'}}>Get started in minutes with Python, TypeScript, or REST API</p>
        </div>

        <div style={{maxWidth: '900px', margin: '0 auto'}}>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '10px'
          }}>
            {Object.keys(codeExamples).map(lang => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                style={{
                  padding: '10px 20px',
                  background: activeTab === lang ? '#8b5cf6' : 'transparent',
                  color: activeTab === lang ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase'
                }}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Code Display */}
          <div style={{
            background: '#1a1f3a',
            borderRadius: '12px',
            padding: '24px',
            overflow: 'auto',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <pre style={{
              margin: 0,
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {codeExamples[activeTab]}
            </pre>
          </div>

          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '40px'
          }}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6'}}>{'< 5 min'}</div>
              <div style={{fontSize: '14px', color: '#94a3b8', marginTop: '8px'}}>Time to first workflow</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6'}}>3 SDKs</div>
              <div style={{fontSize: '14px', color: '#94a3b8', marginTop: '8px'}}>Python, TypeScript, REST</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6'}}>100%</div>
              <div style={{fontSize: '14px', color: '#94a3b8', marginTop: '8px'}}>OpenAPI documented</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CodeSnippet

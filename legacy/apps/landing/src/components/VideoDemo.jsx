import React from 'react'

function VideoDemo() {
  return (
    <section className="section" style={{background: 'var(--bg-light)'}}>
      <div className="container">
        <div className="section-header">
          <h2>See AgentHQ in Action</h2>
          <p>Watch how teams orchestrate AI agents visually</p>
        </div>
        
        <div className="video-demo">
          <div className="video-placeholder">
            <h3>🎬 Interactive Demo</h3>
            <p style={{fontSize: '18px', marginBottom: '30px'}}>
              Deploy 3 coordinated agents in under 60 seconds
            </p>
            <div style={{
              display: 'flex', 
              gap: '20px', 
              justifyContent: 'center',
              flexWrap: 'wrap',
              fontSize: '14px',
              opacity: 0.9
            }}>
              <div>✓ Simple Configuration</div>
              <div>✓ Instant Deployment</div>
              <div>✓ Real-time Monitoring</div>
              <div>✓ Auto-scaling</div>
            </div>
          </div>
          <p style={{color: 'var(--text-light)', marginTop: '20px'}}>
            <strong>Coming soon:</strong> Interactive live demo environment
          </p>
        </div>
      </div>
    </section>
  )
}

export default VideoDemo

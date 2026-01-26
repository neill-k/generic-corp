import React from 'react'

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-links">
          <a href="#" className="nav-link">Privacy Policy</a>
          <a href="#" className="nav-link">Terms of Service</a>
          <a href="#" className="nav-link">Documentation</a>
          <a href="#" className="nav-link">Contact</a>
        </div>
        <p>© 2024 AgentForce by Generic Corp. All rights reserved.</p>
        <p style={{marginTop: '10px', fontSize: '14px'}}>
          Enterprise-grade AI agent coordination platform
        </p>
      </div>
    </footer>
  )
}

export default Footer

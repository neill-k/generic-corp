import React, { useState } from 'react'

function Waitlist() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // For now, just simulate success - we'll add backend later
    console.log('Waitlist signup:', email)
    setSubmitted(true)
    
    // Reset after 3 seconds
    setTimeout(() => {
      setEmail('')
      setSubmitted(false)
    }, 3000)
  }

  return (
    <section id="waitlist" className="section waitlist-section">
      <div className="container">
        <div className="section-header">
          <h2 style={{color: 'white'}}>Join the Waitlist</h2>
          <p style={{color: 'rgba(255, 255, 255, 0.9)'}}>
            Get early access and exclusive pricing when we launch
          </p>
        </div>
        
        <div className="waitlist-form">
          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter your work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary">
                  Join Waitlist
                </button>
              </div>
              <p style={{fontSize: '14px', opacity: 0.8}}>
                🎁 Early access members get 50% off for the first 3 months
              </p>
            </form>
          ) : (
            <div className="form-success">
              ✓ You're on the list! Check your email for next steps.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Waitlist

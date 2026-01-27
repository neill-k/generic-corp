import React from 'react'

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for individual developers exploring AI orchestration',
    features: [
      '5 AI agents',
      '100 agent-minutes/month',
      'Community support',
      'Multi-provider access',
      'Basic analytics'
    ]
  },
  {
    name: 'Team',
    price: '$49',
    period: '/month',
    description: 'For small teams shipping AI features',
    features: [
      '25 AI agents',
      '2,500 agent-minutes/month',
      'Email support',
      'Team collaboration features',
      'Usage analytics',
      'API access'
    ]
  },
  {
    name: 'Professional',
    price: '$99',
    period: '/month',
    description: 'For growing companies scaling AI operations',
    features: [
      '100 AI agents',
      '10,000 agent-minutes/month',
      'Priority support',
      'Advanced analytics & ROI tracking',
      'Multi-provider optimization',
      'Custom integrations',
      'Performance insights'
    ],
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with complex AI needs',
    features: [
      'Unlimited agents',
      'Custom agent-minutes',
      'Dedicated support + SLA',
      'SSO & advanced security',
      'Custom integrations',
      'White-glove onboarding',
      'Architecture consultation'
    ]
  }
]

function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="container">
        <div className="section-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>Choose the plan that fits your team's needs</p>
        </div>
        
        <div className="pricing-grid">
          {pricingTiers.map((tier, index) => (
            <div key={index} className={`pricing-card ${tier.featured ? 'featured' : ''}`}>
              {tier.featured && <span className="pricing-badge">Most Popular</span>}
              <h3>{tier.name}</h3>
              <div className="pricing-price">
                {tier.price}
                {tier.period && <span>{tier.period}</span>}
              </div>
              <p className="pricing-description">{tier.description}</p>
              <ul className="pricing-features">
                {tier.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
              <a href="#waitlist" className="btn btn-primary" style={{width: '100%'}}>
                Get Started
              </a>
            </div>
          ))}
        </div>
        
        <div style={{textAlign: 'center', marginTop: '40px', color: 'var(--text-light)'}}>
          <p>🔒 All plans include enterprise-grade security and data encryption</p>
        </div>
      </div>
    </section>
  )
}

export default Pricing

import React from 'react'

const pricingTiers = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Perfect for small teams getting started',
    features: [
      'Up to 5 agents',
      '10,000 tasks/month',
      'Basic monitoring',
      'Email support',
      'Community access'
    ]
  },
  {
    name: 'Professional',
    price: '$199',
    period: '/month',
    description: 'For growing teams with serious workflows',
    features: [
      'Up to 25 agents',
      '100,000 tasks/month',
      'Advanced monitoring & analytics',
      'Priority support',
      'Custom integrations',
      'SLA guarantee'
    ],
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Unlimited scale for large organizations',
    features: [
      'Unlimited agents',
      'Unlimited tasks',
      'Dedicated infrastructure',
      '24/7 support',
      'Custom development',
      'Security & compliance',
      'White-glove onboarding'
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

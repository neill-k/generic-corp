import React, { useState } from 'react'
import Hero from './components/Hero'
import DemoShowcase from './components/DemoShowcase'
import TechnicalFeatures from './components/TechnicalFeatures'
import VideoDemo from './components/VideoDemo'
import Pricing from './components/Pricing'
import Waitlist from './components/Waitlist'
import Footer from './components/Footer'

function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">⚡ Generic Corp</div>
            <nav className="nav">
              <a href="#demo" className="nav-link">Demo</a>
              <a href="#pricing" className="nav-link">Pricing</a>
              <a href="#waitlist" className="btn btn-primary" style={{padding: '10px 24px'}}>Join Waitlist</a>
            </nav>
          </div>
        </div>
      </header>

      <Hero />
      <DemoShowcase />
      <TechnicalFeatures />
      <VideoDemo />
      <Pricing />
      <Waitlist />
      <Footer />
    </div>
  )
}

export default App

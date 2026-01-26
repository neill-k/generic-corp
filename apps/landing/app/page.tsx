"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with ConvertKit or backend
    console.log("Email submitted:", email);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">Generic Corp</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-700 hover:text-primary-600">Features</a>
              <a href="#use-cases" className="text-gray-700 hover:text-primary-600">Use Cases</a>
              <a href="#pricing" className="text-gray-700 hover:text-primary-600">Pricing</a>
              <a href="https://github.com" className="text-gray-700 hover:text-primary-600">GitHub</a>
            </div>
            <div className="flex space-x-4">
              <a href="#waitlist" className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium">
                Join Waitlist
              </a>
              <a href="#demo" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                View Demo
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Orchestrate Teams of AI Agents{" "}
              <span className="text-primary-600">Visually</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Build, deploy, and manage multi-agent AI systems with a platform that makes complexity intuitive. 
              From prototype to production in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#waitlist" className="px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold text-lg">
                Start Free Trial
              </a>
              <a href="#demo" className="px-8 py-4 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 font-semibold text-lg">
                Watch Demo
              </a>
              <a href="https://github.com" className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-lg">
                View on GitHub
              </a>
            </div>
          </div>

          {/* Demo Video/GIF Placeholder */}
          <div className="mt-16 rounded-xl shadow-2xl overflow-hidden bg-gradient-to-br from-primary-50 to-blue-100 aspect-video flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-2xl font-semibold text-gray-700">Live Demo</p>
              <p className="text-gray-600 mt-2">Interactive isometric view of AI agents in action</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Stop Wrestling with Complex AI Frameworks
              </h2>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-start">
                  <span className="text-red-500 text-2xl mr-3">✗</span>
                  <p>Managing multiple AI agents is chaotic and error-prone</p>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 text-2xl mr-3">✗</span>
                  <p>LangChain requires deep ML knowledge and complex setup</p>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 text-2xl mr-3">✗</span>
                  <p>No visibility into what your agents are actually doing</p>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 text-2xl mr-3">✗</span>
                  <p>Production deployment is a nightmare</p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Start Orchestrating AI Agents{" "}
                <span className="text-primary-600">Like a Game</span>
              </h2>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-start">
                  <span className="text-green-500 text-2xl mr-3">✓</span>
                  <p>Visual orchestration - see your agents working in real-time</p>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 text-2xl mr-3">✓</span>
                  <p>Built on Claude Agent SDK - best-in-class AI capabilities</p>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 text-2xl mr-3">✓</span>
                  <p>Production-ready infrastructure (BullMQ, Redis, PostgreSQL)</p>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 text-2xl mr-3">✓</span>
                  <p>Deploy in minutes with Docker or managed cloud</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Built for Real-World AI Applications
            </h2>
            <p className="text-xl text-gray-600">
              From customer support to data pipelines - orchestrate AI agents for any use case
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Use Case 1: Customer Support */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🎧</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Customer Support Team</h3>
              <p className="text-gray-600 mb-4">
                Deploy a team of specialized agents: ticket triager, knowledge base searcher, 
                response drafter, and quality checker. Handle 10x more tickets with consistent quality.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-primary-600 mr-2">→</span>
                  Instant ticket classification
                </li>
                <li className="flex items-center">
                  <span className="text-primary-600 mr-2">→</span>
                  Context-aware responses
                </li>
                <li className="flex items-center">
                  <span className="text-primary-600 mr-2">→</span>
                  Automated follow-ups
                </li>
              </ul>
            </div>

            {/* Use Case 2: Development Team */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Development Team</h3>
              <p className="text-gray-600 mb-4">
                Coordinate agents for code review, testing, documentation, and deployment. 
                Ship faster while maintaining code quality and comprehensive docs.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-primary-600 mr-2">→</span>
                  Automated code review
                </li>
                <li className="flex items-center">
                  <span className="text-primary-600 mr-2">→</span>
                  Test generation
                </li>
                <li className="flex items-center">
                  <span className="text-primary-600 mr-2">→</span>
                  Living documentation
                </li>
              </ul>
            </div>

            {/* Use Case 3: Data Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Data Analysis Team</h3>
              <p className="text-gray-600 mb-4">
                Orchestrate agents to collect data, clean datasets, run analyses, and generate reports. 
                Transform raw data into actionable insights automatically.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-primary-600 mr-2">→</span>
                  Multi-source data collection
                </li>
                <li className="flex items-center">
                  <span className="text-primary-600 mr-2">→</span>
                  Automated cleaning & validation
                </li>
                <li className="flex items-center">
                  <span className="text-primary-600 mr-2">→</span>
                  AI-powered insights
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Production AI
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">Isometric Visual Interface</h3>
              <p className="text-gray-600">Watch your agents work in real-time with our unique game-like interface</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">Claude Agent SDK</h3>
              <p className="text-gray-600">Built on Anthropic's powerful agent framework for best-in-class AI</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">Production Infrastructure</h3>
              <p className="text-gray-600">BullMQ queues, Redis caching, PostgreSQL storage - battle-tested stack</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">Real-time Monitoring</h3>
              <p className="text-gray-600">WebSocket updates show agent status, progress, and results instantly</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">Simple API</h3>
              <p className="text-gray-600">REST and WebSocket APIs make integration straightforward</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">Deploy Anywhere</h3>
              <p className="text-gray-600">Self-hosted with Docker, or use our managed cloud platform</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free, scale as you grow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Free Tier */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <p className="text-gray-600 mb-4">Self-Hosted</p>
              <p className="text-4xl font-bold text-gray-900 mb-6">$0</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Open-source core
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited agents
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Docker deployment
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Community support
                </li>
              </ul>
              <a href="https://github.com" className="block w-full text-center px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">
                View on GitHub
              </a>
            </div>

            {/* Starter Tier */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
              <p className="text-gray-600 mb-4">Managed Cloud</p>
              <p className="text-4xl font-bold text-gray-900 mb-6">
                $49<span className="text-lg text-gray-600">/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  5 agents
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  1K agent-minutes/mo
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Email support
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  99% uptime SLA
                </li>
              </ul>
              <a href="#waitlist" className="block w-full text-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold">
                Start Free Trial
              </a>
            </div>

            {/* Pro Tier */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-primary-600 relative">
              <div className="absolute top-0 right-0 bg-primary-600 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <p className="text-gray-600 mb-4">Managed Cloud</p>
              <p className="text-4xl font-bold text-gray-900 mb-6">
                $149<span className="text-lg text-gray-600">/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  20 agents
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  10K agent-minutes/mo
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Priority support
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  SSO integration
                </li>
              </ul>
              <a href="#waitlist" className="block w-full text-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold">
                Start Free Trial
              </a>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-4">Custom</p>
              <p className="text-4xl font-bold text-gray-900 mb-6">Custom</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited agents
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Dedicated infrastructure
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  99.9% uptime SLA
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Compliance & audit
                </li>
              </ul>
              <a href="#contact" className="block w-full text-center px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 font-semibold">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="py-20 bg-gradient-to-br from-primary-600 to-blue-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Join the Waitlist for Cloud Access
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Be the first to get access to our managed cloud platform. Start with a free trial.
          </p>
          
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-white text-primary-600 rounded-lg hover:bg-gray-100 font-semibold whitespace-nowrap"
              >
                Join Waitlist
              </button>
            </div>
            {submitted && (
              <p className="mt-4 text-white font-medium">✓ Thanks! We'll be in touch soon.</p>
            )}
          </form>

          <p className="mt-6 text-blue-200 text-sm">
            Can't wait? <a href="https://github.com" className="underline font-semibold">Deploy the open-source version now</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Generic Corp</h3>
              <p className="text-sm">
                Visual multi-agent orchestration platform built on Claude Agent SDK.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#use-cases" className="hover:text-white">Use Cases</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#demo" className="hover:text-white">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com" className="hover:text-white">Documentation</a></li>
                <li><a href="https://github.com" className="hover:text-white">GitHub</a></li>
                <li><a href="#" className="hover:text-white">API Reference</a></li>
                <li><a href="#" className="hover:text-white">Examples</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            <p>&copy; 2026 Generic Corp. Built with Claude Agent SDK.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useState } from 'react';
import { Moon, Sun, Download } from 'lucide-react';
import { Activity, Hash, Zap, CheckCircle } from 'lucide-react';
import { CostSavingsHero } from './components/CostSavingsHero';
import { MetricCard } from './components/MetricCard';
import { mockCostSummary, mockKeyMetrics } from './data/mockData';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Logo and Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Cost Analytics
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI Provider Cost Intelligence
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* Export Button */}
                <button
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  onClick={() => alert('CSV export coming soon!')}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>

                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-700" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Cost Savings Hero */}
          <CostSavingsHero data={mockCostSummary} />

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <MetricCard
              title="Total API Calls"
              value={mockKeyMetrics.totalApiCalls}
              trend={mockKeyMetrics.apiCallsTrend}
              icon={Hash}
            />
            <MetricCard
              title="Tokens Consumed"
              value={`${(mockKeyMetrics.totalTokens / 1000000).toFixed(1)}M`}
              trend={mockKeyMetrics.tokensTrend}
              icon={Hash}
            />
            <MetricCard
              title="Average Latency"
              value={mockKeyMetrics.avgLatency}
              trend={mockKeyMetrics.latencyTrend}
              icon={Zap}
              format="ms"
            />
            <MetricCard
              title="Success Rate"
              value={mockKeyMetrics.successRate}
              trend={mockKeyMetrics.successRateTrend}
              icon={CheckCircle}
              format="percentage"
            />
          </div>

          {/* Placeholder for Charts (Coming Next) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Provider Cost Comparison
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Chart component coming next...
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Monthly Cost Trends
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Chart component coming next...
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 shadow-sm mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Built by DeVonte Jackson | Generic Corp Analytics Dashboard MVP
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;

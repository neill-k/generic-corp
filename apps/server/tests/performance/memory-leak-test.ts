/**
 * Memory Leak Detection Script
 *
 * Monitors memory usage over extended sessions to detect memory leaks
 * Run with: pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts
 */

import { io, Socket } from "socket.io-client";

interface MemoryLeakTestConfig {
  serverUrl: string;
  testDuration: number; // minutes
  samplingInterval: number; // seconds
  activityRate: number; // actions per minute
}

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

interface LeakAnalysis {
  isLeaking: boolean;
  leakRate: number; // MB per hour
  confidence: number; // 0-1
  recommendations: string[];
}

class MemoryLeakTester {
  private config: MemoryLeakTestConfig;
  private snapshots: MemorySnapshot[] = [];
  private socket: Socket | null = null;
  private isRunning = false;

  constructor(config: MemoryLeakTestConfig) {
    this.config = config;
  }

  async run(): Promise<LeakAnalysis> {
    console.log(`\n🔍 Starting Memory Leak Detection`);
    console.log(`   Server: ${this.config.serverUrl}`);
    console.log(`   Duration: ${this.config.testDuration} minutes`);
    console.log(`   Sampling: Every ${this.config.samplingInterval} seconds`);
    console.log(`   Activity: ${this.config.activityRate} actions/minute\n`);

    this.isRunning = true;

    // Connect to server
    await this.connect();

    // Start memory monitoring
    const monitoringInterval = this.startMemoryMonitoring();

    // Start activity simulation
    const activityInterval = this.startActivitySimulation();

    // Run for configured duration
    const durationMs = this.config.testDuration * 60 * 1000;
    await this.sleep(durationMs);

    // Stop monitoring
    clearInterval(monitoringInterval);
    clearInterval(activityInterval);
    this.isRunning = false;

    // Disconnect
    this.disconnect();

    // Analyze results
    const analysis = this.analyzeMemoryLeaks();

    // Report results
    this.reportResults(analysis);

    return analysis;
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connecting to server...`);

      this.socket = io(this.config.serverUrl, {
        transports: ["websocket"],
        reconnection: true,
      });

      this.socket.on("connect", () => {
        console.log(`✅ Connected (ID: ${this.socket?.id})\n`);
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        reject(error);
      });

      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  private disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private startMemoryMonitoring(): NodeJS.Timeout {
    console.log(`📊 Starting memory monitoring...\n`);

    return setInterval(() => {
      const memUsage = process.memoryUsage();

      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memUsage.heapTotal / 1024 / 1024,
        external: memUsage.external / 1024 / 1024,
        arrayBuffers: memUsage.arrayBuffers / 1024 / 1024,
        rss: memUsage.rss / 1024 / 1024,
      };

      this.snapshots.push(snapshot);

      // Print progress
      const elapsed = (snapshot.timestamp - this.snapshots[0].timestamp) / 1000 / 60; // minutes
      const remaining = this.config.testDuration - elapsed;

      console.log(
        `[${elapsed.toFixed(1)}m / ${this.config.testDuration}m] ` +
        `Heap: ${snapshot.heapUsed.toFixed(2)} MB | ` +
        `RSS: ${snapshot.rss.toFixed(2)} MB | ` +
        `Remaining: ${remaining.toFixed(1)}m`
      );

    }, this.config.samplingInterval * 1000);
  }

  private startActivitySimulation(): NodeJS.Timeout {
    const intervalMs = (60 * 1000) / this.config.activityRate;

    return setInterval(() => {
      if (!this.socket?.connected) {
        return;
      }

      // Simulate various user activities
      const activities = [
        () => this.simulateTaskAssignment(),
        () => this.simulateMessageSend(),
        () => this.simulateStateSync(),
      ];

      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      randomActivity();

    }, intervalMs);
  }

  private simulateTaskAssignment(): void {
    if (!this.socket) return;

    this.socket.emit("task:assign", {
      agentId: "test-agent",
      title: `Memory test task ${Date.now()}`,
      description: "Testing for memory leaks",
      priority: "normal",
    });
  }

  private simulateMessageSend(): void {
    if (!this.socket) return;

    this.socket.emit("message:send", {
      toAgentId: "test-agent",
      subject: `Test message ${Date.now()}`,
      body: "Memory leak testing message",
    });
  }

  private simulateStateSync(): void {
    if (!this.socket) return;

    this.socket.emit("state:sync", {
      camera: { x: Math.random() * 800, y: Math.random() * 600, zoom: 1.5 },
      ui: { activePanel: "dashboard" },
    });
  }

  private analyzeMemoryLeaks(): LeakAnalysis {
    if (this.snapshots.length < 10) {
      return {
        isLeaking: false,
        leakRate: 0,
        confidence: 0,
        recommendations: ["Not enough data to analyze"],
      };
    }

    // Linear regression to detect memory growth trend
    const heapUsedData = this.snapshots.map((s) => s.heapUsed);
    const timestamps = this.snapshots.map((s) => s.timestamp);

    const { slope, rSquared } = this.linearRegression(timestamps, heapUsedData);

    // Convert slope to MB per hour
    const leakRatePerHour = slope * 3600 * 1000; // slope is MB per millisecond

    // Determine if there's a significant leak
    const isLeaking = leakRatePerHour > 5 && rSquared > 0.7; // >5 MB/hour with strong correlation

    // Calculate confidence based on R²
    const confidence = rSquared;

    // Generate recommendations
    const recommendations: string[] = [];

    if (isLeaking) {
      recommendations.push("❌ Memory leak detected - investigate heap snapshots");
      recommendations.push("Check for: unclosed WebSocket connections, event listener leaks, React component cleanup");

      if (leakRatePerHour > 50) {
        recommendations.push("⚠️  CRITICAL: Leak rate is very high (>50 MB/hour)");
      }
    } else {
      recommendations.push("✅ No significant memory leaks detected");

      if (rSquared < 0.5) {
        recommendations.push("Memory usage is unstable but not trending upward");
      }
    }

    // Check for specific patterns
    const maxHeap = Math.max(...heapUsedData);
    const minHeap = Math.min(...heapUsedData);
    const heapRange = maxHeap - minHeap;

    if (heapRange > 100) {
      recommendations.push("Large memory fluctuations detected - investigate GC behavior");
    }

    return {
      isLeaking,
      leakRate: leakRatePerHour,
      confidence,
      recommendations,
    };
  }

  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;

    // Calculate means
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += (x[i] - xMean) * (x[i] - xMean);
    }

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Calculate R²
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
      const yPred = slope * x[i] + intercept;
      ssRes += (y[i] - yPred) ** 2;
      ssTot += (y[i] - yMean) ** 2;
    }

    const rSquared = 1 - ssRes / ssTot;

    return { slope, intercept, rSquared };
  }

  private reportResults(analysis: LeakAnalysis): void {
    console.log(`\n\n${"=".repeat(60)}`);
    console.log(`📊 Memory Leak Analysis Results`);
    console.log(`${"=".repeat(60)}\n`);

    // Summary statistics
    const heapUsedData = this.snapshots.map((s) => s.heapUsed);
    const rssData = this.snapshots.map((s) => s.rss);

    console.log(`📈 Memory Statistics:`);
    console.log(`   Heap Used (initial): ${heapUsedData[0].toFixed(2)} MB`);
    console.log(`   Heap Used (final): ${heapUsedData[heapUsedData.length - 1].toFixed(2)} MB`);
    console.log(`   Heap Used (avg): ${this.avg(heapUsedData).toFixed(2)} MB`);
    console.log(`   Heap Used (max): ${Math.max(...heapUsedData).toFixed(2)} MB`);
    console.log(`   Heap Used (min): ${Math.min(...heapUsedData).toFixed(2)} MB`);
    console.log(``);
    console.log(`   RSS (initial): ${rssData[0].toFixed(2)} MB`);
    console.log(`   RSS (final): ${rssData[rssData.length - 1].toFixed(2)} MB`);
    console.log(`   RSS (avg): ${this.avg(rssData).toFixed(2)} MB`);
    console.log(`   RSS (max): ${Math.max(...rssData).toFixed(2)} MB`);

    // Leak analysis
    console.log(`\n🔍 Leak Detection:`);
    console.log(`   Leak Detected: ${analysis.isLeaking ? "❌ YES" : "✅ NO"}`);
    console.log(`   Leak Rate: ${analysis.leakRate.toFixed(2)} MB/hour`);
    console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

    // Memory growth
    const totalGrowth = heapUsedData[heapUsedData.length - 1] - heapUsedData[0];
    const growthPercentage = (totalGrowth / heapUsedData[0]) * 100;

    console.log(`\n📊 Memory Growth:`);
    console.log(`   Total Growth: ${totalGrowth > 0 ? "+" : ""}${totalGrowth.toFixed(2)} MB`);
    console.log(`   Growth Rate: ${growthPercentage > 0 ? "+" : ""}${growthPercentage.toFixed(2)}%`);

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    analysis.recommendations.forEach((rec) => {
      console.log(`   ${rec}`);
    });

    // Timeline visualization
    console.log(`\n📈 Memory Timeline (Heap Used):\n`);
    this.printSparkline(heapUsedData);

    console.log(`\n${"=".repeat(60)}\n`);
  }

  private printSparkline(data: number[]): void {
    const height = 10;
    const width = Math.min(60, data.length);

    // Sample data if needed
    const sampledData = this.sampleArray(data, width);

    // Normalize to height
    const min = Math.min(...sampledData);
    const max = Math.max(...sampledData);
    const range = max - min;

    const normalized = sampledData.map((value) => {
      return Math.round(((value - min) / range) * (height - 1));
    });

    // Print sparkline
    for (let y = height - 1; y >= 0; y--) {
      let line = "   ";

      for (let x = 0; x < normalized.length; x++) {
        if (normalized[x] >= y) {
          line += "█";
        } else {
          line += " ";
        }
      }

      // Add value labels on the sides
      if (y === height - 1) {
        line += `  ${max.toFixed(1)} MB`;
      } else if (y === 0) {
        line += `  ${min.toFixed(1)} MB`;
      }

      console.log(line);
    }

    // Time axis
    console.log(`   ${"─".repeat(width)}`);
    console.log(`   0min${" ".repeat(width - 10)}${this.config.testDuration}min`);
  }

  private sampleArray(arr: number[], targetLength: number): number[] {
    if (arr.length <= targetLength) {
      return arr;
    }

    const step = arr.length / targetLength;
    const sampled: number[] = [];

    for (let i = 0; i < targetLength; i++) {
      const index = Math.floor(i * step);
      sampled.push(arr[index]);
    }

    return sampled;
  }

  private avg(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  const config: MemoryLeakTestConfig = {
    serverUrl: args[0] || "http://localhost:3000",
    testDuration: parseInt(args[1]) || 5, // default 5 minutes for quick test
    samplingInterval: parseInt(args[2]) || 5, // sample every 5 seconds
    activityRate: parseInt(args[3]) || 10, // 10 actions per minute
  };

  const tester = new MemoryLeakTester(config);

  try {
    const analysis = await tester.run();

    // Exit with error code if leak detected
    if (analysis.isLeaking) {
      console.error("❌ Memory leak detected - test failed");
      process.exit(1);
    } else {
      console.log("✅ No memory leaks detected - test passed");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Memory leak test failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MemoryLeakTester, type MemoryLeakTestConfig, type LeakAnalysis };

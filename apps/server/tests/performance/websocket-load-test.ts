/**
 * WebSocket Load Testing Script
 *
 * Tests WebSocket performance under various load conditions
 * Run with: pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts
 */

import { io, Socket } from "socket.io-client";
import type { WS_EVENTS } from "@generic-corp/shared";

interface LoadTestConfig {
  serverUrl: string;
  concurrentConnections: number;
  eventRate: number; // events per second
  testDuration: number; // seconds
  warmupDuration: number; // seconds
}

interface TestMetrics {
  connectionTime: number[];
  eventLatency: number[];
  connectionFailures: number;
  eventsSent: number;
  eventsReceived: number;
  disconnections: number;
  memoryUsage: number[];
}

class WebSocketLoadTester {
  private config: LoadTestConfig;
  private metrics: TestMetrics;
  private connections: Socket[] = [];
  private isRunning = false;

  constructor(config: LoadTestConfig) {
    this.config = config;
    this.metrics = {
      connectionTime: [],
      eventLatency: [],
      connectionFailures: 0,
      eventsSent: 0,
      eventsReceived: 0,
      disconnections: 0,
      memoryUsage: [],
    };
  }

  async run(): Promise<TestMetrics> {
    console.log(`\n🚀 Starting WebSocket Load Test`);
    console.log(`   Server: ${this.config.serverUrl}`);
    console.log(`   Connections: ${this.config.concurrentConnections}`);
    console.log(`   Event Rate: ${this.config.eventRate}/sec`);
    console.log(`   Duration: ${this.config.testDuration}s (+ ${this.config.warmupDuration}s warmup)\n`);

    this.isRunning = true;

    // Phase 1: Establish connections
    await this.establishConnections();

    // Phase 2: Warmup period
    console.log(`🔥 Warmup phase (${this.config.warmupDuration}s)...`);
    await this.sleep(this.config.warmupDuration * 1000);

    // Reset metrics after warmup
    this.metrics.eventLatency = [];
    this.metrics.eventsSent = 0;
    this.metrics.eventsReceived = 0;

    // Phase 3: Load test
    console.log(`⚡ Load test phase (${this.config.testDuration}s)...`);
    await this.runLoadTest();

    // Phase 4: Cleanup
    await this.cleanup();

    // Phase 5: Report results
    this.reportResults();

    return this.metrics;
  }

  private async establishConnections(): Promise<void> {
    console.log(`🔌 Establishing ${this.config.concurrentConnections} connections...`);

    const connectionPromises = [];

    for (let i = 0; i < this.config.concurrentConnections; i++) {
      connectionPromises.push(this.createConnection(i));

      // Stagger connection attempts to avoid overwhelming the server
      if ((i + 1) % 10 === 0) {
        await this.sleep(100);
      }
    }

    await Promise.allSettled(connectionPromises);

    const successfulConnections = this.connections.length;
    const failedConnections = this.config.concurrentConnections - successfulConnections;

    console.log(`✅ Connected: ${successfulConnections}`);
    if (failedConnections > 0) {
      console.log(`❌ Failed: ${failedConnections}`);
    }
  }

  private async createConnection(index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const socket = io(this.config.serverUrl, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      const timeout = setTimeout(() => {
        socket.close();
        this.metrics.connectionFailures++;
        reject(new Error(`Connection ${index} timeout`));
      }, 10000);

      socket.on("connect", () => {
        clearTimeout(timeout);
        const connectionTime = Date.now() - startTime;
        this.metrics.connectionTime.push(connectionTime);
        this.connections.push(socket);

        // Set up event listeners
        this.setupEventListeners(socket);

        resolve();
      });

      socket.on("connect_error", (error) => {
        clearTimeout(timeout);
        this.metrics.connectionFailures++;
        reject(error);
      });

      socket.on("disconnect", () => {
        this.metrics.disconnections++;
      });
    });
  }

  private setupEventListeners(socket: Socket): void {
    // Listen for all events and track latency
    const events = [
      "agent:status",
      "task:progress",
      "task:completed",
      "task:failed",
      "message:new",
      "draft:pending",
      "activity:log",
      "init",
    ];

    events.forEach((eventName) => {
      socket.on(eventName, (data: any) => {
        this.metrics.eventsReceived++;

        // Calculate latency if timestamp available
        if (data._emitTimestamp) {
          const latency = Date.now() - data._emitTimestamp;
          this.metrics.eventLatency.push(latency);
        }
      });
    });
  }

  private async runLoadTest(): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + this.config.testDuration * 1000;

    // Memory sampling interval
    const memoryInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage.push(memUsage.heapUsed / 1024 / 1024); // MB
    }, 1000);

    // Event generation interval
    const eventInterval = 1000 / this.config.eventRate; // ms per event
    let eventCounter = 0;

    while (Date.now() < endTime && this.isRunning) {
      // Send events at specified rate
      if (this.connections.length > 0) {
        const socket = this.connections[eventCounter % this.connections.length];

        // Emit a test event (task assignment)
        socket.emit("task:assign", {
          agentId: `test-agent-${eventCounter}`,
          title: `Load test task ${eventCounter}`,
          description: "Performance testing task",
          priority: "normal",
          _testTimestamp: Date.now(),
        }, (response: any) => {
          // Callback to track request-response latency
          if (response && response.success) {
            // Success
          }
        });

        this.metrics.eventsSent++;
        eventCounter++;
      }

      await this.sleep(eventInterval);
    }

    clearInterval(memoryInterval);
  }

  private async cleanup(): Promise<void> {
    console.log(`\n🧹 Cleaning up connections...`);

    this.isRunning = false;

    const closePromises = this.connections.map((socket) => {
      return new Promise<void>((resolve) => {
        socket.close();
        resolve();
      });
    });

    await Promise.all(closePromises);

    console.log(`✅ All connections closed`);
  }

  private reportResults(): void {
    console.log(`\n📊 Test Results\n${"=".repeat(50)}`);

    // Connection metrics
    console.log(`\n🔌 Connection Metrics:`);
    console.log(`   Total Attempts: ${this.config.concurrentConnections}`);
    console.log(`   Successful: ${this.connections.length}`);
    console.log(`   Failed: ${this.metrics.connectionFailures}`);
    console.log(`   Success Rate: ${((this.connections.length / this.config.concurrentConnections) * 100).toFixed(2)}%`);

    if (this.metrics.connectionTime.length > 0) {
      console.log(`   Connection Time (avg): ${this.avg(this.metrics.connectionTime).toFixed(2)}ms`);
      console.log(`   Connection Time (p50): ${this.percentile(this.metrics.connectionTime, 50).toFixed(2)}ms`);
      console.log(`   Connection Time (p95): ${this.percentile(this.metrics.connectionTime, 95).toFixed(2)}ms`);
      console.log(`   Connection Time (p99): ${this.percentile(this.metrics.connectionTime, 99).toFixed(2)}ms`);
    }

    // Event metrics
    console.log(`\n⚡ Event Metrics:`);
    console.log(`   Events Sent: ${this.metrics.eventsSent}`);
    console.log(`   Events Received: ${this.metrics.eventsReceived}`);
    console.log(`   Event Loss Rate: ${((1 - this.metrics.eventsReceived / this.metrics.eventsSent) * 100).toFixed(2)}%`);

    if (this.metrics.eventLatency.length > 0) {
      console.log(`   Event Latency (avg): ${this.avg(this.metrics.eventLatency).toFixed(2)}ms`);
      console.log(`   Event Latency (p50): ${this.percentile(this.metrics.eventLatency, 50).toFixed(2)}ms`);
      console.log(`   Event Latency (p95): ${this.percentile(this.metrics.eventLatency, 95).toFixed(2)}ms`);
      console.log(`   Event Latency (p99): ${this.percentile(this.metrics.eventLatency, 99).toFixed(2)}ms`);
      console.log(`   Event Latency (max): ${Math.max(...this.metrics.eventLatency).toFixed(2)}ms`);
    }

    // Stability metrics
    console.log(`\n🔄 Stability Metrics:`);
    console.log(`   Disconnections: ${this.metrics.disconnections}`);
    console.log(`   Disconnection Rate: ${((this.metrics.disconnections / this.connections.length) * 100).toFixed(2)}%`);

    // Memory metrics
    if (this.metrics.memoryUsage.length > 0) {
      console.log(`\n💾 Memory Metrics:`);
      console.log(`   Memory (avg): ${this.avg(this.metrics.memoryUsage).toFixed(2)} MB`);
      console.log(`   Memory (min): ${Math.min(...this.metrics.memoryUsage).toFixed(2)} MB`);
      console.log(`   Memory (max): ${Math.max(...this.metrics.memoryUsage).toFixed(2)} MB`);
    }

    // Pass/Fail criteria
    console.log(`\n✅ Pass/Fail Criteria:`);
    this.checkCriteria("Connection Success Rate",
      (this.connections.length / this.config.concurrentConnections) * 100,
      99.5,
      "%");

    if (this.metrics.connectionTime.length > 0) {
      this.checkCriteria("Connection Time (p95)",
        this.percentile(this.metrics.connectionTime, 95),
        500,
        "ms");
    }

    if (this.metrics.eventLatency.length > 0) {
      this.checkCriteria("Event Latency (p95)",
        this.percentile(this.metrics.eventLatency, 95),
        200,
        "ms");
    }

    console.log(`\n${"=".repeat(50)}\n`);
  }

  private checkCriteria(name: string, actual: number, threshold: number, unit: string): void {
    const passed = actual <= threshold;
    const icon = passed ? "✅" : "❌";
    console.log(`   ${icon} ${name}: ${actual.toFixed(2)}${unit} (threshold: ${threshold}${unit})`);
  }

  private avg(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  const config: LoadTestConfig = {
    serverUrl: args[0] || "http://localhost:3000",
    concurrentConnections: parseInt(args[1]) || 50,
    eventRate: parseInt(args[2]) || 100,
    testDuration: parseInt(args[3]) || 30,
    warmupDuration: parseInt(args[4]) || 5,
  };

  const tester = new WebSocketLoadTester(config);

  try {
    await tester.run();
    process.exit(0);
  } catch (error) {
    console.error("❌ Load test failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { WebSocketLoadTester, type LoadTestConfig, type TestMetrics };

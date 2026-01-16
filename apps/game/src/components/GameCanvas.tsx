import { useEffect, useRef, useCallback } from "react";
import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";
import type { Agent, Task } from "@generic-corp/shared";

// Agent desk positions in isometric coordinates
const AGENT_DESK_POSITIONS: Record<string, { x: number; y: number; deskX: number; deskY: number }> = {
  "Marcus Bell": { x: 400, y: 120, deskX: 400, deskY: 130 },
  "Sable Chen": { x: 280, y: 180, deskX: 280, deskY: 190 },
  "DeVonte Jackson": { x: 520, y: 180, deskX: 520, deskY: 190 },
  "Yuki Tanaka": { x: 340, y: 260, deskX: 340, deskY: 270 },
  "Graham Sutton": { x: 460, y: 260, deskX: 460, deskY: 270 },
  // Extended agent positions
  "Miranda Okonkwo": { x: 280, y: 340, deskX: 280, deskY: 350 },
  "Helen Marsh": { x: 520, y: 340, deskX: 520, deskY: 350 },
  "Walter Huang": { x: 340, y: 420, deskX: 340, deskY: 430 },
  "Frankie Deluca": { x: 460, y: 420, deskX: 460, deskY: 430 },
  "Kenji Ross": { x: 400, y: 500, deskX: 400, deskY: 510 },
};

// Agent colors for visual distinction
const AGENT_COLORS: Record<string, number> = {
  "Marcus Bell": 0x4a90e2,      // CEO blue
  "Sable Chen": 0xe94560,       // Principal red
  "DeVonte Jackson": 0x00d4aa,  // Dev teal
  "Yuki Tanaka": 0xff6b6b,      // SRE coral
  "Graham Sutton": 0x95a5a6,    // Data gray
  "Miranda Okonkwo": 0x9b59b6,  // Purple
  "Helen Marsh": 0xf39c12,      // Orange
  "Walter Huang": 0x27ae60,     // Green
  "Frankie Deluca": 0xe74c3c,   // Red
  "Kenji Ross": 0x3498db,       // Blue
};

// Status colors
const STATUS_COLORS: Record<string, number> = {
  idle: 0x00ff00,
  working: 0xffff00,
  blocked: 0xff0000,
  offline: 0x666666,
};

// Object pool for status indicators
class IndicatorPool {
  private pool: Phaser.GameObjects.Container[] = [];
  private scene: Phaser.Scene;
  private maxSize: number;

  constructor(scene: Phaser.Scene, maxSize = 20) {
    this.scene = scene;
    this.maxSize = maxSize;
    this.preCreate();
  }

  private preCreate() {
    for (let i = 0; i < this.maxSize; i++) {
      const container = this.createIndicator();
      container.setVisible(false);
      this.pool.push(container);
    }
  }

  private createIndicator(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // Exclamation mark for blocked state
    const exclamation = this.scene.add.text(0, 0, "!", {
      fontSize: "16px",
      color: "#ff0000",
      fontFamily: "Arial Black",
    });
    exclamation.setOrigin(0.5);
    exclamation.setName("exclamation");

    // Working dots animation
    const dots = this.scene.add.text(0, 0, "...", {
      fontSize: "12px",
      color: "#ffff00",
      fontFamily: "monospace",
    });
    dots.setOrigin(0.5);
    dots.setName("dots");

    container.add([exclamation, dots]);
    return container;
  }

  get(type: "blocked" | "working"): Phaser.GameObjects.Container | null {
    const available = this.pool.find(c => !c.visible);
    if (!available) return null;

    available.setVisible(true);
    const exclamation = available.getByName("exclamation") as Phaser.GameObjects.Text;
    const dots = available.getByName("dots") as Phaser.GameObjects.Text;

    if (type === "blocked") {
      exclamation.setVisible(true);
      dots.setVisible(false);
    } else {
      exclamation.setVisible(false);
      dots.setVisible(true);
    }

    return available;
  }

  release(container: Phaser.GameObjects.Container) {
    container.setVisible(false);
  }
}

// Enhanced Office Scene with animations and object pooling
class OfficeScene extends Phaser.Scene {
  private agents: Map<string, Phaser.GameObjects.Container> = new Map();
  private tooltipContainer: Phaser.GameObjects.Container | null = null;
  private pendingUpdates: Map<string, Partial<Agent>> = new Map();
  private updateTimer: number = 0;
  private readonly UPDATE_INTERVAL = 100; // Batch updates every 100ms

  // Animation frame counters
  private animationFrames: Map<string, number> = new Map();

  // Object pool for indicators (initialized in create())
  private indicatorPool: IndicatorPool | null = null;

  constructor() {
    super({ key: "OfficeScene" });
  }

  preload() {
    // No external assets needed - we generate everything procedurally
  }

  create() {
    // Initialize object pool for status indicators
    this.indicatorPool = new IndicatorPool(this, 20);

    // Draw office environment
    this.drawBackground();
    this.drawFloor();
    this.drawWalls();
    this.drawFurniture();
    this.drawDesks();
    this.drawDecorations();

    // Setup camera controls
    this.setupCamera();

    // Create tooltip container
    this.createTooltip();

    // Listen for game events
    this.game.events.on("updateAgents", this.queueAgentUpdates, this);
    this.game.events.on("updateTasks", this.updateAgentTasks, this);

    // Setup animation loop
    this.time.addEvent({
      delay: 200,
      callback: this.animateAgents,
      callbackScope: this,
      loop: true,
    });
  }

  private drawBackground() {
    // Dark gradient background
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a1a2e, 0x1a1a2e, 1);
    graphics.fillRect(-500, -500, 2000, 2000);
  }

  private drawFloor() {
    const floor = this.add.graphics();
    const tileWidth = 64;
    const tileHeight = 32;
    const gridSize = 16;
    const offsetX = 400;
    const offsetY = 50;

    // Fill floor tiles
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const isoX = (x - y) * (tileWidth / 2) + offsetX;
        const isoY = (x + y) * (tileHeight / 2) + offsetY;

        // Alternate tile colors for checkerboard effect
        const isEven = (x + y) % 2 === 0;
        floor.fillStyle(isEven ? 0x1a2744 : 0x162038, 1);

        floor.fillPoints([
          { x: isoX, y: isoY - tileHeight / 2 },
          { x: isoX + tileWidth / 2, y: isoY },
          { x: isoX, y: isoY + tileHeight / 2 },
          { x: isoX - tileWidth / 2, y: isoY },
        ], true);

        // Grid lines
        floor.lineStyle(1, 0x0f3460, 0.3);
        floor.strokePoints([
          { x: isoX, y: isoY - tileHeight / 2 },
          { x: isoX + tileWidth / 2, y: isoY },
          { x: isoX, y: isoY + tileHeight / 2 },
          { x: isoX - tileWidth / 2, y: isoY },
          { x: isoX, y: isoY - tileHeight / 2 },
        ]);
      }
    }
  }

  private drawWalls() {
    const walls = this.add.graphics();

    // Back wall (top-left)
    walls.fillStyle(0x2a3f5f, 1);
    walls.fillPoints([
      { x: 80, y: 50 },
      { x: 400, y: -110 },
      { x: 400, y: -60 },
      { x: 80, y: 100 },
    ], true);

    // Back wall (top-right)
    walls.fillStyle(0x243752, 1);
    walls.fillPoints([
      { x: 400, y: -110 },
      { x: 720, y: 50 },
      { x: 720, y: 100 },
      { x: 400, y: -60 },
    ], true);

    // Wall trim
    walls.lineStyle(3, 0x0f3460, 1);
    walls.lineBetween(80, 50, 400, -110);
    walls.lineBetween(400, -110, 720, 50);

    // Window on back wall
    this.drawWindow(400, -85, 80, 40);
  }

  private drawWindow(x: number, y: number, width: number, height: number) {
    const window = this.add.graphics();

    // Window frame
    window.fillStyle(0x1a2a3a, 1);
    window.fillRect(x - width/2 - 3, y - height/2 - 3, width + 6, height + 6);

    // Window glass with gradient
    window.fillStyle(0x4a6fa5, 0.6);
    window.fillRect(x - width/2, y - height/2, width, height);

    // Window panes
    window.lineStyle(2, 0x1a2a3a, 1);
    window.lineBetween(x, y - height/2, x, y + height/2);
    window.lineBetween(x - width/2, y, x + width/2, y);

    // Light glow from window
    const glow = this.add.graphics();
    glow.fillStyle(0x4a6fa5, 0.1);
    glow.fillTriangle(x - 60, y + height, x + 60, y + height, x, y + 200);
  }

  private drawFurniture() {
    // Conference table in center-back
    this.drawConferenceTable(400, 80);

    // Plants in corners
    this.drawPlant(150, 180);
    this.drawPlant(650, 180);

    // Water cooler
    this.drawWaterCooler(180, 350);

    // Whiteboard
    this.drawWhiteboard(620, 120);

    // Filing cabinets
    this.drawFilingCabinet(150, 280);
    this.drawFilingCabinet(650, 280);
  }

  private drawConferenceTable(x: number, y: number) {
    const table = this.add.graphics();

    // Table top (isometric rectangle)
    table.fillStyle(0x4a3728, 1);
    table.fillPoints([
      { x: x - 60, y: y - 15 },
      { x: x, y: y - 30 },
      { x: x + 60, y: y - 15 },
      { x: x, y: y },
    ], true);

    // Table edge
    table.fillStyle(0x3a2718, 1);
    table.fillPoints([
      { x: x - 60, y: y - 15 },
      { x: x - 60, y: y - 10 },
      { x: x, y: y + 5 },
      { x: x + 60, y: y - 10 },
      { x: x + 60, y: y - 15 },
      { x: x, y: y },
    ], true);
  }

  private drawPlant(x: number, y: number) {
    const plant = this.add.graphics();

    // Pot
    plant.fillStyle(0x8b4513, 1);
    plant.fillPoints([
      { x: x - 12, y: y },
      { x: x + 12, y: y },
      { x: x + 8, y: y + 20 },
      { x: x - 8, y: y + 20 },
    ], true);

    // Plant leaves
    plant.fillStyle(0x228b22, 1);
    plant.fillCircle(x, y - 10, 18);
    plant.fillCircle(x - 10, y - 5, 12);
    plant.fillCircle(x + 10, y - 5, 12);
    plant.fillCircle(x, y - 20, 14);
  }

  private drawWaterCooler(x: number, y: number) {
    const cooler = this.add.graphics();

    // Base
    cooler.fillStyle(0xe8e8e8, 1);
    cooler.fillRect(x - 12, y + 10, 24, 30);

    // Water bottle
    cooler.fillStyle(0x87ceeb, 0.7);
    cooler.fillRect(x - 8, y - 25, 16, 35);

    // Cap
    cooler.fillStyle(0x4169e1, 1);
    cooler.fillRect(x - 6, y - 30, 12, 8);
  }

  private drawWhiteboard(x: number, y: number) {
    const board = this.add.graphics();

    // Frame
    board.fillStyle(0x696969, 1);
    board.fillRect(x - 42, y - 32, 84, 64);

    // Board surface
    board.fillStyle(0xffffff, 1);
    board.fillRect(x - 38, y - 28, 76, 56);

    // Some "writing" on the board
    board.lineStyle(2, 0x333333, 0.5);
    board.lineBetween(x - 30, y - 15, x + 20, y - 15);
    board.lineBetween(x - 30, y - 5, x + 10, y - 5);
    board.lineBetween(x - 30, y + 5, x + 25, y + 5);
  }

  private drawFilingCabinet(x: number, y: number) {
    const cabinet = this.add.graphics();

    // Cabinet body (isometric)
    cabinet.fillStyle(0x4a5568, 1);
    cabinet.fillPoints([
      { x: x - 15, y: y - 10 },
      { x: x + 5, y: y - 20 },
      { x: x + 5, y: y + 20 },
      { x: x - 15, y: y + 30 },
    ], true);

    cabinet.fillStyle(0x5a6578, 1);
    cabinet.fillPoints([
      { x: x + 5, y: y - 20 },
      { x: x + 20, y: y - 10 },
      { x: x + 20, y: y + 30 },
      { x: x + 5, y: y + 20 },
    ], true);

    // Drawer handles
    cabinet.fillStyle(0x2d3748, 1);
    cabinet.fillRect(x - 10, y - 5, 8, 3);
    cabinet.fillRect(x - 10, y + 10, 8, 3);
    cabinet.fillRect(x - 10, y + 25, 8, 3);
  }

  private drawDesks() {
    Object.entries(AGENT_DESK_POSITIONS).forEach(([name, pos]) => {
      this.drawDesk(pos.deskX, pos.deskY, name);
    });
  }

  private drawDesk(x: number, y: number, _agentName: string) {
    const desk = this.add.graphics();

    // Desk top (isometric rectangle)
    desk.fillStyle(0x3a506b, 1);
    desk.fillPoints([
      { x: x - 40, y: y - 12 },
      { x: x, y: y - 24 },
      { x: x + 40, y: y - 12 },
      { x: x, y: y },
    ], true);

    // Desk edge/thickness
    desk.fillStyle(0x2a3f5f, 1);
    desk.fillPoints([
      { x: x - 40, y: y - 12 },
      { x: x - 40, y: y - 8 },
      { x: x, y: y + 4 },
      { x: x + 40, y: y - 8 },
      { x: x + 40, y: y - 12 },
      { x: x, y: y },
    ], true);

    // Desk legs
    desk.fillStyle(0x1a2a3a, 1);
    desk.fillRect(x - 35, y + 4, 6, 18);
    desk.fillRect(x + 29, y + 4, 6, 18);

    // Monitor on desk
    this.drawMonitor(x, y - 20);

    // Keyboard
    desk.fillStyle(0x2d3748, 1);
    desk.fillRect(x - 15, y - 8, 30, 8);

    // Coffee mug (random position)
    if (Math.random() > 0.5) {
      desk.fillStyle(0xffffff, 1);
      desk.fillCircle(x + 25, y - 15, 4);
      desk.fillStyle(0x8b4513, 1);
      desk.fillCircle(x + 25, y - 15, 2.5);
    }
  }

  private drawMonitor(x: number, y: number) {
    const monitor = this.add.graphics();

    // Screen bezel
    monitor.fillStyle(0x1a1a2e, 1);
    monitor.fillRect(x - 18, y - 20, 36, 24);

    // Screen
    monitor.fillStyle(0x16213e, 1);
    monitor.fillRect(x - 15, y - 17, 30, 18);

    // Screen glow effect (subtle)
    monitor.fillStyle(0x4a90e2, 0.1);
    monitor.fillRect(x - 15, y - 17, 30, 18);

    // Monitor stand
    monitor.fillStyle(0x2d3748, 1);
    monitor.fillRect(x - 4, y + 4, 8, 6);
    monitor.fillRect(x - 10, y + 10, 20, 3);
  }

  private drawDecorations() {
    // Ceiling lights
    for (let i = 0; i < 3; i++) {
      this.drawCeilingLight(300 + i * 100, 100 + i * 50);
    }

    // Company logo/sign on wall
    const logo = this.add.text(400, -40, "GENERIC CORP", {
      fontSize: "14px",
      color: "#e94560",
      fontFamily: "Arial Black",
    });
    logo.setOrigin(0.5);
  }

  private drawCeilingLight(x: number, y: number) {
    const light = this.add.graphics();

    // Light fixture
    light.fillStyle(0x888888, 1);
    light.fillRect(x - 20, y - 60, 40, 8);

    // Light glow
    light.fillStyle(0xffffcc, 0.15);
    light.fillTriangle(x - 30, y - 52, x + 30, y - 52, x, y + 20);
  }

  private setupCamera() {
    // Set camera bounds
    this.cameras.main.setBounds(-200, -200, 1200, 1000);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.centerOn(400, 250);

    // Enable camera drag
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.button === 0) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    // Enable zoom with mouse wheel
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _deltaX: number, deltaY: number) => {
      const newZoom = this.cameras.main.zoom - deltaY * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 2.5));
    });
  }

  private createTooltip() {
    this.tooltipContainer = this.add.container(0, 0);
    this.tooltipContainer.setDepth(1000);
    this.tooltipContainer.setVisible(false);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-80, -40, 160, 80, 8);
    bg.lineStyle(2, 0xe94560, 1);
    bg.strokeRoundedRect(-80, -40, 160, 80, 8);
    bg.setName("background");

    // Agent name
    const nameText = this.add.text(0, -25, "", {
      fontSize: "12px",
      color: "#ffffff",
      fontFamily: "JetBrains Mono",
      fontStyle: "bold",
    });
    nameText.setOrigin(0.5);
    nameText.setName("name");

    // Role
    const roleText = this.add.text(0, -8, "", {
      fontSize: "10px",
      color: "#888888",
      fontFamily: "JetBrains Mono",
    });
    roleText.setOrigin(0.5);
    roleText.setName("role");

    // Current task
    const taskText = this.add.text(0, 10, "", {
      fontSize: "9px",
      color: "#e94560",
      fontFamily: "JetBrains Mono",
      wordWrap: { width: 140 },
    });
    taskText.setOrigin(0.5, 0);
    taskText.setName("task");

    this.tooltipContainer.add([bg, nameText, roleText, taskText]);
  }

  private showTooltip(agent: Agent, x: number, y: number, currentTask?: string) {
    if (!this.tooltipContainer) return;

    const nameText = this.tooltipContainer.getByName("name") as Phaser.GameObjects.Text;
    const roleText = this.tooltipContainer.getByName("role") as Phaser.GameObjects.Text;
    const taskText = this.tooltipContainer.getByName("task") as Phaser.GameObjects.Text;

    nameText.setText(agent.name);
    roleText.setText(agent.role);
    taskText.setText(currentTask ? `Task: ${currentTask}` : "No active task");

    this.tooltipContainer.setPosition(x, y - 60);
    this.tooltipContainer.setVisible(true);
  }

  private hideTooltip() {
    if (this.tooltipContainer) {
      this.tooltipContainer.setVisible(false);
    }
  }

  private queueAgentUpdates(agents: Agent[]) {
    agents.forEach(agent => {
      this.pendingUpdates.set(agent.id, agent);
    });
  }

  private updateAgentTasks(tasks: Task[]) {
    // Store tasks for tooltip display
    (this as any).currentTasks = tasks;
  }

  private processUpdates() {
    if (this.pendingUpdates.size === 0) return;

    this.pendingUpdates.forEach((agent) => {
      this.updateOrCreateAgent(agent as Agent);
    });

    this.pendingUpdates.clear();
  }

  private updateOrCreateAgent(agent: Agent) {
    const pos = AGENT_DESK_POSITIONS[agent.name];
    if (!pos) return;

    let container = this.agents.get(agent.id);

    if (!container) {
      container = this.createAgentSprite(agent, pos);
      this.agents.set(agent.id, container);
    }

    this.updateAgentVisuals(container, agent);
  }

  private createAgentSprite(agent: Agent, pos: { x: number; y: number }): Phaser.GameObjects.Container {
    const container = this.add.container(pos.x, pos.y - 30);
    container.setDepth(pos.y);

    // Chair
    const chair = this.add.graphics();
    chair.fillStyle(0x2d3748, 1);
    chair.fillCircle(0, 25, 12);
    chair.fillRect(-8, 10, 16, 15);
    chair.setName("chair");
    container.add(chair);

    // Agent body (simplified humanoid)
    const color = AGENT_COLORS[agent.name] || 0x888888;

    // Body/torso
    const body = this.add.graphics();
    body.fillStyle(color, 1);
    body.fillRoundedRect(-10, -5, 20, 25, 4);
    body.setName("body");
    container.add(body);

    // Head
    const head = this.add.circle(0, -18, 10, color);
    head.setName("head");
    container.add(head);

    // Face details
    const face = this.add.graphics();
    face.fillStyle(0x000000, 1);
    face.fillCircle(-4, -20, 2); // Left eye
    face.fillCircle(4, -20, 2);  // Right eye
    face.setName("face");
    container.add(face);

    // Status ring
    const statusRing = this.add.circle(0, -18, 14);
    statusRing.setStrokeStyle(3, STATUS_COLORS[agent.status] || 0x666666);
    statusRing.setName("statusRing");
    container.add(statusRing);

    // Name label
    const firstName = agent.name.split(" ")[0];
    const label = this.add.text(0, 35, firstName, {
      fontSize: "11px",
      color: "#ffffff",
      fontFamily: "JetBrains Mono",
      backgroundColor: "#1a1a2ecc",
      padding: { x: 6, y: 3 },
    });
    label.setOrigin(0.5);
    label.setName("label");
    container.add(label);

    // Status indicator container (for animations)
    const statusIndicator = this.add.container(0, -35);
    statusIndicator.setName("statusIndicator");
    statusIndicator.setVisible(false);
    container.add(statusIndicator);

    // Progress bar (hidden by default)
    const progressBg = this.add.graphics();
    progressBg.fillStyle(0x333333, 1);
    progressBg.fillRoundedRect(-20, 45, 40, 6, 2);
    progressBg.setName("progressBg");
    progressBg.setVisible(false);
    container.add(progressBg);

    const progressBar = this.add.graphics();
    progressBar.setName("progressBar");
    progressBar.setVisible(false);
    container.add(progressBar);

    // Make interactive
    const hitArea = this.add.circle(0, -10, 25);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.setAlpha(0.001); // Nearly invisible but interactive

    hitArea.on("pointerdown", () => {
      this.game.events.emit("agentClicked", agent.id);
    });

    hitArea.on("pointerover", () => {
      // Scale up on hover
      this.tweens.add({
        targets: container,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 150,
        ease: "Power2",
      });

      // Show tooltip
      const tasks = (this as any).currentTasks as Task[] || [];
      const currentTask = tasks.find(t => t.agentId === agent.id && t.status === "in_progress");
      this.showTooltip(agent, pos.x, pos.y, currentTask?.title);
    });

    hitArea.on("pointerout", () => {
      // Scale back
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: "Power2",
      });

      this.hideTooltip();
    });

    container.add(hitArea);

    // Store agent data on container
    container.setData("agent", agent);

    return container;
  }

  private updateAgentVisuals(container: Phaser.GameObjects.Container, agent: Agent) {
    // Update stored agent data
    container.setData("agent", agent);

    // Update status ring color
    const statusRing = container.getByName("statusRing") as Phaser.GameObjects.Arc;
    if (statusRing) {
      const color = STATUS_COLORS[agent.status] || 0x666666;
      statusRing.setStrokeStyle(3, color);

      // Pulse animation for working/blocked states
      this.tweens.killTweensOf(statusRing);
      if (agent.status === "working" || agent.status === "blocked") {
        this.tweens.add({
          targets: statusRing,
          alpha: { from: 1, to: 0.4 },
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else {
        statusRing.setAlpha(1);
      }
    }

    // Update status indicator using object pool
    const statusIndicator = container.getByName("statusIndicator") as Phaser.GameObjects.Container;
    if (statusIndicator) {
      statusIndicator.removeAll(true);

      if (agent.status === "blocked" && this.indicatorPool) {
        // Get indicator from pool
        const indicator = this.indicatorPool.get("blocked");
        if (indicator) {
          indicator.setPosition(0, 0);
          statusIndicator.add(indicator);
        } else {
          // Fallback if pool exhausted
          const exclamation = this.add.text(0, 0, "!", {
            fontSize: "18px",
            color: "#ff4444",
            fontFamily: "Arial Black",
          });
          exclamation.setOrigin(0.5);
          statusIndicator.add(exclamation);
        }
        statusIndicator.setVisible(true);

        // Bounce animation
        this.tweens.add({
          targets: statusIndicator,
          y: { from: -35, to: -40 },
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: "Bounce.easeOut",
        });
      } else if (agent.status === "working" && this.indicatorPool) {
        // Get indicator from pool
        const indicator = this.indicatorPool.get("working");
        if (indicator) {
          indicator.setPosition(0, 0);
          statusIndicator.add(indicator);
        } else {
          // Fallback if pool exhausted
          const dots = this.add.text(0, 0, "•••", {
            fontSize: "14px",
            color: "#ffff00",
            fontFamily: "monospace",
          });
          dots.setOrigin(0.5);
          statusIndicator.add(dots);
        }
        statusIndicator.setVisible(true);

        // Animate dots
        let dotCount = 0;
        this.time.addEvent({
          delay: 300,
          callback: () => {
            const dotsText = statusIndicator.list.find(
              (obj) => obj instanceof Phaser.GameObjects.Text
            ) as Phaser.GameObjects.Text | undefined;
            if (dotsText) {
              dotCount = (dotCount + 1) % 4;
              dotsText.setText("•".repeat(dotCount || 1) + " ".repeat(3 - (dotCount || 1)));
            }
          },
          loop: true,
        });
      } else {
        statusIndicator.setVisible(false);
        this.tweens.killTweensOf(statusIndicator);
      }
    }

    // Gray out offline agents
    if (agent.status === "offline") {
      container.setAlpha(0.5);
    } else {
      container.setAlpha(1);
    }
  }

  private animateAgents() {
    this.agents.forEach((container, id) => {
      const agent = container.getData("agent") as Agent;
      if (!agent) return;

      const frame = (this.animationFrames.get(id) || 0) + 1;
      this.animationFrames.set(id, frame);

      if (agent.status === "working") {
        // Subtle typing animation - bob the head slightly
        const head = container.getByName("head") as Phaser.GameObjects.Arc;
        if (head) {
          const offset = Math.sin(frame * 0.3) * 1.5;
          head.setY(-18 + offset);
        }
      } else if (agent.status === "idle") {
        // Subtle idle breathing animation
        if (frame % 20 === 0) {
          this.tweens.add({
            targets: container,
            scaleY: { from: 1, to: 1.02 },
            duration: 1000,
            yoyo: true,
            ease: "Sine.easeInOut",
          });
        }
      }
    });
  }

  update(_time: number, delta: number) {
    // Process batched updates
    this.updateTimer += delta;
    if (this.updateTimer >= this.UPDATE_INTERVAL) {
      this.processUpdates();
      this.updateTimer = 0;
    }
  }
}

// React component
export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const { agents, tasks, setSelectedAgent } = useGameStore();

  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgent(agentId);
  }, [setSelectedAgent]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: "#1a1a2e",
      scene: OfficeScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: false,
        antialias: true,
      },
    };

    gameRef.current = new Phaser.Game(config);

    // Listen for agent clicks
    gameRef.current.events.on("agentClicked", handleAgentClick);

    return () => {
      gameRef.current?.events.off("agentClicked", handleAgentClick);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [handleAgentClick]);

  // Update agents in game
  useEffect(() => {
    if (gameRef.current && agents.length > 0) {
      gameRef.current.events.emit("updateAgents", agents);
    }
  }, [agents]);

  // Update tasks in game
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.events.emit("updateTasks", tasks);
    }
  }, [tasks]);

  return (
    <div
      ref={containerRef}
      id="game-container"
      className="w-full h-full"
    />
  );
}

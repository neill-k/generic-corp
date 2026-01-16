import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";

// Isometric office scene
class OfficeScene extends Phaser.Scene {
  private agents: Map<string, Phaser.GameObjects.Container> = new Map();
  private floor!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "OfficeScene" });
  }

  preload() {
    // We'll generate placeholder sprites programmatically
  }

  create() {
    // Draw isometric floor grid
    this.drawFloor();

    // Draw placeholder desks
    this.drawDesks();

    // Setup camera controls
    this.setupCamera();

    // Listen for agent updates
    this.game.events.on("updateAgents", this.updateAgents, this);
  }

  private drawFloor() {
    this.floor = this.add.graphics();
    this.floor.lineStyle(1, 0x0f3460, 0.5);

    const tileWidth = 64;
    const tileHeight = 32;
    const gridSize = 10;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const isoX = (x - y) * (tileWidth / 2) + 400;
        const isoY = (x + y) * (tileHeight / 2) + 100;

        // Draw diamond tile
        this.floor.strokePoints([
          { x: isoX, y: isoY - tileHeight / 2 },
          { x: isoX + tileWidth / 2, y: isoY },
          { x: isoX, y: isoY + tileHeight / 2 },
          { x: isoX - tileWidth / 2, y: isoY },
          { x: isoX, y: isoY - tileHeight / 2 },
        ]);
      }
    }
  }

  private drawDesks() {
    // 5 desk positions for our 5 agents
    const deskPositions = [
      { x: 300, y: 150, label: "Marcus" },
      { x: 200, y: 190, label: "Sable" },
      { x: 400, y: 190, label: "DeVonte" },
      { x: 250, y: 270, label: "Yuki" },
      { x: 350, y: 270, label: "Gray" },
    ];

    deskPositions.forEach((pos) => {
      // Draw desk with isometric perspective
      const desk = this.add.graphics();
      
      // Desk top (isometric rectangle)
      desk.fillStyle(0x2a3f5f, 1);
      desk.fillPoints([
        { x: pos.x - 35, y: pos.y - 10 },
        { x: pos.x + 5, y: pos.y - 20 },
        { x: pos.x + 35, y: pos.y - 10 },
        { x: pos.x - 5, y: pos.y },
      ], true);

      // Desk edge
      desk.lineStyle(2, 0x1a2a3a, 1);
      desk.strokePoints([
        { x: pos.x - 35, y: pos.y - 10 },
        { x: pos.x + 5, y: pos.y - 20 },
        { x: pos.x + 35, y: pos.y - 10 },
        { x: pos.x - 5, y: pos.y },
        { x: pos.x - 35, y: pos.y - 10 },
      ], true);

      // Desk legs (simplified)
      desk.fillStyle(0x1a2a3a, 1);
      desk.fillRect(pos.x - 30, pos.y, 8, 15);
      desk.fillRect(pos.x + 22, pos.y, 8, 15);
    });
  }

  private setupCamera() {
    // Enable camera drag
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    // Enable zoom
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const zoom = this.cameras.main.zoom - deltaY * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, 0.5, 2));
    });
  }

  private updateAgents(agents: any[]) {
    const agentPositions: Record<string, { x: number; y: number }> = {
      "Marcus Bell": { x: 300, y: 140 },
      "Sable Chen": { x: 200, y: 190 },
      "DeVonte Jackson": { x: 400, y: 190 },
      "Yuki Tanaka": { x: 250, y: 270 },
      "Graham \"Gray\" Sutton": { x: 350, y: 270 },
    };

    // Agent colors for visual distinction
    const agentColors: Record<string, number> = {
      "Marcus Bell": 0x4a90e2,
      "Sable Chen": 0xe94560,
      "DeVonte Jackson": 0x00d4aa,
      "Yuki Tanaka": 0xff6b6b,
      "Graham \"Gray\" Sutton": 0x95a5a6,
    };

    agents.forEach((agent) => {
      const pos = agentPositions[agent.name];
      if (!pos) return;

      let container = this.agents.get(agent.id);

      if (!container) {
        // Create new agent sprite
        container = this.add.container(pos.x, pos.y);

        // Agent body (circle with agent-specific color)
        const color = agentColors[agent.name] || 0x888888;
        const circle = this.add.circle(0, -5, 12, color);
        circle.setName("body");

        // Status indicator ring
        const statusRing = this.add.circle(0, -5, 16);
        statusRing.setStrokeStyle(2, 0x00ff00);
        statusRing.setName("statusRing");

        // Name label
        const label = this.add.text(0, 10, agent.name.split(" ")[0], {
          fontSize: "10px",
          color: "#ffffff",
          fontFamily: "JetBrains Mono",
          backgroundColor: "#000000",
          padding: { x: 4, y: 2 },
        });
        label.setOrigin(0.5);
        label.setName("label");

        // Working animation indicator (hidden by default)
        const workingIndicator = this.add.circle(0, -15, 4, 0xffff00);
        workingIndicator.setName("workingIndicator");
        workingIndicator.setVisible(false);

        container.add([statusRing, circle, label, workingIndicator]);
        this.agents.set(agent.id, container);

        // Make interactive
        circle.setInteractive({ useHandCursor: true });
        circle.on("pointerdown", () => {
          this.game.events.emit("agentClicked", agent.id);
        });

        // Hover effect
        circle.on("pointerover", () => {
          this.tweens.add({
            targets: container,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200,
            ease: "Power2",
          });
        });

        circle.on("pointerout", () => {
          this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: "Power2",
          });
        });
      }

      // Update status ring color and animations
      const statusRing = container.getByName("statusRing") as Phaser.GameObjects.Arc;
      const workingIndicator = container.getByName("workingIndicator") as Phaser.GameObjects.Arc;
      
      if (statusRing) {
        const statusColors: Record<string, number> = {
          idle: 0x00ff00,
          working: 0xffff00,
          blocked: 0xff0000,
          offline: 0x666666,
        };
        const color = statusColors[agent.status] || 0x666666;
        statusRing.setStrokeStyle(2, color);

        // Pulse animation for working/blocked states
        if (agent.status === "working" || agent.status === "blocked") {
          this.tweens.add({
            targets: statusRing,
            alpha: { from: 1, to: 0.5 },
            duration: 500,
            yoyo: true,
            repeat: -1,
          });
        } else {
          this.tweens.killTweensOf(statusRing);
          statusRing.setAlpha(1);
        }
      }

      // Show/hide working indicator
      if (workingIndicator) {
        workingIndicator.setVisible(agent.status === "working");
        if (agent.status === "working") {
          this.tweens.add({
            targets: workingIndicator,
            y: { from: -15, to: -20 },
            duration: 500,
            yoyo: true,
            repeat: -1,
          });
        } else {
          this.tweens.killTweensOf(workingIndicator);
        }
      }
    });
  }

  update() {
    // Animation updates will go here
  }
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const { agents, setSelectedAgent } = useGameStore();

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
    };

    gameRef.current = new Phaser.Game(config);

    // Listen for agent clicks
    gameRef.current.events.on("agentClicked", (agentId: string) => {
      setSelectedAgent(agentId);
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [setSelectedAgent]);

  // Update agents in game
  useEffect(() => {
    if (gameRef.current && agents.length > 0) {
      gameRef.current.events.emit("updateAgents", agents);
    }
  }, [agents]);

  return (
    <div
      ref={containerRef}
      id="game-container"
      className="w-full h-full"
    />
  );
}

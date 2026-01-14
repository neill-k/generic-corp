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
      { x: 200, y: 200, label: "Sable" },
      { x: 400, y: 200, label: "DeVonte" },
      { x: 250, y: 280, label: "Yuki" },
      { x: 350, y: 280, label: "Gray" },
    ];

    deskPositions.forEach((pos) => {
      // Draw desk (simple rectangle for now)
      const desk = this.add.graphics();
      desk.fillStyle(0x16213e, 1);
      desk.fillRect(pos.x - 30, pos.y - 15, 60, 30);
      desk.lineStyle(2, 0x0f3460, 1);
      desk.strokeRect(pos.x - 30, pos.y - 15, 60, 30);

      // Add label
      this.add
        .text(pos.x, pos.y + 25, pos.label, {
          fontSize: "12px",
          color: "#888888",
          fontFamily: "JetBrains Mono",
        })
        .setOrigin(0.5);
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

    agents.forEach((agent) => {
      const pos = agentPositions[agent.name];
      if (!pos) return;

      let container = this.agents.get(agent.id);

      if (!container) {
        // Create new agent sprite
        container = this.add.container(pos.x, pos.y);

        // Simple circle for agent (will be replaced with proper sprites)
        const circle = this.add.circle(0, 0, 15, 0xe94560);
        const statusRing = this.add.circle(0, 0, 18);
        statusRing.setStrokeStyle(2, 0x00ff00);
        statusRing.setName("statusRing");

        container.add([circle, statusRing]);
        this.agents.set(agent.id, container);

        // Make interactive
        circle.setInteractive({ useHandCursor: true });
        circle.on("pointerdown", () => {
          this.game.events.emit("agentClicked", agent.id);
        });
      }

      // Update status ring color
      const statusRing = container.getByName("statusRing") as Phaser.GameObjects.Arc;
      if (statusRing) {
        const statusColors: Record<string, number> = {
          idle: 0x00ff00,
          working: 0xffff00,
          blocked: 0xff0000,
          offline: 0x666666,
        };
        statusRing.setStrokeStyle(2, statusColors[agent.status] || 0x666666);
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

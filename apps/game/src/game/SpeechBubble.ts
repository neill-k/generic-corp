import Phaser from "phaser";

export interface SpeechBubbleConfig {
  maxWidth?: number;
  fontSize?: string;
  fontFamily?: string;
  padding?: { x: number; y: number };
  backgroundColor?: number;
  borderColor?: number;
  textColor?: string;
  tailHeight?: number;
  fadeInDuration?: number;
  displayDuration?: number;
  fadeOutDuration?: number;
  maxQueue?: number;
}

interface QueuedMessage {
  text: string;
  timestamp: number;
}

export class SpeechBubble extends Phaser.GameObjects.Container {
  private config: Required<SpeechBubbleConfig>;
  private messageQueue: QueuedMessage[] = [];
  private currentMessage: QueuedMessage | null = null;
  private isAnimating: boolean = false;
  private bubble: Phaser.GameObjects.Graphics | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;
  private displayTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: SpeechBubbleConfig = {}
  ) {
    super(scene, x, y);

    // Default configuration
    this.config = {
      maxWidth: config.maxWidth ?? 160,
      fontSize: config.fontSize ?? "10px",
      fontFamily: config.fontFamily ?? "JetBrains Mono",
      padding: config.padding ?? { x: 10, y: 8 },
      backgroundColor: config.backgroundColor ?? 0x1a1a2e,
      borderColor: config.borderColor ?? 0xe94560,
      textColor: config.textColor ?? "#ffffff",
      tailHeight: config.tailHeight ?? 8,
      fadeInDuration: config.fadeInDuration ?? 200,
      displayDuration: config.displayDuration ?? 5000,
      fadeOutDuration: config.fadeOutDuration ?? 300,
      maxQueue: config.maxQueue ?? 3,
    };

    // Create bubble graphics
    this.bubble = scene.add.graphics();
    this.add(this.bubble);

    // Create text
    this.messageText = scene.add.text(0, 0, "", {
      fontSize: this.config.fontSize,
      fontFamily: this.config.fontFamily,
      color: this.config.textColor,
      wordWrap: { width: this.config.maxWidth - this.config.padding.x * 2 },
      align: "center",
    });
    this.messageText.setOrigin(0.5);
    this.add(this.messageText);

    // Initially invisible
    this.setAlpha(0);
    this.setVisible(false);

    // Add to scene
    scene.add.existing(this);
  }

  /**
   * Add a message to the queue
   */
  public showMessage(text: string): void {
    const message: QueuedMessage = {
      text,
      timestamp: Date.now(),
    };

    // Add to queue
    this.messageQueue.push(message);

    // Enforce max queue size - remove oldest if exceeded
    if (this.messageQueue.length > this.config.maxQueue) {
      this.messageQueue.shift();
    }

    // If not currently animating, process next message
    if (!this.isAnimating) {
      this.processNextMessage();
    }
  }

  /**
   * Process the next message in the queue
   */
  private processNextMessage(): void {
    if (this.messageQueue.length === 0) {
      this.isAnimating = false;
      return;
    }

    this.isAnimating = true;
    this.currentMessage = this.messageQueue.shift() || null;

    if (!this.currentMessage) {
      this.isAnimating = false;
      return;
    }

    // Update text
    if (this.messageText) {
      this.messageText.setText(this.currentMessage.text);

      // Calculate bubble dimensions based on text
      const textBounds = this.messageText.getBounds();
      const bubbleWidth = textBounds.width + this.config.padding.x * 2;
      const bubbleHeight = textBounds.height + this.config.padding.y * 2;

      // Redraw bubble
      this.drawBubble(bubbleWidth, bubbleHeight);

      // Position text in center of bubble
      this.messageText.setPosition(0, -this.config.tailHeight / 2);
    }

    // Fade in
    this.setVisible(true);
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0, to: 1 },
      duration: this.config.fadeInDuration,
      ease: "Power2",
      onComplete: () => {
        this.startDisplayTimer();
      },
    });
  }

  /**
   * Draw the speech bubble shape
   */
  private drawBubble(width: number, height: number): void {
    if (!this.bubble) return;

    this.bubble.clear();

    // Calculate positions
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const radius = 8;

    // Draw bubble background
    this.bubble.fillStyle(this.config.backgroundColor, 0.95);
    this.bubble.fillRoundedRect(
      -halfWidth,
      -halfHeight - this.config.tailHeight,
      width,
      height,
      radius
    );

    // Draw border
    this.bubble.lineStyle(2, this.config.borderColor, 1);
    this.bubble.strokeRoundedRect(
      -halfWidth,
      -halfHeight - this.config.tailHeight,
      width,
      height,
      radius
    );

    // Draw tail (pointing down toward agent)
    this.bubble.fillStyle(this.config.backgroundColor, 0.95);
    this.bubble.fillTriangle(
      -8, // left point
      halfHeight - this.config.tailHeight,
      8, // right point
      halfHeight - this.config.tailHeight,
      0, // bottom point
      halfHeight
    );

    // Draw tail border
    this.bubble.lineStyle(2, this.config.borderColor, 1);
    this.bubble.strokeTriangle(
      -8,
      halfHeight - this.config.tailHeight,
      8,
      halfHeight - this.config.tailHeight,
      0,
      halfHeight
    );
  }

  /**
   * Start the display timer
   */
  private startDisplayTimer(): void {
    // Clear any existing timer
    if (this.displayTimer) {
      this.displayTimer.remove();
      this.displayTimer = null;
    }

    // Create new timer
    this.displayTimer = this.scene.time.delayedCall(
      this.config.displayDuration,
      () => {
        this.fadeOut();
      }
    );
  }

  /**
   * Fade out the bubble
   */
  private fadeOut(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0 },
      duration: this.config.fadeOutDuration,
      ease: "Power2",
      onComplete: () => {
        this.setVisible(false);
        this.currentMessage = null;

        // Process next message if any
        if (this.messageQueue.length > 0) {
          this.processNextMessage();
        } else {
          this.isAnimating = false;
        }
      },
    });
  }

  /**
   * Clear all messages and stop animations
   */
  public clear(): void {
    this.messageQueue = [];
    this.currentMessage = null;

    if (this.displayTimer) {
      this.displayTimer.remove();
      this.displayTimer = null;
    }

    // Kill any running tweens
    this.scene.tweens.killTweensOf(this);

    this.setVisible(false);
    this.setAlpha(0);
    this.isAnimating = false;
  }

  /**
   * Update bubble color (e.g., to match agent color)
   */
  public setColor(borderColor: number): void {
    this.config.borderColor = borderColor;

    // Redraw if currently visible
    if (this.visible && this.messageText) {
      const textBounds = this.messageText.getBounds();
      const bubbleWidth = textBounds.width + this.config.padding.x * 2;
      const bubbleHeight = textBounds.height + this.config.padding.y * 2;
      this.drawBubble(bubbleWidth, bubbleHeight);
    }
  }

  /**
   * Get the number of queued messages
   */
  public get queueLength(): number {
    return this.messageQueue.length;
  }

  /**
   * Check if currently displaying a message
   */
  public get isDisplaying(): boolean {
    return this.isAnimating;
  }

  /**
   * Clean up
   */
  public destroy(fromScene?: boolean): void {
    this.clear();
    super.destroy(fromScene);
  }
}

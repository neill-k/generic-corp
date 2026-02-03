const DEFAULT_FLUSH_INTERVAL_MS = 50;

export class DeltaBatcher {
  private buffer = "";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(
    private readonly callback: (text: string) => void,
    private readonly intervalMs = DEFAULT_FLUSH_INTERVAL_MS,
  ) {}

  append(text: string): void {
    if (this.destroyed) return;
    this.buffer += text;
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.intervalMs);
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length > 0) {
      const text = this.buffer;
      this.buffer = "";
      this.callback(text);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.flush();
  }
}

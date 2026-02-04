import { GcPlugin } from "@generic-corp/sdk";
import type { PluginManifest, PluginContext, PluginEventBus } from "@generic-corp/sdk";

export class ConsoleChatPlugin extends GcPlugin {
  readonly manifest: PluginManifest = {
    id: "console-chat",
    name: "Console Chat",
    version: "0.1.0",
    description: "Logs agent events to stdout for local/academic use",
    author: "Generic Corp",
    license: "FSL-1.1-MIT",
    tags: ["chat", "console", "local"],
  };

  private unsubscribe: (() => void) | null = null;

  override async onReady(context: PluginContext): Promise<void> {
    const bus = context.eventBus as PluginEventBus & {
      on(event: string, handler: (payload: unknown) => void): () => void;
    };

    this.unsubscribe = bus.on("agent_event" as never, (payload: unknown) => {
      const p = payload as { agentId: string; taskId: string; event: { type: string; content?: string } };
      if (p.event.type === "message" && p.event.content) {
        console.log(`[${p.agentId}] ${p.event.content}`);
      }
    });
  }

  override async onShutdown(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}

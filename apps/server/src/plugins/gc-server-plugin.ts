import { GcPlugin, RuntimeProvider } from "@generic-corp/core";
import type { PluginManifest, PluginContext, AgentInvocation, AgentEvent } from "@generic-corp/core";
import type { AgentRuntime } from "../services/agent-lifecycle.js";
import { AgentSdkRuntime } from "../services/agent-runtime-sdk.js";
import { AgentCliRuntime } from "../services/agent-runtime-cli.js";

class PrismaRuntimeProvider extends RuntimeProvider {
  readonly providerId: string;
  readonly providerName: string;
  private readonly runtime: AgentRuntime;

  constructor(runtimeType: string) {
    super();
    this.providerId = `prisma-${runtimeType}-runtime`;
    this.providerName = `Prisma ${runtimeType.toUpperCase()} Runtime`;
    this.runtime = runtimeType === "cli" ? new AgentCliRuntime() : new AgentSdkRuntime();
  }

  override async *invoke(params: AgentInvocation): AsyncGenerator<AgentEvent> {
    yield* this.runtime.invoke(params);
  }
}

export class GcServerPlugin extends GcPlugin {
  readonly manifest: PluginManifest = {
    id: "gc-server",
    name: "Generic Corp Server",
    version: "0.1.0",
    description: "Server-specific runtime and services for Generic Corp",
    author: "Generic Corp",
    license: "FSL-1.1-MIT",
    tags: ["runtime", "server"],
  };

  override async onRegister(context: PluginContext): Promise<void> {
    const runtimeType = process.env["GC_RUNTIME"] ?? "sdk";
    const provider = new PrismaRuntimeProvider(runtimeType);

    // Register runtime via the plugin host's service container
    (context.services as unknown as {
      register: (type: string, provider: RuntimeProvider, primary: boolean) => void;
    }).register?.("runtime", provider, true);

    context.logger.info(`Runtime registered: ${provider.providerName}`);
  }
}

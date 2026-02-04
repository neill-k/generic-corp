import type { GcPlugin } from "@generic-corp/sdk";

export async function loadEnterprisePlugin(name: string): Promise<GcPlugin | null> {
  try {
    const module = await import(`@generic-corp/enterprise-${name}`) as { default: GcPlugin };
    return module.default;
  } catch {
    return null;
  }
}

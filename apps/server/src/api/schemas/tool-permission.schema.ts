import { z } from "zod";

export const createToolPermissionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  iconName: z.string().min(1),
  enabled: z.boolean().optional().default(true),
});

export const updateToolPermissionSchema = z.object({
  enabled: z.boolean().optional(),
  description: z.string().min(1).optional(),
  iconName: z.string().min(1).optional(),
});

export const updateAgentToolPermissionsSchema = z.record(
  z.string(),
  z.boolean(),
);

export type CreateToolPermissionInput = z.infer<typeof createToolPermissionSchema>;
export type UpdateToolPermissionInput = z.infer<typeof updateToolPermissionSchema>;
export type UpdateAgentToolPermissionsInput = z.infer<typeof updateAgentToolPermissionsSchema>;

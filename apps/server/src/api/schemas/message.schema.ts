import { z } from "zod";

export const createMessageBodySchema = z.object({
  agentName: z.string().min(1),
  body: z.string().min(1),
  threadId: z.string().optional(),
});

export type CreateMessageInput = z.infer<typeof createMessageBodySchema>;

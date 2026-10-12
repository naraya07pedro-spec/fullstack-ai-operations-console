import { z } from 'zod';

export const workflowSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).default(''),
  requiresApproval: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).max(5).default(3),
  timeoutMs: z.number().int().min(100).max(10000).default(3000),
  sandboxMode: z.enum(['success', 'flaky', 'recoverable', 'timeout', 'failure', 'slow']).default('success'),
}).strict();
export type WorkflowInput = z.infer<typeof workflowSchema>;
export const executionSchema = z.object({message:z.string().trim().min(3).max(2000)}).strict();
export const loginSchema = z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(12).max(128)}).strict();
export const decisionSchema = z.object({decision:z.enum(['approve','reject'])}).strict();
export const sandboxResultSchema = z.object({
  ticketId:z.string().min(1).max(100), category:z.enum(['billing','technical','general']),
  priority:z.enum(['normal','urgent']), summary:z.string().max(160), provider:z.literal('deterministic-sandbox'),
}).strict();
export const idSchema = z.uuid();
export const idempotencySchema = z.string().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const runStatuses = ['WAITING_APPROVAL','QUEUED','RUNNING','SUCCEEDED','FAILED','REJECTED'] as const;

export interface Workflow extends WorkflowInput {id:string; version:number; createdAt:string; updatedAt:string}
export interface Run {
  id:string; workflowId:string; workflowSnapshot:WorkflowInput & {version:number}; input:{message:string};
  status:typeof runStatuses[number]; attemptCount:number; recoveryCount:number; createdAt:string;
  errorCode:string|null; errorMessage:string|null; output:z.infer<typeof sandboxResultSchema>|null;
  attempts?:{id:string;number:number;status:string;errorCode:string|null;startedAt:string}[];
  events?:{id:string;type:string;createdAt:string;detail:Record<string,unknown>}[];
}

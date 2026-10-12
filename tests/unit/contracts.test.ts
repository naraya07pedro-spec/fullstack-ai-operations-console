import { describe,expect,it } from 'vitest';
import { workflowSchema,executionSchema,idempotencySchema,loginSchema,sandboxResultSchema } from '../../packages/contracts/src/index.js';
import { classify } from '../../apps/api/src/sandbox.js';
import { digest,hashPassword,safeEqual,verifyPassword } from '../../apps/api/src/auth.js';
describe('validated contracts',()=>{
 it('normalizes names and supplies bounded defaults',()=>{const w=workflowSchema.parse({name:'  Support triage  '});expect(w.name).toBe('Support triage');expect(w.requiresApproval).toBe(true);expect(w.maxAttempts).toBe(3);});
 it.each([{name:'ab'},{name:'Valid',maxAttempts:0},{name:'Valid',maxAttempts:6},{name:'Valid',timeoutMs:99},{name:'Valid',timeoutMs:10001},{name:'Valid',sandboxMode:'http://evil.test'},{name:'Valid',ownerId:'forged'},{name:'Valid',nameExtra:'x'}])('rejects invalid workflow %j',value=>expect(workflowSchema.safeParse(value).success).toBe(false));
 it('rejects oversized and empty input',()=>{expect(executionSchema.safeParse({message:'  '}).success).toBe(false);expect(executionSchema.safeParse({message:'x'.repeat(2001)}).success).toBe(false);expect(executionSchema.safeParse({message:'abc',extra:true}).success).toBe(false);});
 it('restricts idempotency keys and normalizes login email',()=>{expect(idempotencySchema.safeParse('bad key').success).toBe(false);expect(loginSchema.parse({email:'USER@example.test',password:'test-password-123'}).email).toBe('user@example.test');});
 it('validates integration responses',()=>{expect(sandboxResultSchema.safeParse({ticketId:'sbx_123',...classify('Urgent invoice issue')}).success).toBe(true);expect(sandboxResultSchema.safeParse({provider:'live-ai',summary:'unsupported'}).success).toBe(false);});
});
describe('passwords and tokens',()=>{
 it('hashes independently salted passwords and verifies without plaintext storage',async()=>{const a=await hashPassword('correct-horse-password'),b=await hashPassword('correct-horse-password');expect(a).not.toBe(b);expect(a).not.toContain('correct-horse');expect(await verifyPassword('correct-horse-password',a)).toBe(true);expect(await verifyPassword('wrong-password',a)).toBe(false);expect(await verifyPassword('x','broken')).toBe(false);});
 it('compares tokens and hashes deterministically',()=>{expect(safeEqual('abc','abc')).toBe(true);expect(safeEqual('abc','ab')).toBe(false);expect(safeEqual('abc','abd')).toBe(false);expect(digest('token')).toHaveLength(64);});
});
describe('explicitly deterministic triage',()=>{
 it.each([['Urgent billing refund','billing','urgent'],['API error blocks integration','technical','normal'],['Hello operations','general','normal']])('classifies %s',(message,category,priority)=>expect(classify(message)).toMatchObject({category,priority,provider:'deterministic-sandbox'}));
 it('bounds output summaries',()=>expect(classify('x'.repeat(2000)).summary).toHaveLength(160));
});

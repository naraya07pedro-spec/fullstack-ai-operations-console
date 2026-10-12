import Fastify from 'fastify';
import { z } from 'zod';
import { digest, safeEqual } from './auth.js';
import { executionSchema, workflowSchema } from '../../../packages/contracts/src/index.js';
export function classify(message:string){
  const m=message.toLowerCase();
  return {category:/bill|invoice|payment|refund/.test(m)?'billing' as const:/error|broken|api|integration/.test(m)?'technical' as const:'general' as const,
    priority:/urgent|outage|blocked/.test(m)?'urgent' as const:'normal' as const,
    summary:message.trim().slice(0,160),provider:'deterministic-sandbox' as const};
}
export async function buildSandbox(integrationToken:string){
  const app=Fastify({bodyLimit:8192,logger:false});const cache=new Map<string,{hash:string;result:unknown}>();
  const pending=new Map<string,{hash:string;promise:Promise<unknown>}>(),requestCounts=new Map<string,number>(),creationCounts=new Map<string,number>();let requests=0;
  app.get('/health',async()=>({status:'ok',provider:'deterministic-sandbox'}));
  app.post('/tickets',async(req,reply)=>{
    if(!safeEqual(String(req.headers.authorization??''),`Bearer ${integrationToken}`))return reply.code(401).send({code:'UNAUTHORIZED'});
    const schema=z.object({input:executionSchema,mode:workflowSchema.shape.sandboxMode,maxAttempts:z.number().int().min(1).max(5)}).strict();
    const data=schema.safeParse(req.body);const key=z.uuid().safeParse(req.headers['idempotency-key']);const attempt=z.coerce.number().int().min(1).safeParse(req.headers['x-attempt']);
    if(!data.success||!key.success||!attempt.success)return reply.code(400).send({code:'INVALID_INPUT'});
    requests++;requestCounts.set(key.data,(requestCounts.get(key.data)??0)+1);const hash=digest(JSON.stringify(data.data.input)),previous=cache.get(key.data);
    if(previous){if(previous.hash!==hash)return reply.code(409).send({code:'IDEMPOTENCY_CONFLICT'});return previous.result;}
    const inFlight=pending.get(key.data);if(inFlight){if(inFlight.hash!==hash)return reply.code(409).send({code:'IDEMPOTENCY_CONFLICT'});return inFlight.promise;}
    const {mode,maxAttempts,input}=data.data;
    if(mode==='failure')return reply.code(422).send({code:'REJECTED'});
    if(mode==='flaky'&&attempt.data===1||mode==='recoverable'&&attempt.data<=maxAttempts)return reply.code(503).send({code:'TEMPORARILY_UNAVAILABLE'});
    const promise=(async()=>{
      if(mode==='timeout')await new Promise(resolve=>setTimeout(resolve,12000));
      if(mode==='slow')await new Promise(resolve=>setTimeout(resolve,1500));
      const result={ticketId:`sbx_${key.data.slice(0,12)}`,...classify(input.message)};
      cache.set(key.data,{hash,result});creationCounts.set(key.data,(creationCounts.get(key.data)??0)+1);return result;
    })();pending.set(key.data,{hash,promise});
    try{return await promise;}finally{pending.delete(key.data);}
  });
  return {app,stats:(id?:string)=>({requests:id?requestCounts.get(id)??0:requests,tickets:id?creationCounts.get(id)??0:cache.size})};
}

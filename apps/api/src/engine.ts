import { Prisma, PrismaClient, Run } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { workflowSchema, executionSchema, sandboxResultSchema } from '../../../packages/contracts/src/index.js';
import { AppError, notFound } from './errors.js';
import { digest } from './auth.js';

const json=(v:unknown)=>v as Prisma.InputJsonValue;
export const snapshot=(run:Run)=>{const {version,...data}=run.workflowSnapshot as Record<string,unknown>;return workflowSchema.parse(data);};
export async function admitRun(db:PrismaClient, ownerId:string, workflowId:string, key:string, payload:unknown) {
  const input=executionSchema.parse(payload);
  const requestHash=digest(JSON.stringify({workflowId,input}));
  const existing=await db.run.findUnique({where:{ownerId_idempotencyKey:{ownerId,idempotencyKey:key}}});
  if(existing){if(existing.requestHash!==requestHash)throw new AppError(409,'IDEMPOTENCY_CONFLICT','This key was used for different input');return {run:existing,replayed:true};}
  const workflow=await db.workflow.findFirst({where:{id:workflowId,ownerId,archived:false}});
  if(!workflow)throw notFound();
  return db.$transaction(async tx=>{
    const id=randomUUID();
    const created=await tx.run.createMany({skipDuplicates:true,data:{id,ownerId,workflowId,idempotencyKey:key,requestHash,input:json(input),
      workflowSnapshot:json({...workflowSchema.parse({name:workflow.name,description:workflow.description,requiresApproval:workflow.requiresApproval,maxAttempts:workflow.maxAttempts,timeoutMs:workflow.timeoutMs,sandboxMode:workflow.sandboxMode}),version:workflow.version}),
      status:workflow.requiresApproval?'WAITING_APPROVAL':'QUEUED'}});
    const run=await tx.run.findUniqueOrThrow({where:{ownerId_idempotencyKey:{ownerId,idempotencyKey:key}}});
    if(run.requestHash!==requestHash)throw new AppError(409,'IDEMPOTENCY_CONFLICT','This key was used for different input');
    if(created.count)await tx.runEvent.create({data:{runId:id,type:workflow.requiresApproval?'APPROVAL_REQUESTED':'RUN_ADMITTED',actorId:ownerId,detail:{workflowVersion:workflow.version}}});
    return {run,replayed:created.count===0};
  });
}
export async function decideRun(db:PrismaClient,ownerId:string,id:string,decision:'approve'|'reject'){
  return db.$transaction(async tx=>{
    const run=await tx.run.findFirst({where:{id,ownerId}});if(!run)throw notFound();
    const changed=await tx.run.updateMany({where:{id,ownerId,status:'WAITING_APPROVAL'},data:{status:decision==='approve'?'QUEUED':'REJECTED',approvedBy:ownerId,decidedAt:new Date(),completedAt:decision==='reject'?new Date():null}});
    if(!changed.count)throw new AppError(409,'STATE_CONFLICT','Approval has already been decided');
    await tx.runEvent.create({data:{runId:id,actorId:ownerId,type:decision==='approve'?'APPROVED':'REJECTED',detail:{}}});
    return tx.run.findUniqueOrThrow({where:{id}});
  });
}
export async function recoverRun(db:PrismaClient,ownerId:string,id:string){
  return db.$transaction(async tx=>{
    const run=await tx.run.findFirst({where:{id,ownerId}});if(!run)throw notFound();
    const changed=await tx.run.updateMany({where:{id,ownerId,status:'FAILED',recoveryCount:{lt:3}},data:{status:'QUEUED',cycleAttempts:0,recoveryCount:{increment:1},errorCode:null,errorMessage:null,completedAt:null,availableAt:new Date()}});
    if(!changed.count)throw new AppError(409,'STATE_CONFLICT','Only failed runs with fewer than 3 recoveries can be retried');
    await tx.runEvent.create({data:{runId:id,actorId:ownerId,type:'RECOVERY_REQUESTED',detail:{recovery:run.recoveryCount+1}}});
    return tx.run.findUniqueOrThrow({where:{id}});
  });
}
export async function claimRun(db:PrismaClient, now=new Date()){
  return db.$transaction(async tx=>{
    const run=await tx.run.findFirst({where:{status:'QUEUED',availableAt:{lte:now}},orderBy:{createdAt:'asc'}});
    if(!run)return null;
    const config=snapshot(run),leaseToken=randomUUID();
    const result=await tx.run.updateMany({where:{id:run.id,status:'QUEUED'},data:{status:'RUNNING',attemptCount:{increment:1},cycleAttempts:{increment:1},leaseToken,leaseUntil:new Date(now.getTime()+config.timeoutMs+5000)}});
    if(!result.count)return null;
    await tx.attempt.create({data:{runId:run.id,number:run.attemptCount+1}});
    await tx.runEvent.create({data:{runId:run.id,type:'ATTEMPT_STARTED',detail:{attempt:run.attemptCount+1}}});
    return tx.run.findUniqueOrThrow({where:{id:run.id}});
  });
}
export type Outcome={ok:true;output:Prisma.InputJsonValue}|{ok:false;code:string;message:string;retryable:boolean};
export async function settleRun(db:PrismaClient,run:Run,outcome:Outcome,now=new Date(),retryDelayMs=250){
  return db.$transaction(async tx=>{
    const config=snapshot(run);
    const retry=!outcome.ok&&outcome.retryable&&run.cycleAttempts<config.maxAttempts;
    const status=outcome.ok?'SUCCEEDED':retry?'QUEUED':'FAILED';
    const changed=await tx.run.updateMany({where:{id:run.id,status:'RUNNING',leaseToken:run.leaseToken,leaseUntil:{gt:now}},data:{status,leaseToken:null,leaseUntil:null,
      ...(outcome.ok?{output:outcome.output,errorCode:null,errorMessage:null}:{errorCode:outcome.code,errorMessage:outcome.message}),
      availableAt:new Date(now.getTime()+retryDelayMs*Math.pow(2,Math.max(0,run.cycleAttempts-1))),completedAt:status==='QUEUED'?null:now}});
    if(!changed.count)return false; // Lease fencing: expired/stale workers cannot commit.
    await tx.attempt.update({where:{runId_number:{runId:run.id,number:run.attemptCount}},data:{status:outcome.ok?'SUCCEEDED':outcome.code==='TIMEOUT'?'TIMED_OUT':'FAILED',errorCode:outcome.ok?null:outcome.code,finishedAt:now}});
    await tx.runEvent.create({data:{runId:run.id,type:outcome.ok?'RUN_SUCCEEDED':retry?'RETRY_SCHEDULED':'RUN_FAILED',detail:outcome.ok?{attempt:run.attemptCount}:{attempt:run.attemptCount,code:outcome.code}}});
    return true;
  });
}
export async function reapExpired(db:PrismaClient,now=new Date()){
  const expired=await db.run.findMany({where:{status:'RUNNING',leaseUntil:{lte:now}},take:50});let recovered=0;
  for(const run of expired){
    const done=await db.$transaction(async tx=>{
      const exhausted=run.cycleAttempts>=snapshot(run).maxAttempts;
      const result=await tx.run.updateMany({where:{id:run.id,status:'RUNNING',leaseToken:run.leaseToken,leaseUntil:{lte:now}},data:{status:exhausted?'FAILED':'QUEUED',leaseToken:null,leaseUntil:null,availableAt:now,errorCode:'WORKER_LOST',errorMessage:'Worker lease expired; execution ownership was recovered',completedAt:exhausted?now:null}});
      if(!result.count)return 0;
      await tx.attempt.update({where:{runId_number:{runId:run.id,number:run.attemptCount}},data:{status:'WORKER_LOST',errorCode:'WORKER_LOST',finishedAt:now}});
      await tx.runEvent.create({data:{runId:run.id,type:'LEASE_EXPIRED',detail:{attempt:run.attemptCount,exhausted}}});return 1;
    });recovered+=done;
  }return recovered;
}
export async function executeSandbox(run:Run,url:string, integrationToken:string):Promise<Outcome>{
  const config=snapshot(run);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),config.timeoutMs);
  try {
    // The integration URL is server-configured. Workflow input cannot select arbitrary hosts.
    const response=await fetch(`${url.replace(/\/$/,'')}/tickets`,{method:'POST',redirect:'error',signal:controller.signal,
      headers:{'content-type':'application/json','authorization':`Bearer ${integrationToken}`,'idempotency-key':run.id,'x-attempt':String(run.attemptCount)},
      body:JSON.stringify({input:run.input,mode:config.sandboxMode,maxAttempts:config.maxAttempts})});
    if(!response.ok) return {ok:false,code:response.status>=500?'UPSTREAM_UNAVAILABLE':'UPSTREAM_REJECTED',message:`Sandbox returned HTTP ${response.status}`,retryable:response.status>=500||response.status===429};
    // Bound the body before JSON parsing, including chunked responses.
    const reader=response.body?.getReader();if(!reader)throw new Error('Empty body');let size=0;const chunks:Uint8Array[]=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();return {ok:false,code:'INVALID_RESPONSE',message:'Sandbox response exceeded 16 KiB',retryable:false};}chunks.push(value);}
    const result=sandboxResultSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    if(!result.success)return {ok:false,code:'INVALID_RESPONSE',message:'Sandbox returned an invalid response',retryable:false};
    return {ok:true,output:json(result.data)};
  }catch(error){
    if(controller.signal.aborted)return {ok:false,code:'TIMEOUT',message:`Sandbox exceeded ${config.timeoutMs} ms timeout`,retryable:true};
    if(error instanceof SyntaxError)return {ok:false,code:'INVALID_RESPONSE',message:'Sandbox returned invalid JSON',retryable:false};
    return {ok:false,code:'NETWORK_ERROR',message:'Sandbox connection failed',retryable:true};
  }finally{clearTimeout(timer);}
}
export async function workerTick(db:PrismaClient,url:string,integrationToken:string){
  await reapExpired(db);const run=await claimRun(db);if(!run)return null;
  const result=await executeSandbox(run,url,integrationToken);await settleRun(db,run,result);return run.id;
}

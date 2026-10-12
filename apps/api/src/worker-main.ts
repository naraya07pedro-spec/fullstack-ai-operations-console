import { PrismaClient } from '@prisma/client';
import { getConfig } from './config.js';
import { workerTick } from './engine.js';
import { createServer } from 'node:http';
const config=getConfig(),db=new PrismaClient();let stopping=false;
await db.$connect();let healthy=true;
const health=createServer((req,res)=>{res.writeHead(req.url==='/health'?(healthy?200:503):404,{'content-type':'application/json'});res.end(JSON.stringify({status:healthy?'ok':'degraded',worker:'standalone'}));});
health.listen(Number(process.env.WORKER_PORT??4200),'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{stopping=true;});
while(!stopping){
  try{const id=await workerTick(db,config.SANDBOX_URL,config.SANDBOX_TOKEN);healthy=true;if(id)process.stdout.write(JSON.stringify({event:'worker_tick',runId:id})+'\n');}
  catch(error){healthy=false;const e=error as {name?:string;code?:string};process.stderr.write(JSON.stringify({event:'worker_tick_failed',errorType:e.name,errorCode:e.code})+'\n');}
  await new Promise(resolve=>setTimeout(resolve,250));
}
await db.$disconnect();
health.close();

import { PrismaClient } from '@prisma/client';
import { buildApp } from './app.js';
const db=new PrismaClient();const app=await buildApp(db,{logging:true});
await app.listen({port:Number(process.env.API_PORT??4000),host:process.env.API_HOST??'127.0.0.1'});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,async()=>{await app.close();await db.$disconnect();process.exit(0);});

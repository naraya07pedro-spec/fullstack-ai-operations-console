import { defineConfig,devices } from '@playwright/test';
import chromium from '@sparticuz/chromium';
import { resolve } from 'node:path';
const fallback=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browserEnv=process.env.BROWSER_LIB_DIR?{...process.env,FONTCONFIG_PATH:resolve(process.env.BROWSER_LIB_DIR,'fonts'),LD_LIBRARY_PATH:`${resolve(process.env.BROWSER_LIB_DIR,'al2023/lib')}:${process.env.LD_LIBRARY_PATH??''}`} as Record<string,string>:undefined;
export default defineConfig({
  testDir:'tests/e2e',fullyParallel:false,workers:1,retries:0,timeout:60000,
  expect:{timeout:15000},reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}],['json',{outputFile:'artifacts/e2e-results.json'}]],
  use:{baseURL:'http://localhost:3000',trace:'on',video:'on',screenshot:'only-on-failure',launchOptions:fallback?{executablePath:fallback,args:chromium.args,env:browserEnv}:{}},
  projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},{name:'mobile-chromium',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}}],
  webServer:[
    {command:'npm run dev:api',url:'http://127.0.0.1:4000/health',reuseExistingServer:false,timeout:60000},
    {command:'npm run dev:sandbox',url:'http://127.0.0.1:4100/health',reuseExistingServer:false,timeout:60000},
    {command:'npm run dev:worker',url:'http://127.0.0.1:4200/health',reuseExistingServer:false,timeout:60000},
    {command:'npm run start --workspace apps/web',url:'http://localhost:3000',reuseExistingServer:false,timeout:60000},
  ],
});

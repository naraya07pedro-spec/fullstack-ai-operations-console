import { spawnSync } from 'node:child_process';
import { mkdirSync,writeFileSync } from 'node:fs';
mkdirSync('artifacts',{recursive:true});
const result=spawnSync('npm',['audit','--json'],{encoding:'utf8',maxBuffer:8*1024*1024});
let report;try{report=JSON.parse(result.stdout);}catch{console.error('Dependency audit did not return valid JSON');process.exit(1);}
writeFileSync('artifacts/dependency-audit.json',JSON.stringify(report,null,2));
if(report.error||!report.metadata?.vulnerabilities){console.error('Dependency audit service failed; verification is incomplete');process.exit(1);}
const counts=report.metadata.vulnerabilities;console.log(JSON.stringify({source:'npm audit registry advisory response',vulnerabilities:counts}));
// Any known advisory blocks the check, including development dependencies.
if(counts.total>0)process.exit(1);

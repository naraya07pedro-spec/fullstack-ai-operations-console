import { execFileSync } from 'node:child_process';
import { readFileSync,existsSync } from 'node:fs';
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/,/\bAKIA[A-Z0-9]{16}\b/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{25,}\b/,/(?:SANDBOX_TOKEN|API_KEY|CLIENT_SECRET|DEMO_PASSWORD)\s*[=:]\s*["']?[A-Za-z0-9_-]{24,}/];
const scan=(text)=>patterns.some(p=>p.test(text));
if(process.argv.includes('--stdin')){if(scan(readFileSync(0,'utf8'))){console.error('Secret pattern detected in supplied input');process.exit(1);}console.log('Input scan passed');process.exit(0);}
const paths=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))];
const findings=[];let scanned=0;
for(const path of paths){if(!existsSync(path)||path==='package-lock.json')continue;const bytes=readFileSync(path);if(bytes.includes(0))continue;scanned++;if(scan(bytes.toString('utf8')))findings.push(path);}
if(findings.length){console.error(JSON.stringify({status:'failed',files:findings}));process.exit(1);}
console.log(JSON.stringify({status:'passed',textFilesScanned:scanned,scope:'current tracked and unignored text; known credential patterns; excludes lockfile integrity and binary assets'}));

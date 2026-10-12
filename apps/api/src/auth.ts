import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password:string) {
  const salt=randomBytes(16).toString('hex');
  const hash=await scrypt(password,salt,64) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password:string, encoded:string) {
  const [scheme,salt,value]=encoded.split(':');
  if(scheme!=='scrypt'||!salt||!value||value.length!==128) return false;
  const candidate=await scrypt(password,salt,64) as Buffer;
  const expected=Buffer.from(value,'hex');
  return candidate.length===expected.length && timingSafeEqual(candidate,expected);
}
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}

import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const envFile = new URL('../.env', import.meta.url);
if (fs.existsSync(envFile)) process.loadEnvFile(fileURLToPath(envFile));
export const origin = new URL(process.env.APP_ORIGIN || 'http://localhost:6300').origin;
export const secureCookies = origin.startsWith('https:');
if (process.env.NODE_ENV === 'production' && !secureCookies) throw new Error('APP_ORIGIN deve usar HTTPS em produção');
export const database = {host:process.env.PGHOST || '127.0.0.1',port:Number(process.env.PGPORT || 55432),database:'kartvicio',user:'kartvicio',password:process.env.POSTGRES_PASSWORD};

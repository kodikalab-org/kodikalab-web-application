import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

// Vercel variables take precedence over local .env files.
if (existsSync('.env')) loadEnvFile('.env');
const production = process.argv.includes('--production');
const value = process.env.API_BASE_URL?.trim() || (production ? '' : 'http://localhost:8080/api');
if (!value) throw new Error('Define API_BASE_URL in Vercel before building.');
const url = new URL(value);
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
  throw new Error('API_BASE_URL must be an HTTP(S) URL without credentials, query or fragment.');
}
if (production && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
  throw new Error('Production API_BASE_URL must use HTTPS and a public hostname.');
}
if (url.pathname.replace(/\/+$/, '') !== '/api') {
  throw new Error('API_BASE_URL must end in /api.');
}
mkdirSync('src/environments', { recursive: true });
writeFileSync('src/environments/environment.generated.ts',
  `// Generated from the public API_BASE_URL. Do not edit.\nexport const environment = ${JSON.stringify({ apiUrl: value.replace(/\/+$/, '') })} as const;\n`);

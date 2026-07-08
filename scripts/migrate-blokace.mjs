import { Client } from 'pg';
import { readFileSync } from 'fs';

const envFile = readFileSync(new URL('../.env.development.local', import.meta.url), 'utf8');
const dbUrlLine = envFile.split('\n').find((l) => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '');

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

await client.query(`
  ALTER TABLE bookings ALTER COLUMN jmeno DROP NOT NULL;
  ALTER TABLE bookings ALTER COLUMN telefon DROP NOT NULL;
  ALTER TABLE bookings ALTER COLUMN email DROP NOT NULL;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS typ TEXT NOT NULL DEFAULT 'rezervace';
`);

console.log('OK: migrace hotova');
await client.end();

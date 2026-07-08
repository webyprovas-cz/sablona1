import { Client } from 'pg';
import { readFileSync } from 'fs';

const envFile = readFileSync(new URL('../.env.development.local', import.meta.url), 'utf8');
const dbUrlLine = envFile.split('\n').find((l) => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '');

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

await client.connect();
await client.query(`
  CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    jmeno TEXT NOT NULL,
    telefon TEXT NOT NULL,
    email TEXT NOT NULL,
    sluzba TEXT NOT NULL,
    datum DATE NOT NULL,
    cas TEXT NOT NULL,
    poznamka TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(datum, cas)
  );
`);
console.log('OK: bookings table ready');
await client.end();

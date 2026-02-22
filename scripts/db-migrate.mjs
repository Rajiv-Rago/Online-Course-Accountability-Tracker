import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const migrationsDir = join(root, 'supabase', 'migrations');

// Load DATABASE_URL from .env if not already set
if (!process.env.DATABASE_URL) {
  const envPath = join(root, '.env');
  try {
    const env = readFileSync(envPath, 'utf-8');
    for (const line of env.split('\n')) {
      const match = line.match(/^DATABASE_URL=(.+)$/);
      if (match) {
        process.env.DATABASE_URL = match[1].trim();
        break;
      }
    }
  } catch {
    // .env not found
  }
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  console.error('Add it to your .env file. Find it in Supabase Dashboard > Settings > Database > Connection string (URI).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  console.log('Connected to database.\n');

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`Running ${file}...`);
    try {
      await client.query(sql);
      console.log(`  ✓ Done\n`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}\n`);
      process.exit(1);
    }
  }

  console.log('All migrations complete.');
  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

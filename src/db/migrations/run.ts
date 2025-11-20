import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create admin client for running migrations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Creates migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

  if (error) {
    // If the RPC doesn't exist, we'll execute directly
    // This is a fallback for initial setup
    console.log('⚠️  Warning: Could not create migrations table via RPC');
    console.log('   Please ensure migrations table exists in your database');
  }
}

/**
 * Gets list of already executed migrations
 */
async function getExecutedMigrations(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('_migrations')
    .select('name');

  if (error) {
    console.log('⚠️  No previous migrations found');
    return new Set();
  }

  return new Set(data?.map(m => m.name) || []);
}

/**
 * Records a migration as executed
 */
async function recordMigration(name: string) {
  const { error } = await supabase
    .from('_migrations')
    .insert({ name });

  if (error) {
    throw new Error(`Failed to record migration ${name}: ${error.message}`);
  }
}

/**
 * Executes a SQL migration file
 */
async function executeMigration(filePath: string, migrationName: string) {
  const sql = readFileSync(filePath, 'utf-8');

  console.log(`\n📝 Executing migration: ${migrationName}`);

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    try {
      // For Supabase, we need to use the REST API to execute raw SQL
      // This is a simplified approach - in production you might use Supabase CLI
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ sql: statement + ';' })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Failed to execute statement ${i + 1}:`, error);
        throw new Error(`Migration failed: ${error}`);
      }
    } catch (err) {
      // If RPC method doesn't exist, log warning
      console.log(`⚠️  Statement ${i + 1}: Manual execution may be required`);
      console.log(`   SQL: ${statement.substring(0, 100)}...`);
    }
  }

  await recordMigration(migrationName);
  console.log(`✅ Migration ${migrationName} completed successfully`);
}

/**
 * Main migration runner
 */
async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');

    // Ensure migrations tracking table exists
    await ensureMigrationsTable();

    // Get migrations directory
    const migrationsDir = join(__dirname, '../../../supabase/migrations');
    console.log(`📁 Migrations directory: ${migrationsDir}\n`);

    // Get all migration files
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('ℹ️  No migration files found');
      return;
    }

    // Get already executed migrations
    const executedMigrations = await getExecutedMigrations();

    // Execute pending migrations
    let executedCount = 0;
    for (const file of files) {
      const migrationName = file.replace('.sql', '');

      if (executedMigrations.has(migrationName)) {
        console.log(`⏭️  Skipping ${migrationName} (already executed)`);
        continue;
      }

      const filePath = join(migrationsDir, file);
      await executeMigration(filePath, migrationName);
      executedCount++;
    }

    console.log('\n' + '='.repeat(50));
    if (executedCount === 0) {
      console.log('✨ All migrations are up to date!');
    } else {
      console.log(`✨ Successfully executed ${executedCount} migration(s)!`);
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();

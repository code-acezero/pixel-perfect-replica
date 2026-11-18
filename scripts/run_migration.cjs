const fs = require('node:fs');
const path = require('node:path');
const { getSqlClient } = require('./db.cjs');

async function migrate() {
  const migrationFilePath = path.join(__dirname, '..', 'drizzle', 'migrations', 'complete_production_migration.sql');
  console.log('Reading migration file:', migrationFilePath);
  const sqlScript = fs.readFileSync(migrationFilePath, 'utf8');

  console.log('Connecting to Supabase PostgreSQL...');
  const sql = getSqlClient();

  try {
    console.log('Executing migration script in transaction...');
    await sql.begin(async sqlTx => {
      await sqlTx.unsafe(sqlScript);
    });

    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

migrate();

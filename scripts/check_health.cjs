const { getSqlClient } = require('./db.cjs');

async function checkHealth() {
  const sql = getSqlClient();
  try {
    const res = await sql`SELECT 1 as connected;`;
    console.log('Database connected successfully:', res);
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('Public tables count:', tables.length);
  } catch (e) {
    console.error('Health check failed:', e.message);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

checkHealth();

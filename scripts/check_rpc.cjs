const { getSqlClient } = require('./db.cjs');

async function main() {
  const sql = getSqlClient();
  try {
    const r = await sql`SELECT proname FROM pg_proc WHERE proname = 'verify_certificate'`;
    console.log("verify_certificate function in DB:", r);
  } catch (e) {
    console.error("RPC check error:", e.message);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch(console.error);

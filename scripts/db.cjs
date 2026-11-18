const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns');
const postgres = require('postgres');

const dohCache = new Map([
  ['dns.google', ['8.8.8.8']],
  ['supabase.co', ['104.18.38.10']],
  ['aws-0-ap-southeast-2.pooler.supabase.com', ['3.106.102.114', '13.238.183.126', '13.237.241.81']]
]);

async function dohLookup(hostname) {
  if (dohCache.has(hostname)) return dohCache.get(hostname);
  try {
    const res = await fetch('https://8.8.8.8/resolve?name=' + encodeURIComponent(hostname), { headers: { 'Host': 'dns.google' } });
    const json = await res.json();
    const ips = json.Answer?.filter(a => a.type === 1).map(a => a.data) || [];
    if (ips.length > 0) dohCache.set(hostname, ips);
    return ips;
  } catch (e) { return []; }
}

const orig = dns.lookup.bind(dns);
dns.lookup = async (host, opts, cb) => {
  if (typeof opts === 'function') { cb = opts; opts = {}; }
  if (host.endsWith('.supabase.co')) return opts?.all ? cb(null, [{ address: '104.18.38.10', family: 4 }]) : cb(null, '104.18.38.10', 4);
  if (dohCache.has(host)) {
    const ips = dohCache.get(host);
    return opts?.all ? cb(null, ips.map(ip => ({ address: ip, family: 4 }))) : cb(null, ips[0], 4);
  }
  const ips = await dohLookup(host);
  if (ips && ips.length > 0) return opts?.all ? cb(null, ips.map(ip => ({ address: ip, family: 4 }))) : cb(null, ips[0], 4);
  return orig(host, opts, cb);
};

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
      if (match) return match[1];
    }
  }
  throw new Error("DATABASE_URL environment variable is missing. Check .env.local");
}

function getSqlClient() {
  const url = getDatabaseUrl();
  return postgres(url, {
    ssl: { rejectUnauthorized: false },
    prepare: false
  });
}

module.exports = { getSqlClient, getDatabaseUrl };

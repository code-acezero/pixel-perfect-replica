// Synchronous Node.js DNS fallback for environments where local ISP or router DNS proxies fail to resolve *.supabase.co
import dns from "node:dns";

if (typeof window === "undefined" && dns && typeof dns.lookup === "function") {
  const originalLookup = dns.lookup.bind(dns);
  const patchedLookup: any = (hostname: string, options: any, callback: any) => {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    if (typeof hostname === "string") {
      if (hostname.endsWith(".supabase.co")) {
        const ip = "104.18.38.10";
        if (options && options.all) {
          return callback(null, [{ address: ip, family: 4 }]);
        }
        return callback(null, ip, 4);
      }
      if (hostname === "aws-0-ap-southeast-2.pooler.supabase.com") {
        const ip = "3.106.102.114";
        if (options && options.all) {
          return callback(null, [{ address: ip, family: 4 }]);
        }
        return callback(null, ip, 4);
      }
    }
    return originalLookup(hostname, options, callback);
  };
  if (originalLookup.__promisify__) {
    patchedLookup.__promisify__ = originalLookup.__promisify__;
  }
  dns.lookup = patchedLookup;
}

export {};

#!/usr/bin/env node
/**
 * deploy.js — Syncs all domains/*.json files to Cloudflare DNS
 *
 * Required environment variables:
 *   CF_API_TOKEN  — Cloudflare API token (Zone:DNS:Edit permission)
 *   CF_ZONE_ID    — Cloudflare Zone ID for your domain
 *   BASE_DOMAIN   — Your root domain, e.g. "your-service.com"
 */

const fs   = require("fs");
const path = require("path");

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE_DOMAIN = process.env.BASE_DOMAIN;
const CF_TOKEN    = process.env.CF_API_TOKEN;
const CF_ZONE_ID  = process.env.CF_ZONE_ID;
const DOMAINS_DIR = path.join(__dirname, "..", "domains");

const CF_API  = "https://api.cloudflare.com/client/v4";
const HEADERS = {
  "Authorization": `Bearer ${CF_TOKEN}`,
  "Content-Type":  "application/json",
};

// Record types that Cloudflare can proxy (orange cloud)
const PROXYABLE = new Set(["A", "AAAA", "CNAME"]);

// ─── Guards ───────────────────────────────────────────────────────────────────
if (!CF_TOKEN || !CF_ZONE_ID || !BASE_DOMAIN) {
  console.error("❌ Missing environment variables: CF_API_TOKEN, CF_ZONE_ID, BASE_DOMAIN");
  process.exit(1);
}

// ─── Cloudflare helpers ───────────────────────────────────────────────────────
async function cfFetch(method, endpoint, body) {
  const res  = await fetch(`${CF_API}${endpoint}`, {
    method,
    headers: HEADERS,
    body:    body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data.errors));
  return data.result;
}

async function getAllExistingRecords() {
  const records = [];
  let page = 1;
  while (true) {
    const batch = await cfFetch("GET", `/zones/${CF_ZONE_ID}/dns_records?per_page=100&page=${page}`);
    records.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return records;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function deploy() {
  console.log(`🚀 Starting DNS sync for ${BASE_DOMAIN}\n`);

  // 1. Load all existing Cloudflare records
  const existing = await getAllExistingRecords();
  console.log(`📋 Found ${existing.length} existing DNS records on Cloudflare`);

  // Build a lookup map: "TYPE:fqdn:content" → record id
  const existingMap = new Map();
  for (const r of existing) {
    existingMap.set(`${r.type}:${r.name}:${r.content}`, r.id);
  }

  // Track which record IDs we touched (for optional cleanup later)
  const touchedIds = new Set();

  // 2. Load all domain JSON files (skip example.json)
  const files = fs.readdirSync(DOMAINS_DIR)
    .filter(f => f.endsWith(".json") && f !== "example.json");

  console.log(`📁 Processing ${files.length} domain file(s)\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const subdomain = path.basename(file, ".json");
    const cfg  = JSON.parse(fs.readFileSync(path.join(DOMAINS_DIR, file), "utf8"));
    const fqdn = `${subdomain}.${BASE_DOMAIN}`;

    console.log(`  🔧 ${fqdn}`);

    for (const [type, rawValue] of Object.entries(cfg.record)) {
      const values  = Array.isArray(rawValue) ? rawValue : [rawValue];
      const proxied = !!(cfg.proxied && PROXYABLE.has(type));

      for (const content of values) {
        const strContent = String(content);
        const recordBody = {
          type,
          name:    fqdn,
          content: strContent,
          ttl:     proxied ? 1 : 300,   // 1 = Auto when proxied
          proxied,
          ...(type === "MX" ? { priority: 10 } : {}),
        };

        // MX and NS records cannot be proxied
        if (type === "MX" || type === "NS") recordBody.proxied = false;

        const key        = `${type}:${fqdn}:${strContent}`;
        const existingId = existingMap.get(key);

        if (existingId) {
          // Record already exists with exact content — update to sync proxied/ttl
          await cfFetch("PUT", `/zones/${CF_ZONE_ID}/dns_records/${existingId}`, recordBody);
          touchedIds.add(existingId);
          console.log(`     ♻️  Updated  ${type} → ${strContent}`);
          updated++;
        } else {
          // New record — create it
          const created_record = await cfFetch("POST", `/zones/${CF_ZONE_ID}/dns_records`, recordBody);
          touchedIds.add(created_record.id);
          console.log(`     ➕ Created  ${type} → ${strContent}`);
          created++;
        }
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(55)}`);
  console.log(`✅ Sync complete!`);
  console.log(`   Created: ${created}  |  Updated: ${updated}  |  Skipped: ${skipped}`);
  console.log(`\n⚡ Records will be live within a few minutes.`);
}

deploy().catch(e => {
  console.error("❌ Deploy failed:", e.message);
  process.exit(1);
});

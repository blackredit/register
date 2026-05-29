#!/usr/bin/env node
/**
 * validate.js — Validates all domain JSON files in domains/
 * Run: node scripts/validate.js
 */

const fs   = require("fs");
const path = require("path");

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE_DOMAIN   = process.env.BASE_DOMAIN || "your-service.com"; // ← change this
const DOMAINS_DIR   = path.join(__dirname, "..", "domains");

const ALLOWED_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA", "SRV"];

const RESERVED = new Set([
  "www", "mail", "ftp", "smtp", "imap", "pop", "pop3", "webmail",
  "admin", "administrator", "root", "hostmaster", "postmaster",
  "api", "dev", "staging", "test", "beta", "alpha",
  "ns", "ns1", "ns2", "ns3", "ns4",
  "status", "docs", "help", "support", "blog",
  "cdn", "static", "assets", "media", "img",
  "@", "_dmarc", "_domainkey"
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
let errors   = 0;
let warnings = 0;

const err  = (msg) => { console.error(`  ❌ ERROR:   ${msg}`); errors++;   };
const warn = (msg) => { console.warn (`  ⚠️  WARNING: ${msg}`); warnings++; };
const ok   = (msg) => console.log(`  ✅ ${msg}`);

// ─── Main ─────────────────────────────────────────────────────────────────────
const files = fs.readdirSync(DOMAINS_DIR).filter(f => f.endsWith(".json") && f !== "example.json");

if (files.length === 0) {
  console.log("No domain files found (skipping example.json).");
  process.exit(0);
}

for (const file of files) {
  const filePath  = path.join(DOMAINS_DIR, file);
  const subdomain = path.basename(file, ".json");

  console.log(`\nChecking: ${subdomain}.${BASE_DOMAIN}`);

  // 1. File name — only lowercase letters, numbers, hyphens; no leading/trailing hyphen
  if (!/^[a-z0-9]([a-z0-9-]{0,98}[a-z0-9])?$/.test(subdomain)) {
    err(`"${subdomain}" contains invalid characters. Only a–z, 0–9, and hyphens are allowed.`);
    continue;
  }

  // 2. Reserved names
  if (RESERVED.has(subdomain)) {
    err(`"${subdomain}" is reserved and cannot be registered.`);
    continue;
  }

  // 3. Parse JSON
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    err(`Invalid JSON — ${e.message}`);
    continue;
  }

  // 4. owner object
  if (!cfg.owner || typeof cfg.owner !== "object") {
    err(`"owner" object is missing.`);
    continue;
  }
  if (!cfg.owner.username || typeof cfg.owner.username !== "string") {
    err(`"owner.username" is missing or not a string.`);
  }
  if (cfg.owner.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.owner.email)) {
    warn(`"owner.email" does not look like a valid email address.`);
  }

  // 5. record object
  if (!cfg.record || typeof cfg.record !== "object" || Array.isArray(cfg.record)) {
    err(`"record" object is missing.`);
    continue;
  }
  if (Object.keys(cfg.record).length === 0) {
    err(`"record" is empty — at least one DNS entry is required.`);
    continue;
  }

  // 6. Record types and values
  for (const [type, value] of Object.entries(cfg.record)) {
    if (!ALLOWED_TYPES.includes(type)) {
      err(`Unknown record type "${type}". Allowed: ${ALLOWED_TYPES.join(", ")}`);
      continue;
    }
    if (value === null || value === undefined || value === "") {
      err(`Record type "${type}" has no value.`);
      continue;
    }
    // A records must be arrays of valid IPv4
    if (type === "A") {
      const ips = Array.isArray(value) ? value : [value];
      for (const ip of ips) {
        if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
          err(`"${ip}" is not a valid IPv4 address for an A record.`);
        }
      }
    }
    // AAAA must be arrays
    if (type === "AAAA" && !Array.isArray(value)) {
      warn(`AAAA record should be an array, e.g. ["2001:db8::1"]`);
    }
  }

  // 7. CNAME cannot be combined with other record types
  if (cfg.record.CNAME && Object.keys(cfg.record).length > 1) {
    err(`CNAME cannot be combined with other record types (DNS standard).`);
  }

  // 8. CNAME must not point back to the same service domain
  if (cfg.record.CNAME && String(cfg.record.CNAME).endsWith(BASE_DOMAIN)) {
    err(`CNAME target must not point back to ${BASE_DOMAIN}.`);
  }

  // 9. proxied flag
  if (cfg.proxied !== undefined && typeof cfg.proxied !== "boolean") {
    err(`"proxied" must be true or false.`);
  }

  // 10. Unknown top-level fields
  const allowed = new Set(["owner", "record", "proxied"]);
  for (const key of Object.keys(cfg)) {
    if (!allowed.has(key)) warn(`Unknown field "${key}" will be ignored.`);
  }

  if (errors === 0) ok("Looks good!");
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(55)}`);
console.log(`Checked ${files.length} file(s) — ${errors} error(s), ${warnings} warning(s)`);

if (errors > 0) {
  console.error("\n❌ Validation failed. Fix the errors above before opening a PR.");
  process.exit(1);
} else {
  console.log("\n✅ All domain files are valid!");
}

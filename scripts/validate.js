#!/usr/bin/env node
/**
 * validate.js — Validates all domain JSON files in domains/
 * Run: node scripts/validate.js
 */

const fs   = require("fs");
const path = require("path");

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE_DOMAIN   = process.env.BASE_DOMAIN || "getxyz.de";
const DOMAINS_DIR   = path.join(__dirname, "..", "domains");

const ALLOWED_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA", "SRV"];

const RESERVED = new Set([
  // Infrastructure
  "www", "www1", "www2", "www3",
  "mail", "mail1", "mail2", "mailer", "mailserver",
  "ftp", "sftp", "ftps",
  "smtp", "smtp1", "smtp2",
  "imap", "pop", "pop3",
  "webmail", "roundcube", "squirrelmail",
  "ns", "ns1", "ns2", "ns3", "ns4", "ns5", "dns", "dns1", "dns2",
  "mx", "mx1", "mx2",

  // Admin / system
  "admin", "administrator", "administration",
  "root", "superuser", "sysadmin",
  "hostmaster", "postmaster", "abuse", "noc", "security",
  "webmaster", "domainadmin",

  // API / Dev / Environments
  "api", "api1", "api2", "apiv1", "apiv2", "apiv3",
  "rest", "graphql", "grpc", "rpc", "soap", "webhook", "webhooks",
  "dev", "develop", "developer", "developers",
  "staging", "stage",
  "test", "testing", "tests",
  "beta", "alpha", "canary", "preview",
  "sandbox", "demo", "example", "sample",
  "local", "localhost",
  "internal", "intranet", "private",
  "prod", "production",
  "lab", "labs",
  "next", "new", "old", "legacy",
  "v1", "v2", "v3",

  // Docs / Support / Community
  "status", "uptime", "monitor", "monitoring", "ping", "health",
  "docs", "documentation", "doc",
  "help", "helpdesk",
  "support", "ticket", "tickets",
  "blog", "news", "press", "updates", "changelog",
  "forum", "forums", "community", "discuss", "discussion",
  "wiki", "kb", "knowledgebase",
  "faq", "manual",
  "learn", "learning", "courses", "tutorials",

  // CDN / Assets
  "cdn", "cdn1", "cdn2",
  "static", "assets", "asset",
  "media", "img", "images", "image",
  "video", "videos", "audio", "files", "file",
  "download", "downloads", "upload", "uploads",
  "storage", "store", "bucket",
  "cache", "proxy",

  // Auth / Security
  "auth", "authentication", "oauth", "sso", "login", "logout",
  "signup", "register", "account", "accounts", "profile",
  "password", "reset", "verify", "verification",
  "id", "identity", "user", "users",
  "token", "tokens", "session",
  "2fa", "mfa",

  // Business
  "shop", "store", "cart", "checkout", "pay", "payment", "payments",
  "billing", "invoice", "invoices", "subscription", "subscriptions",
  "affiliate", "referral", "promo",
  "enterprise", "business", "corporate",
  "partners", "partner", "reseller",

  // Marketing / Web
  "landing", "campaign", "campaigns",
  "app", "apps", "webapp", "web",
  "mobile", "ios", "android",
  "dashboard", "panel", "console", "portal", "cp", "cpanel",
  "manage", "management", "manager",
  "analytics", "stats", "metrics", "tracking",
  "search", "explore",
  "careers", "jobs", "hire",
  "about", "contact", "legal", "privacy", "terms",

  // Infrastructure / Cloud
  "vpn", "proxy", "gateway", "firewall",
  "server", "servers", "host", "hosting",
  "node", "nodes", "cluster", "clusters",
  "db", "database", "databases", "sql", "mysql", "postgres", "mongo",
  "redis", "elastic", "kafka", "queue",
  "git", "gitlab", "github", "svn", "repo", "repos", "registry",
  "ci", "cd", "pipeline", "build", "builds", "deploy", "deployment",
  "docker", "k8s", "kubernetes", "infra", "infrastructure",

  // DNS special records
  "@", "*",
  "_dmarc", "_domainkey", "_acme-challenge",
  "_mta-sts", "_smtp-tls", "_spf",
  "_caldav", "_carddav",
  "_sip", "_xmpp", "_jabber",

  // Cloudflare / service reserved
  "cloudflare", "cf",
  "cpanel", "whm", "plesk", "directadmin",
  "autoconfig", "autodiscover",   // email client auto-setup
  "broadcast", "localhost",
]);

// ─── PR file-path guard (only runs inside GitHub Actions on pull_request) ─────
if (process.env.GITHUB_EVENT_NAME === "pull_request") {
  const { execSync } = require("child_process");
  const base = process.env.GITHUB_BASE_REF || "main";

  let changedFiles;
  try {
    changedFiles = execSync(`git diff --name-only origin/${base}...HEAD`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch (e) {
    console.error(`❌ Could not determine changed files: ${e.message}`);
    process.exit(1);
  }

  console.log("─── File path check ───────────────────────────────────────");
  console.log(`Changed files in this PR (${changedFiles.length}):`);
  changedFiles.forEach(f => console.log(`  ${f}`));
  console.log("");

  // Only domains/NAME.json is allowed — no subdirectories, no other extensions
  const illegal = changedFiles.filter(f => !/^domains\/[^/]+\.json$/.test(f));

  if (illegal.length > 0) {
    console.error("❌ This PR modifies files outside domains/*.json:\n");
    illegal.forEach(f => console.error(`   🚫  ${f}`));
    console.error("\nOnly files matching  domains/NAME.json  are allowed in pull requests.");
    console.error("Scripts, workflows, docs, and root files are maintained by the repo owners.");
    process.exit(1);
  }

  console.log(`✅ All changed files are inside domains/ — path check passed\n`);
}

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

# Complete Setup Guide
### How to launch your own free subdomain service from scratch

---

## What you'll build

```
User forks GitHub repo
  → creates domains/their-name.json
    → opens a Pull Request
      → GitHub Actions validates automatically
        → You merge the PR
          → GitHub Actions calls Cloudflare API
            → Subdomain is live within minutes ✅
```

**Total running cost:** ~$5–15/year (the domain name only — everything else is free)

---

## Prerequisites

| What you need | Where to get it |
|---|---|
| A domain name | Any registrar (Namecheap, Porkbun, etc.) |
| A Cloudflare account | cloudflare.com (free plan) |
| A GitHub account | github.com (free plan) |

---

---

# PART 1 — Cloudflare Setup

---

## Step 1 — Create a free Cloudflare account

1. Go to **https://cloudflare.com** and click **Sign Up**
2. Enter your email and a strong password
3. Choose the **Free plan** (it covers everything you need)

---

## Step 2 — Add your domain to Cloudflare

1. In the Cloudflare dashboard, click **"Add a site"**

   ![Add site button is in the top-right area of the dashboard]

2. Type your domain (e.g. `your-service.com`) → click **"Add site"**

3. Select the **Free** plan → click **Continue**

4. Cloudflare will scan your existing DNS records. Click **Continue** when done.

5. Cloudflare gives you **two nameserver addresses**, for example:
   ```
   aria.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
   **Copy these — you'll need them in the next step.**

---

## Step 3 — Point your domain to Cloudflare nameservers

You need to update the nameservers at whoever sold you the domain.

### Namecheap
1. Log in → **Domain List** → click **Manage** next to your domain
2. Under **Nameservers**, select **Custom DNS**
3. Paste the two Cloudflare nameservers → click the green checkmark
4. Wait 5–30 minutes

### Porkbun
1. Log in → **Domain Management** → click your domain
2. Scroll to **Authoritative Nameservers** → click **Edit**
3. Replace both nameservers with the Cloudflare ones → **Update**
4. Wait 5–30 minutes

### Hetzner
1. Log in → **Domains** → click your domain → **Nameserver**
2. Replace the entries with the two Cloudflare nameservers → **Save**

### Any other registrar
Look for: **DNS Settings → Custom Nameservers** or **Change Nameservers**.
Replace all existing nameservers with the two Cloudflare provides.

> ✅ **How to confirm it worked:** Go back to Cloudflare dashboard.
> Your domain will show **"Active"** status (green checkmark).
> This can take up to 24 hours, but usually happens within 30 minutes.

---

## Step 4 — Create a Cloudflare API Token

This token lets GitHub Actions update your DNS records automatically.

1. In Cloudflare, click your **profile picture** (top right) → **"My Profile"**

2. Click the **"API Tokens"** tab

3. Click **"Create Token"**

4. Click **"Use template"** next to **"Edit zone DNS"**

5. Under **Zone Resources**, set:
   - First dropdown: **"Include"**
   - Second dropdown: **"Specific zone"**
   - Third dropdown: **your domain** (e.g. `your-service.com`)

6. Click **"Continue to Summary"** → **"Create Token"**

7. **Copy the token immediately** — it is only shown once!

   Store it somewhere safe (e.g. a password manager). It looks like:
   ```
   abc123XYZ_EXAMPLE_TOKEN_abc123xyz
   ```

---

## Step 5 — Find your Zone ID

1. In Cloudflare, click your domain in the dashboard
2. Scroll down on the right side of the **Overview** page
3. You'll see **"Zone ID"** — it looks like:
   ```
   a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
   ```
4. Click **"Click to copy"** and save it

---

## Step 6 — Configure your DNS (optional root record)

If you want `your-service.com` itself to show a website (e.g. a landing page):

1. In Cloudflare, click your domain → **DNS** → **Records**
2. Click **"Add record"**
3. Set:
   - Type: `A`
   - Name: `@`  (this means the root domain)
   - IPv4: your server IP (or use `192.0.2.1` as a placeholder)
   - Proxy status: **Proxied** (orange cloud)
4. Click **Save**

You can also add a `www` record as `CNAME → your-service.com`.

---

---

# PART 2 — GitHub Setup

---

## Step 7 — Create a GitHub organization (recommended)

Using an organization (e.g. `your-service`) makes it look more professional and lets
you add co-maintainers later.

1. GitHub → your profile picture → **"Your organizations"** → **"New organization"**
2. Choose **"Free"** plan
3. Name it something matching your domain (e.g. `your-service`)

*You can skip this and use your personal account if you prefer.*

---

## Step 8 — Create the repository

1. On GitHub, click **"New repository"** (or go to github.com/new)
2. Owner: your organization (or personal account)
3. Repository name: **`register`**
4. Visibility: **Public** ← required so GitHub Actions run for free and users can fork it
5. Initialize with a README: **unchecked** (you have your own)
6. Click **"Create repository"**

---

## Step 9 — Push the project files

In a terminal, inside the `subdomain-service/` folder you downloaded:

```bash
# Initialize git
git init
git add .
git commit -m "Initial setup"

# Connect to your GitHub repo (replace YOUR-ORG with your org/username)
git remote add origin https://github.com/YOUR-ORG/register.git
git branch -M main
git push -u origin main
```

---

## Step 10 — Add Secrets to GitHub

GitHub Actions needs your Cloudflare credentials to deploy DNS.

1. Go to your repository on GitHub
2. Click **Settings** (top tab bar)
3. In the left sidebar: **Secrets and variables** → **Actions**
4. Click **"New repository secret"** for each of these:

### Secret 1: CF_API_TOKEN
- Name: `CF_API_TOKEN`
- Value: *(paste the API token from Step 4)*
- Click **"Add secret"**

### Secret 2: CF_ZONE_ID
- Name: `CF_ZONE_ID`
- Value: *(paste the Zone ID from Step 5)*
- Click **"Add secret"**

---

## Step 11 — Add Repository Variable

Variables are like secrets but not sensitive — they appear in workflow logs.

1. Still in **Settings → Secrets and variables → Actions**
2. Click the **"Variables"** tab
3. Click **"New repository variable"**

### Variable: BASE_DOMAIN
- Name: `BASE_DOMAIN`
- Value: `your-service.com` *(your actual domain)*
- Click **"Add variable"**

---

## Step 12 — Protect the main branch

This prevents anyone from pushing directly to `main` (only PRs allowed).

1. Repository → **Settings** → **Branches** → **"Add branch ruleset"** (or "Add rule")
2. Branch name pattern: `main`
3. Enable these options:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
     - Search for and add: `Validate JSON`  *(the job name from validate.yml)*
   - ✅ **Restrict who can push to matching branches**
     - Add yourself (and any co-maintainers)
4. Click **"Create"**

---

## Step 13 — Test the full pipeline

### Test validation locally

```bash
# In the subdomain-service/ folder
node scripts/validate.js
# Should print: "No domain files found (skipping example.json)."
```

### Test the deploy script locally

```bash
export CF_API_TOKEN="your-token-here"
export CF_ZONE_ID="your-zone-id-here"
export BASE_DOMAIN="your-service.com"

node scripts/deploy.js
# Should print: "Processing 0 domain file(s)" since only example.json is skipped
```

### Test the full GitHub Actions pipeline

1. Create a test branch: `git checkout -b test/first-domain`
2. Create `domains/hello.json`:
   ```json
   {
     "owner": { "username": "your-github-username" },
     "record": { "A": ["192.0.2.1"] }
   }
   ```
3. Commit and push:
   ```bash
   git add domains/hello.json
   git commit -m "test: add hello subdomain"
   git push origin test/first-domain
   ```
4. Open a PR on GitHub → watch **Actions** tab → the **Validate** workflow should turn green ✅
5. Merge the PR → watch **Actions** tab → the **Deploy** workflow should turn green ✅
6. Check your Cloudflare dashboard → DNS → you should see `hello.your-service.com` with an A record

---

---

# PART 3 — Ongoing Operations

---

## How to review and merge PRs

1. Go to your repo → **Pull requests**
2. Click a PR → scroll down to see the GitHub Actions check result
3. Click **"Files changed"** to see the JSON file they added
4. Check:
   - Does the subdomain name make sense?
   - Does it point to something real (not a placeholder IP)?
   - Is the `owner.username` their actual GitHub username?
5. If everything looks good → click **"Merge pull request"** ✅
6. If something is wrong → leave a comment explaining what to fix

---

## How to remove a subdomain

Option A — User opens a PR that deletes their `domains/name.json` file.

Option B — You delete it yourself (for abuse cases):

```bash
git checkout main
git pull
git rm domains/abusive-name.json
git commit -m "remove: abusive-name (ToS violation)"
git push
```

The Deploy workflow will run, but since the file no longer exists, the DNS record
stays unless you also manually delete it from Cloudflare.

**To also remove it from Cloudflare:**
1. Cloudflare dashboard → your domain → DNS → Records
2. Search for `abusive-name.your-service.com`
3. Click the `...` menu → **Delete**

---

## How to add a co-maintainer

1. Repository → **Settings** → **Collaborators and teams**
2. Click **"Add people"** → enter their GitHub username
3. Set role to **Maintainer** or **Write**

---

## How to set up a status page (optional)

Use [Upptime](https://upptime.js.org) — it creates a free status page that monitors
your service automatically via GitHub Actions.

---

## How to add documentation (optional)

1. Create a `docs/` folder with Markdown files
2. Repository → **Settings** → **Pages**
3. Source: **Deploy from a branch** → Branch: `main`, Folder: `/docs`
4. Your docs will be live at `YOUR-ORG.github.io/register`
5. Add a CNAME record in Cloudflare: `docs.your-service.com → YOUR-ORG.github.io`

---

---

# PART 4 — Cloudflare Proxy Explained

---

## What does `"proxied": true` do?

When a user sets `"proxied": true` in their JSON file, traffic to their subdomain
passes through Cloudflare's network instead of going directly to their server.

| Feature | `proxied: false` | `proxied: true` |
|---------|-----------------|----------------|
| DDoS protection | ❌ | ✅ |
| CDN / caching | ❌ | ✅ |
| Hides server IP | ❌ | ✅ |
| SSL automatic | ❌ | ✅ |
| Works with CNAME | ✅ | ✅ |
| Works with MX | ✅ | ❌ (must be false) |
| Works with NS | ✅ | ❌ (must be false) |
| Works with TXT | ✅ | ❌ |

**Recommendation:** Allow `proxied: true` for `A`, `AAAA`, and `CNAME` records only.
The deploy script already enforces this automatically.

---

## SSL Certificates

Cloudflare issues **free SSL certificates** for all subdomains automatically.
Users don't need to do anything — HTTPS just works out of the box.

For this to work correctly, set the **SSL/TLS mode** in Cloudflare:

1. Cloudflare dashboard → your domain → **SSL/TLS**
2. Click **"Overview"**
3. Set encryption mode to **"Full"** (or **"Full (strict)"** if your origin has a valid cert)

---

---

# PART 5 — Checklist Before Going Public

---

```
Setup
  ☐ Domain purchased and pointing to Cloudflare nameservers
  ☐ Cloudflare shows domain as "Active"
  ☐ API token created with "Edit zone DNS" permission
  ☐ Zone ID noted down

GitHub
  ☐ Repository created and set to Public
  ☐ All project files pushed to main branch
  ☐ CF_API_TOKEN secret added
  ☐ CF_ZONE_ID secret added
  ☐ BASE_DOMAIN variable added
  ☐ Branch protection rules enabled for main

Content
  ☐ README.md updated with your domain name and org name
  ☐ CONTRIBUTING.md updated with your domain name
  ☐ TERMS_OF_SERVICE.md reviewed and customized
  ☐ example.json is present in domains/ (as a guide for users)

Testing
  ☐ Validate workflow runs and passes on a test PR
  ☐ Deploy workflow runs and passes after merge
  ☐ Test subdomain appears in Cloudflare DNS records
  ☐ Test subdomain resolves correctly (use: nslookup test.your-service.com)

Launch
  ☐ Delete the test domain file and re-deploy
  ☐ Share on dev.to, Reddit, Hacker News, etc.
  ☐ Submit to https://github.com/ripienaar/free-for-dev (via PR)
```

---

## Useful commands

```bash
# Check DNS propagation from the command line
nslookup hello.your-service.com
dig hello.your-service.com

# Check from a specific DNS resolver (Cloudflare's)
nslookup hello.your-service.com 1.1.1.1

# Verify Cloudflare nameservers are active
nslookup -type=NS your-service.com
```

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| Deploy workflow fails with 403 | API token wrong or expired | Recreate token in Cloudflare → update GitHub secret |
| Deploy workflow fails with "Zone not found" | Wrong Zone ID | Double-check Zone ID in Cloudflare → update GitHub secret |
| Subdomain doesn't resolve after merge | DNS propagation delay | Wait 5 minutes, then `nslookup` again |
| Validate workflow says "only domains/ may be changed" | PR touches other files | Make sure the PR only edits files inside `domains/` |
| Cloudflare shows "orange cloud" but user set proxied: false | Cloudflare might override TTL | Check the record in Cloudflare dashboard; adjust manually if needed |

---

_Good luck with your service! 🚀_

# How to Register Your Subdomain

Follow these steps to claim your free subdomain.

---

## Step 1 — Fork the repository

Click the **Fork** button at the top right of this page to create your own copy.

## Step 2 — Create your domain file

Inside the `domains/` folder, create a file named `YOUR-NAME.json`. ( `YOUR-NAME` = Your new domain name.)

**Rules for the file name:**
- Only lowercase letters (`a–z`), numbers (`0–9`), and hyphens (`-`)
- Must start and end with a letter or number
- Maximum 100 characters

### Minimal example (GitHub Pages)

```json
{
  "owner": {
    "username": "your-github-username"
  },
  "record": {
    "CNAME": "your-github-username.github.io"
  }
}
```

### Point to a server (A record)

```json
{
  "owner": {
    "username": "your-github-username"
  },
  "record": {
    "A": ["1.2.3.4"]
  }
}
```

### Enable Cloudflare proxy (DDoS protection + CDN)

```json
{
  "owner": {
    "username": "your-github-username"
  },
  "record": {
    "A": ["1.2.3.4"]
  },
  "proxied": true
}
```

### Supported record types

| Field | Type | Description |
|-------|------|-------------|
| `A` | `string[]` | IPv4 address(es) |
| `AAAA` | `string[]` | IPv6 address(es) |
| `CNAME` | `string` | Alias (cannot combine with others) |
| `MX` | `string[]` | Mail server(s) |
| `TXT` | `string[]` | Text records, SPF, verification |
| `NS` | `string[]` | Name servers (subdomain delegation) |
| `CAA` | `string[]` | Certificate authority restriction |

## Step 3 — Open a Pull Request

Push your change to your fork and open a Pull Request against the `main` branch of
this repository. Fill in the PR template honestly.

## Step 4 — Wait for review

A maintainer will review your PR. Keep an eye on it — you may be asked to make changes.

## Step 5 — Go live

Once your PR is merged, your subdomain will be live within **1–5 minutes**. 🎉

---

## FAQ

**Is this really free?**
Yes, completely free, forever.

**Can I update my records later?**
Yes — open a new PR that modifies your `domains/YOUR-NAME.json` file.

**Can I delete my subdomain?**
Yes — open a PR that removes your `domains/YOUR-NAME.json` file.

**How many subdomains can I have?**
A maximum of 2 per GitHub account.

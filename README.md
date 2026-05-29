# your-service.com

> Free subdomains for developers — managed via GitHub Pull Requests.

<!-- Replace the badges below with your own repo paths -->
![Domains](https://img.shields.io/github/directory-file-count/YOUR-ORG/register/domains?label=domains&style=for-the-badge&color=5c46eb)
![Pull Requests](https://img.shields.io/github/issues-pr-raw/YOUR-ORG/register?label=open+PRs&style=for-the-badge&color=5c46eb)
![Stars](https://img.shields.io/github/stars/YOUR-ORG/register?style=for-the-badge&color=5c46eb)

---

**your-service.com** lets developers claim a free `.your-service.com` subdomain for
their personal sites, projects, or tools — no sign-up, no dashboard, just a GitHub PR.

## Register a subdomain

1. [**Fork**](../../fork) this repository
2. Create `domains/YOUR-NAME.json` (see [CONTRIBUTING.md](CONTRIBUTING.md))
3. Open a Pull Request
4. Your subdomain goes live within minutes after merge ✅

### Example file

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

→ Full instructions: [CONTRIBUTING.md](CONTRIBUTING.md)
→ Terms of Service: [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md)

---

## Report Abuse

If you find a subdomain violating our ToS, please
[open an issue](../../issues/new?template=report-abuse.md) with evidence.

---

## Powered by

- **Cloudflare** — DNS hosting & proxy
- **GitHub Actions** — automated validation & deployment

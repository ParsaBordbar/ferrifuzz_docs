# ferrifuzz documentation site

Source of the documentation for **[ferrifuzz](https://github.com/ParsaBordbar/ferrifuzz)**, a
fuzzy logic library with a Rust core and a Python package
([PyPI](https://pypi.org/project/ferrifuzz/)). The library code, issues and releases live in
[ParsaBordbar/ferrifuzz](https://github.com/ParsaBordbar/ferrifuzz); this repo holds only the
site, built with [Docusaurus](https://docusaurus.io/) 3.

Read it at **https://parsabordbar.github.io/ferrifuzz_docs/** or
**https://ferrifuzz.bubblelamp.space**.

```bash
npm install
npm start          # dev server with live reload
npm run build      # static site in build/ (fails on broken links)
npm run typecheck
```

- Pages live in `docs/`; the sidebar order is set explicitly in `sidebars.ts`.
- Math uses KaTeX (`$...$`, `$$...$$`).
- Notes for maintainers that must not be shown to readers go in HTML comments.
  `<!-- TODO(0.2.0-api): ... -->` marks claims to re-check against a library release.
- Every page needs a `title` and a specific `description` in its front matter (search results
  and `llms.txt` use them); add `keywords` where they help.

## Build settings and SEO

| Variable | Default | |
|---|---|---|
| `DOCS_URL` | `https://ferrifuzz.bubblelamp.space` | host the build is served from |
| `DOCS_BASE_URL` | `/` | path the build is served under |
| `DOCS_CANONICAL_URL` | `https://parsabordbar.github.io/ferrifuzz_docs/` | the one copy search engines should index |
| `DOCS_NOINDEX` | unset | `1` adds `noindex` to every page (e.g. a preview) |

Both deployments serve the same pages, so every build points `<link rel="canonical">`,
`og:url` and the sitemap at `DOCS_CANONICAL_URL` ([`plugins/canonical-url.ts`](plugins/canonical-url.ts)
rewrites the HTML when building for another host). Each build also contains:

- `sitemap.xml`, `robots.txt` (only read at a host root, i.e. on the VPS);
- `llms.txt` (index of every page, [llmstxt.org](https://llmstxt.org) format) and
  `llms-full.txt` (all docs as one markdown file), generated from `docs/` in sidebar order by
  [`plugins/llms-txt.ts`](plugins/llms-txt.ts);
- JSON-LD structured data and site-wide meta tags (`headTags` and `themeConfig.metadata` in
  `docusaurus.config.ts`).

The social card `static/img/social-card.png` (1200×630) is rendered from
`static/img/social-card.svg`; after editing the SVG, re-export it at that size (e.g. a headless
Chrome screenshot). On each library release, bump `softwareVersion` in the JSON-LD.

## Deploying (GitHub Pages)

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds the site with
`DOCS_URL=https://parsabordbar.github.io DOCS_BASE_URL=/ferrifuzz_docs/` and publishes it on
every push to `main` (or *Actions → Pages → Run workflow*). One-time setup: *Settings → Pages →
Source: GitHub Actions*. This is the canonical copy for search engines. To hide it, set the
repository variable `DOCS_NOINDEX=1` (*Settings → Secrets and variables → Actions → Variables*).

## Deploying (VPS)

The site is static: `npm run build` writes plain HTML/CSS/JS to `build/`, served by nginx from
the root of **https://ferrifuzz.bubblelamp.space**. The repo is cloned on the VPS and a git
hook redeploys on every `git pull`, like bt-mvp.

### One-time setup on the VPS

Needs Node 20+, nginx, certbot and rsync.

1. **DNS (Cloudflare, bubblelamp.space):** `A` record `ferrifuzz` → the VPS IP, proxy status
   **DNS only** while certbot issues the certificate.
2. **Clone and enable the hook:**
   ```sh
   git clone git@github.com:ParsaBordbar/ferrifuzz_docs.git ~/ferrifuzz_docs && cd ~/ferrifuzz_docs
   git config core.hooksPath .githooks && chmod +x .githooks/post-merge
   ```
3. **nginx + HTTPS:** follow the commands at the top of
   [`deploy/nginx/ferrifuzz.bubblelamp.space.conf`](deploy/nginx/ferrifuzz.bubblelamp.space.conf).
4. **First deploy:** `sh deploy/deploy-docs.sh`, then run the `curl` checks from the nginx file.

### Every deploy

Push to the branch the VPS tracks, then on the VPS:

```sh
cd ~/ferrifuzz_docs && git pull
```

`.githooks/post-merge` runs [`deploy/deploy-docs.sh`](deploy/deploy-docs.sh) when site files
changed (`docs/`, `src/`, `static/`, config, `package*.json`): `npm ci`, build, rsync into
`/var/www/ferrifuzz-docs`. Hashed assets from the previous build are kept for a week so open
tabs keep working. Settings go in `deploy/deploy.env` on the VPS (not committed); see the top
of the script.

### Search engines

The VPS is a mirror: its pages are indexable but their canonical URLs point at GitHub Pages
(see [Build settings and SEO](#build-settings-and-seo)), so search engines list only one copy.

Install commands point at PyPI (`pip install ferrifuzz`).

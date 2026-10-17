# ferrifuzz documentation site

Source of the ferrifuzz documentation, built with [Docusaurus](https://docusaurus.io/) 3.

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

While testing, every page has `<meta name="robots" content="noindex">` so search engines skip
the preview. When going public, add `DOCS_PUBLIC=1` to `deploy/deploy.env` on the VPS and run
`sh deploy/deploy-docs.sh`.

Install commands point at TestPyPI (`ferrifuzz==0.2.0`) until the PyPI release; branch
`docs/pypi-launch` switches them to `pip install ferrifuzz`.

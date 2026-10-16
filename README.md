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

## Deploying

The site is static: `npm run build` writes plain HTML/CSS/JS to `build/`, served from the root
of **https://ferrifuzz.bubblelamp.space** (`baseUrl: '/'`).

### GitHub Pages (default)

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds every pull request
(type check + broken-link check) and deploys every push to `main` to GitHub Pages.

One-time setup:

1. **Repository → Settings → Pages:** Source **GitHub Actions**. Custom domain
   `ferrifuzz.bubblelamp.space`, save, then tick **Enforce HTTPS** once the certificate is
   issued (can take up to an hour). Pages on a private repository needs a paid GitHub plan,
   and the published site is public either way.
2. **Cloudflare DNS for bubblelamp.space:** add a `CNAME` record, name `ferrifuzz`, target
   `parsabordbar.github.io`, proxy status **DNS only** (grey cloud) so GitHub can issue the
   HTTPS certificate.
3. **Protect the domain:** GitHub → your profile → Settings → Pages → *Add a domain* →
   `bubblelamp.space`, and add the `TXT` record it shows to Cloudflare. This stops other
   GitHub users from claiming your subdomains.
4. Push to `main` (or *Actions → Docs → Run workflow*). Check https://ferrifuzz.bubblelamp.space.

`static/CNAME` carries the domain too, so the build stays correct if Pages is ever switched
to branch-based deployment.

### Own server (alternative)

1. **Server, once:** create the web root and install the nginx site from
   [`deploy/nginx.conf`](deploy/nginx.conf) (follow the commands at the top of the file,
   including `certbot` for HTTPS):
   ```bash
   sudo mkdir -p /var/www/ferrifuzz-docs && sudo chown "$USER" /var/www/ferrifuzz-docs
   ```
   DNS: an `A` record `ferrifuzz` → the server's IP instead of the GitHub CNAME.
2. **Every deploy, from this folder:**
   ```bash
   DOCS_URL=https://ferrifuzz.bubblelamp.space DEPLOY_TARGET=user@server:/var/www/ferrifuzz-docs deploy/deploy.sh
   ```

### Search engines

While testing, every page has `<meta name="robots" content="noindex">` so search engines skip
the preview. When going public, set the repository variable `DOCS_PUBLIC` to `1`
(*Settings → Secrets and variables → Actions → Variables*) and re-run the workflow, or put
`DOCS_PUBLIC=1` in front of the deploy command when self-hosting.

Install commands point at TestPyPI (`ferrifuzz==0.2.0`) until the PyPI release; branch
`docs/pypi-launch` switches them to `pip install ferrifuzz`.

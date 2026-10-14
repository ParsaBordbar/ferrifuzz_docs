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

## Deploying to your own server

The site is static: `npm run build` writes plain HTML/CSS/JS to `build/`, served from the root
of its own domain (`baseUrl: '/'`).

1. **Server, once:** create the web root and install the nginx site from
   [`deploy/nginx.conf`](deploy/nginx.conf) (replace `docs.example.com`, then follow the
   commands at the top of the file, including `certbot` for HTTPS):
   ```bash
   sudo mkdir -p /var/www/ferrifuzz-docs && sudo chown "$USER" /var/www/ferrifuzz-docs
   ```
2. **Every deploy, from this folder:**
   ```bash
   DOCS_URL=https://docs.example.com DEPLOY_TARGET=user@server:/var/www/ferrifuzz-docs deploy/deploy.sh
   ```
   `DOCS_URL` must match the domain in the nginx config (it goes into canonical links and
   the sitemap).
3. **Check:** open the site, click through a few pages, and load a missing URL to see the 404
   page.

While testing, every page has `<meta name="robots" content="noindex">` so search engines skip
the preview. When going public, deploy with `DOCS_PUBLIC=1` in front of the command.
Install commands point at TestPyPI (`ferrifuzz==0.2.0`) until the PyPI release; search for
`test.pypi` in `docs/` and `src/components/InstallCommand` to switch them.

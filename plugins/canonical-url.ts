import fs from 'node:fs/promises';
import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';

// Both deployments serve the same build, but search engines should index only one copy.
// Docusaurus derives canonical and og:url from url + baseUrl, so when the build is for
// another host (the VPS) this rewrites them in the generated HTML to point at
// `canonicalUrl`. The sitemap is handled by `createSitemapItems` in the config.

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  const nested = await Promise.all(
    entries.map((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return htmlFiles(p);
      return e.name.endsWith('.html') ? [p] : [];
    }),
  );
  return nested.flat();
}

export default function canonicalUrlPlugin(
  context: LoadContext,
  options: {canonicalUrl: string},
): Plugin {
  const {url, baseUrl} = context.siteConfig;
  const from = url + baseUrl;
  const to = options.canonicalUrl;

  return {
    name: 'canonical-url',
    async postBuild({outDir}) {
      if (from === to) {
        return;
      }
      const prefix = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tags = new RegExp(
        `(<link[^>]*rel="(?:canonical|alternate)"[^>]*href="|<meta[^>]*property="og:url"[^>]*content=")${prefix}`,
        'g',
      );
      for (const file of await htmlFiles(outDir)) {
        const html = await fs.readFile(file, 'utf8');
        const out = html.replace(tags, `$1${to}`);
        if (out !== html) {
          await fs.writeFile(file, out);
        }
      }
    },
  };
}

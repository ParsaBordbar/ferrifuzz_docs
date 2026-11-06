import fs from 'node:fs/promises';
import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import type {LoadedContent} from '@docusaurus/plugin-content-docs';

// Writes llms.txt (https://llmstxt.org: an index of every doc page), llms-full.txt (all docs
// as one markdown file) and index.md next to each page's index.html (read by the "Copy for
// LLM" button, src/theme/DocItem/Content) into the build, in sidebar order, with canonical
// URLs. These only exist in a build, so the button cannot fetch them under `npm start`.

type Options = {
  canonicalUrl: string;
  title: string;
  summary: string;
  details: string;
};

type Doc = {title: string; description: string; url: string; file: string; permalink: string};
type Section = {title: string; docs: Doc[]};

type SidebarItem = {type: string; id?: string; label?: string; items?: SidebarItem[]};

function stripFrontMatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n/, '');
}

// Drops MDX that only means something to the site: imports and the <CheatSheets /> gallery.
function stripMdx(md: string): string {
  let inFence = false;
  return md
    .split('\n')
    .filter((line) => {
      if (line.trimStart().startsWith('```')) {
        inFence = !inFence;
        return true;
      }
      return inFence || !(line.startsWith('import ') || line.trim() === '<CheatSheets />');
    })
    .join('\n');
}

export default function llmsTxtPlugin(context: LoadContext, options: Options): Plugin {
  const {siteDir, siteConfig} = context;
  let sections: Section[] = [];

  const toUrl = (permalink: string) => {
    const url = options.canonicalUrl + permalink.slice(siteConfig.baseUrl.length);
    return siteConfig.trailingSlash && !url.endsWith('/') ? `${url}/` : url;
  };

  return {
    name: 'llms-txt',

    async allContentLoaded({allContent}) {
      const docsContent = allContent['docusaurus-plugin-content-docs']?.default as
        | LoadedContent
        | undefined;
      const version = docsContent?.loadedVersions[0];
      if (!version) {
        return;
      }
      const byId = new Map(version.docs.map((d) => [d.id, d]));
      const toDoc = (id: string): Doc => {
        const d = byId.get(id)!;
        return {
          title: d.title,
          description: d.description,
          url: toUrl(d.permalink),
          file: path.join(siteDir, d.source.replace(/^@site\//, '')),
          permalink: d.permalink,
        };
      };

      // Top-level pages go under "Docs"; every sidebar category becomes its own section.
      const top: Section = {title: 'Docs', docs: []};
      const categories: Section[] = [];
      const collect = (items: SidebarItem[], into: Section) => {
        for (const item of items) {
          if (item.type === 'doc' && item.id) {
            into.docs.push(toDoc(item.id));
          } else if (item.type === 'category' && item.items) {
            const section: Section = {title: item.label ?? '', docs: []};
            categories.push(section);
            collect(item.items, section);
          }
        }
      };
      for (const sidebar of Object.values(version.sidebars)) {
        collect(sidebar as SidebarItem[], top);
      }
      sections = [top, ...categories].filter((s) => s.docs.length > 0);
    },

    async postBuild({outDir}) {
      const docs = sections.flatMap((s) => s.docs);
      const urlByFile = new Map(docs.map((d) => [d.file, d.url]));

      const index = [
        `# ${options.title}`,
        '',
        `> ${options.summary}`,
        '',
        options.details,
        '',
        ...sections.flatMap((s) => [
          `## ${s.title}`,
          '',
          ...s.docs.map((d) => `- [${d.title}](${d.url}): ${d.description}`),
          '',
        ]),
        '## Optional',
        '',
        `- [Full documentation](${options.canonicalUrl}llms-full.txt): every page above in one markdown file`,
        '',
      ].join('\n');

      const pages = await Promise.all(
        docs.map(async (d) => {
          let md = stripMdx(stripFrontMatter(await fs.readFile(d.file, 'utf8')));
          md = md.replace(/<!--[\s\S]*?-->\n?/g, '');
          // Relative .md links and /img/ paths become absolute canonical URLs.
          md = md.replace(/\]\((\.{1,2}\/[^)\s#]+\.mdx?)(#[^)\s]*)?\)/g, (m, rel, hash = '') => {
            const target = urlByFile.get(path.resolve(path.dirname(d.file), rel));
            return target ? `](${target}${hash})` : m;
          });
          md = md.replace(/\]\(\/img\//g, `](${options.canonicalUrl}img/`);
          md = md.replace(/\]\(pathname:\/\/\//g, `](${options.canonicalUrl}`);
          md = md.trim();
          if (!md.startsWith('# ')) {
            md = `# ${d.title}\n\n${md}`;
          }
          return md.replace(/^(# .*)$/m, `$1\n\nSource: ${d.url}`);
        }),
      );
      const full = [
        `# ${options.title} documentation (full text)`,
        '',
        `> ${options.summary}`,
        '',
        ...pages.map((p) => `${p}\n`),
      ].join('\n');

      await fs.writeFile(path.join(outDir, 'llms.txt'), index);
      await fs.writeFile(path.join(outDir, 'llms-full.txt'), full);
      await Promise.all(
        docs.map((d, i) =>
          fs.writeFile(
            path.join(outDir, d.permalink.slice(siteConfig.baseUrl.length), 'index.md'),
            `${pages[i]}\n`,
          ),
        ),
      );
    },
  };
}
